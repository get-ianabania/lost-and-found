package controllers

// ============================================================
// File: backend/controllers/map_controller.go
// Handles GPS coordinates for the campus map feature.
// Returns all items with coordinates for the Leaflet map.
// ============================================================

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"plsp-lost-found/config"
	"plsp-lost-found/models"
)

// GetMapItems handles GET /api/v1/map
// Returns all items that have GPS coordinates attached
func GetMapItems(c *gin.Context) {
	statusFilter := c.Query("status") // optional: lost, found, all

	type MapItemResponse struct {
		MapID     uint    `json:"map_id"`
		ItemID    uint    `json:"item_id"`
		ItemName  string  `json:"item_name"`
		Category  string  `json:"category"`
		Status    string  `json:"status"`
		Location  string  `json:"location"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		Label     string  `json:"label"`
		PhotoURL  string  `json:"photo_url"`
	}

	db := config.DB.Model(&models.CampusMap{}).
		Preload("Item").
		Preload("Item.Photos")

	if statusFilter != "" && statusFilter != "all" {
		db = db.Joins("JOIN items ON items.item_id = campus_map.item_id").
			Where("items.status = ?", statusFilter)
	}

	var mapEntries []models.CampusMap
	db.Find(&mapEntries)

	// Build clean response
	var results []MapItemResponse
	for _, entry := range mapEntries {
		photoURL := ""
		if len(entry.Item.Photos) > 0 {
			photoURL = entry.Item.Photos[0].FilePath
		}

		results = append(results, MapItemResponse{
			MapID:     entry.MapID,
			ItemID:    entry.ItemID,
			ItemName:  entry.Item.Name,
			Category:  entry.Item.Category,
			Status:    entry.Item.Status,
			Location:  entry.Item.Location,
			Latitude:  entry.Latitude,
			Longitude: entry.Longitude,
			Label:     entry.Label,
			PhotoURL:  photoURL,
		})
	}

	if results == nil {
		results = []MapItemResponse{}
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// SetMapCoordinates handles POST /api/v1/map/items/:id
// Assigns GPS coordinates to an item (creates or updates)
func SetMapCoordinates(c *gin.Context) {
	id     := c.Param("id")
	userID := c.GetUint("userID")

	var req struct {
		Latitude  float64 `json:"latitude"  binding:"required"`
		Longitude float64 `json:"longitude" binding:"required"`
		Label     string  `json:"label"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate lat/lng ranges
	if req.Latitude < -90 || req.Latitude > 90 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Latitude must be between -90 and 90"})
		return
	}
	if req.Longitude < -180 || req.Longitude > 180 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Longitude must be between -180 and 180"})
		return
	}

	// Verify item exists
	var item models.Item
	if result := config.DB.First(&item, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	itemID := parseUint(id)

	// Upsert: update if exists, create if not
	var mapEntry models.CampusMap
	result := config.DB.Where("item_id = ?", itemID).First(&mapEntry)

	if result.Error != nil {
		// Create new entry
		mapEntry = models.CampusMap{
			ItemID:    itemID,
			Latitude:  req.Latitude,
			Longitude: req.Longitude,
			Label:     req.Label,
		}
		config.DB.Create(&mapEntry)
	} else {
		// Update existing
		config.DB.Model(&mapEntry).Updates(models.CampusMap{
			Latitude:  req.Latitude,
			Longitude: req.Longitude,
			Label:     req.Label,
		})
	}

	logAudit(userID, "MAP_COORDINATES_SET", "item", itemID, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{
		"message":   "Coordinates saved",
		"map_entry": mapEntry,
	})
}
