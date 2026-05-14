package controllers

// ============================================================
// File: backend/controllers/item_controller.go
// Handles all item-related API operations:
// - Create lost/found item report
// - Get items (with filters/search/pagination)
// - Update item status
// - Upload photos
// - Delete item
// ============================================================

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"plsp-lost-found/config"
	"plsp-lost-found/models"
)

// GetItems handles GET /api/v1/items
// Supports search, filter by status/category/location, and pagination
func GetItems(c *gin.Context) {
	var query models.PaginationQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default pagination values
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 10
	}
	offset := (query.Page - 1) * query.Limit

	// Build the DB query dynamically based on filters
	db := config.DB.Model(&models.Item{}).
		Preload("User").  // load reporter info
		Preload("Photos") // load photos

	// Search by name or description
	if query.Search != "" {
		db = db.Where("name ILIKE ? OR description ILIKE ?",
			"%"+query.Search+"%", "%"+query.Search+"%")
	}

	// Filter by status (lost, found, claimed, resolved, archived)
	if query.Status != "" {
		db = db.Where("status = ?", query.Status)
	}

	// Filter by category
	if query.Category != "" {
		db = db.Where("category = ?", query.Category)
	}

	// Filter by location (partial match)
	if query.Location != "" {
		db = db.Where("location ILIKE ?", "%"+query.Location+"%")
	}

	// Don't show archived items by default
	db = db.Where("is_archived = false")

	// Count total records (for pagination UI)
	var total int64
	db.Count(&total)

	// Get the paginated results
	var items []models.Item
	result := db.Order("created_at DESC").
		Offset(offset).
		Limit(query.Limit).
		Find(&items)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch items"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
		"meta": gin.H{
			"total":       total,
			"page":        query.Page,
			"limit":       query.Limit,
			"total_pages": (int(total) + query.Limit - 1) / query.Limit,
		},
	})
}

// GetItem handles GET /api/v1/items/:id
func GetItem(c *gin.Context) {
	id := c.Param("id")

	var item models.Item
	result := config.DB.
		Preload("User").
		Preload("Photos").
		First(&item, id)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// CreateItem handles POST /api/v1/items
// Creates a new lost or found item report
func CreateItem(c *gin.Context) {
	var req models.CreateItemRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("userID")

	// Parse optional date
	var dateLostFound *time.Time
	if req.DateLostFound != "" {
		parsed, err := time.Parse("2006-01-02", req.DateLostFound)
		if err == nil {
			dateLostFound = &parsed
		}
	}

	// Auto-archive date: 30 days from now
	autoArchiveAt := time.Now().Add(30 * 24 * time.Hour)

	item := models.Item{
		UserID:        userID,
		Name:          req.Name,
		Description:   req.Description,
		Category:      req.Category,
		Status:        req.Status,
		Location:      req.Location,
		DateReported:  time.Now(),
		DateLostFound: dateLostFound,
		AutoArchiveAt: &autoArchiveAt,
	}

	if result := config.DB.Create(&item); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create item report"})
		return
	}

	// If GPS coordinates provided, save to campus_map
	if req.Latitude != 0 && req.Longitude != 0 {
		mapEntry := models.CampusMap{
			ItemID:    item.ItemID,
			Latitude:  req.Latitude,
			Longitude: req.Longitude,
		}
		config.DB.Create(&mapEntry)
	}

	// Log status creation in status_tracker
	tracker := models.StatusTracker{
		ItemID:    item.ItemID,
		OldStatus: "",
		NewStatus: item.Status,
		ChangedBy: &userID,
		Note:      "Item initially reported",
	}
	config.DB.Create(&tracker)

	logAudit(userID, "ITEM_REPORTED", "item", item.ItemID, c.ClientIP())

	c.JSON(http.StatusCreated, item)
}

// UpdateItemStatus handles PATCH /api/v1/items/:id/status
func UpdateItemStatus(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("userID")

	var req struct {
		Status string `json:"status" binding:"required"`
		Note   string `json:"note"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current item
	var item models.Item
	if result := config.DB.First(&item, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	oldStatus := item.Status

	// Update the status
	if result := config.DB.Model(&item).Update("status", req.Status); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	// Track the status change
	tracker := models.StatusTracker{
		ItemID:    item.ItemID,
		OldStatus: oldStatus,
		NewStatus: req.Status,
		ChangedBy: &userID,
		Note:      req.Note,
	}
	config.DB.Create(&tracker)

	logAudit(userID, "ITEM_STATUS_UPDATED", "item", item.ItemID, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "Status updated", "item": item})
}

// UploadPhotos handles POST /api/v1/items/:id/photos
// Handles multipart form file uploads
func UploadPhotos(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("userID")
	itemIDUint, _ := strconv.ParseUint(id, 10, 64)

	// Verify item exists
	var item models.Item
	if result := config.DB.First(&item, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	// Parse the multipart form (max 32MB total)
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	files := form.File["photos"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No photos provided"})
		return
	}

	var savedPhotos []models.Photo

	for _, file := range files {
		// Validate file type (only images)
		ext := filepath.Ext(file.Filename)
		allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
		if !allowedExts[ext] {
			continue // skip non-image files
		}

		// Generate a unique filename to prevent overwrites
		uniqueName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		savePath := fmt.Sprintf("./uploads/items/%s", uniqueName)
		publicPath := fmt.Sprintf("/uploads/items/%s", uniqueName)

		// Save file to disk
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			continue
		}

		// Save photo record to database
		photo := models.Photo{
			ItemID:   uint(itemIDUint),
			FilePath: publicPath,
			FileName: file.Filename,
		}
		config.DB.Create(&photo)
		savedPhotos = append(savedPhotos, photo)
	}

	logAudit(userID, "PHOTOS_UPLOADED", "item", uint(itemIDUint), c.ClientIP())

	c.JSON(http.StatusOK, gin.H{
		"message": "Photos uploaded successfully",
		"photos":  savedPhotos,
	})
}

// DeleteItem handles DELETE /api/v1/items/:id
func DeleteItem(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("userID")
	role, _ := c.Get("role")

	var item models.Item
	if result := config.DB.First(&item, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	// Only the owner or admin can delete
	if item.UserID != userID && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	config.DB.Delete(&item)
	logAudit(userID, "ITEM_DELETED", "item", item.ItemID, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "Item deleted"})
}

// GetMyItems handles GET /api/v1/items/mine
// Returns items reported by the logged-in user
func GetMyItems(c *gin.Context) {
	userID := c.GetUint("userID")

	var items []models.Item
	config.DB.
		Preload("Photos").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&items)

	c.JSON(http.StatusOK, gin.H{"data": items})
}
