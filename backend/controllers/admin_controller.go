package controllers

// ============================================================
// File: backend/controllers/admin_controller.go
// Admin-only operations: manage users, archive items,
// view audit trail, system-wide oversight.
// ============================================================

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"plsp-lost-found/config"
	"plsp-lost-found/models"
)

// AdminGetUsers handles GET /api/v1/admin/users
// Returns all registered users with filters
func AdminGetUsers(c *gin.Context) {
	search := c.Query("search")
	role   := c.Query("role")

	db := config.DB.Model(&models.User{})

	if search != "" {
		db = db.Where("name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if role != "" {
		db = db.Where("role = ?", role)
	}

	var users []models.User
	db.Order("created_at DESC").Find(&users)

	// Convert to safe response (no password hashes)
	var responseUsers []models.UserResponse
	for _, u := range users {
		responseUsers = append(responseUsers, models.UserResponse{
			UserID:     u.UserID,
			Name:       u.Name,
			Email:      u.Email,
			Role:       u.Role,
			StudentID:  u.StudentID,
			Department: u.Department,
			Phone:      u.Phone,
			AvatarURL:  u.AvatarURL,
			IsActive:   u.IsActive,
			CreatedAt:  u.CreatedAt,
		})
	}

	var total int64
	config.DB.Model(&models.User{}).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"data":  responseUsers,
		"total": total,
	})
}

// AdminUpdateUserRole handles PATCH /api/v1/admin/users/:id/role
func AdminUpdateUserRole(c *gin.Context) {
	id      := c.Param("id")
	adminID := c.GetUint("userID")

	var req struct {
		Role string `json:"role" binding:"required,oneof=student staff finder owner admin"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := config.DB.Model(&models.User{}).
		Where("user_id = ?", id).
		Update("role", req.Role)

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	logAudit(adminID, "USER_ROLE_UPDATED", "user", parseUint(id), c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"message": "Role updated to " + req.Role})
}

// AdminToggleUserStatus handles PATCH /api/v1/admin/users/:id/status
// Activate or deactivate a user account
func AdminToggleUserStatus(c *gin.Context) {
	id      := c.Param("id")
	adminID := c.GetUint("userID")

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := config.DB.Model(&models.User{}).
		Where("user_id = ?", id).
		Update("is_active", req.IsActive)

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	action := "USER_DEACTIVATED"
	if req.IsActive {
		action = "USER_ACTIVATED"
	}
	logAudit(adminID, action, "user", parseUint(id), c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "User status updated"})
}

// AdminArchiveItem handles PATCH /api/v1/admin/items/:id/archive
func AdminArchiveItem(c *gin.Context) {
	id      := c.Param("id")
	adminID := c.GetUint("userID")

	result := config.DB.Model(&models.Item{}).
		Where("item_id = ?", id).
		Updates(map[string]interface{}{
			"is_archived": true,
			"status":      "archived",
		})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	// Notify the item reporter
	var item models.Item
	if config.DB.First(&item, id).Error == nil {
		notif := models.Notification{
			UserID:  item.UserID,
			Type:    "in_app",
			Title:   "Item Archived",
			Message: "Your item report '" + item.Name + "' has been archived as it has been unclaimed for 30 days.",
		}
		config.DB.Create(&notif)
	}

	logAudit(adminID, "ITEM_ARCHIVED", "item", parseUint(id), c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"message": "Item archived"})
}

// AdminGetDashboardStats handles GET /api/v1/admin/dashboard-stats
// Returns combined stats for admin home page
func AdminGetDashboardStats(c *gin.Context) {
	type Stats struct {
		TotalItems    int64 `json:"total_items"`
		PendingClaims int64 `json:"pending_claims"`
		ActiveUsers   int64 `json:"active_users"`
		TodayReports  int64 `json:"today_reports"`
	}

	var stats Stats
	config.DB.Model(&models.Item{}).Count(&stats.TotalItems)
	config.DB.Model(&models.Claim{}).Where("status = 'pending'").Count(&stats.PendingClaims)
	config.DB.Model(&models.User{}).Where("is_active = true").Count(&stats.ActiveUsers)
	config.DB.Model(&models.Item{}).Where("DATE(date_reported) = CURRENT_DATE").Count(&stats.TodayReports)

	c.JSON(http.StatusOK, stats)
}

// UpdateProfile handles PUT /api/v1/users/me
func UpdateProfile(c *gin.Context) {
	userID := c.GetUint("userID")

	var req struct {
		Name       string `json:"name"`
		Phone      string `json:"phone"`
		Department string `json:"department"`
		StudentID  string `json:"student_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != ""       { updates["name"] = req.Name }
	if req.Phone != ""      { updates["phone"] = req.Phone }
	if req.Department != "" { updates["department"] = req.Department }
	if req.StudentID != ""  { updates["student_id"] = req.StudentID }

	config.DB.Model(&models.User{}).Where("user_id = ?", userID).Updates(updates)

	var user models.User
	config.DB.First(&user, userID)

	c.JSON(http.StatusOK, models.UserResponse{
		UserID:     user.UserID,
		Name:       user.Name,
		Email:      user.Email,
		Role:       user.Role,
		StudentID:  user.StudentID,
		Department: user.Department,
		Phone:      user.Phone,
		AvatarURL:  user.AvatarURL,
	})
}

// UploadAvatar handles POST /api/v1/users/me/avatar
func UploadAvatar(c *gin.Context) {
	userID := c.GetUint("userID")

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	// Save avatar file
	filename := "avatar_" + string(rune(userID)) + "_" + file.Filename
	savePath  := "./uploads/avatars/" + filename
	publicPath := "/uploads/avatars/" + filename

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save avatar"})
		return
	}

	config.DB.Model(&models.User{}).
		Where("user_id = ?", userID).
		Update("avatar_url", publicPath)

	c.JSON(http.StatusOK, gin.H{"avatar_url": publicPath})
}
