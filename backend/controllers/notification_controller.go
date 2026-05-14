package controllers

// ============================================================
// File: backend/controllers/notification_controller.go
// Manages in-app notifications for users.
// ============================================================

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"plsp-lost-found/config"
	"plsp-lost-found/models"
)

// GetNotifications handles GET /api/v1/notifications
func GetNotifications(c *gin.Context) {
	userID := c.GetUint("userID")

	var notifications []models.Notification
	config.DB.
		Where("user_id = ?", userID).
		Order("sent_at DESC").
		Limit(50).
		Find(&notifications)

	// Count unread
	var unreadCount int64
	config.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Count(&unreadCount)

	c.JSON(http.StatusOK, gin.H{
		"data":         notifications,
		"unread_count": unreadCount,
	})
}

// MarkNotifRead handles PATCH /api/v1/notifications/:id/read
func MarkNotifRead(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("userID")

	result := config.DB.Model(&models.Notification{}).
		Where("notification_id = ? AND user_id = ?", id, userID).
		Update("is_read", true)

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

// MarkAllNotifsRead handles PATCH /api/v1/notifications/read-all
func MarkAllNotifsRead(c *gin.Context) {
	userID := c.GetUint("userID")

	config.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

// CreateNotification is an internal helper (not a route)
// Other controllers call this to send notifications
func CreateNotification(userID uint, notifType, title, message string) {
	notif := models.Notification{
		UserID:  userID,
		Type:    notifType,
		Title:   title,
		Message: message,
	}
	config.DB.Create(&notif)
}
