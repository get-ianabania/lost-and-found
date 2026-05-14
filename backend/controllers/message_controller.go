package controllers

// ============================================================
// File: backend/controllers/message_controller.go
// Handles in-app messaging between users.
// Messages can be linked to an item (context-aware chat).
// ============================================================

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"plsp-lost-found/config"
	"plsp-lost-found/models"
)

// SendMessage handles POST /api/v1/messages
func SendMessage(c *gin.Context) {
	senderID := c.GetUint("userID")

	var req models.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Cannot message yourself
	if req.ReceiverID == uint(senderID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot send message to yourself"})
		return
	}

	// Verify receiver exists
	var receiver models.User
	if result := config.DB.First(&receiver, req.ReceiverID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Recipient not found"})
		return
	}

	message := models.Message{
		SenderID:   senderID,
		ReceiverID: req.ReceiverID,
		ItemID:     req.ItemID,
		Content:    req.Content,
		IsRead:     false,
	}

	if result := config.DB.Create(&message); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Create an in-app notification for the receiver
	notif := models.Notification{
		UserID:  req.ReceiverID,
		Type:    "in_app",
		Title:   "New Message",
		Message: "You have a new message from " + c.GetString("email"),
	}
	config.DB.Create(&notif)

	// Load sender details for response
	config.DB.Preload("Sender").First(&message, message.MessageID)

	logAudit(senderID, "MESSAGE_SENT", "message", message.MessageID, c.ClientIP())

	c.JSON(http.StatusCreated, message)
}

// GetConversations handles GET /api/v1/messages/conversations
// Returns a list of unique users this user has chatted with
func GetConversations(c *gin.Context) {
	userID := c.GetUint("userID")

	// Get distinct conversation partners with their latest message
	type ConversationSummary struct {
		UserID    uint   `json:"user_id"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
		LastMessage string `json:"last_message"`
		LastTime  string `json:"last_time"`
		UnreadCount int64 `json:"unread_count"`
	}

	// Raw query to get conversation partners
	rows, err := config.DB.Raw(`
		SELECT DISTINCT ON (partner_id)
			partner_id,
			u.name,
			u.avatar_url,
			m.content as last_message,
			m.timestamp as last_time,
			(SELECT COUNT(*) FROM messages
			 WHERE receiver_id = ? AND sender_id = partner_id AND is_read = false) as unread_count
		FROM (
			SELECT
				CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id,
				content,
				timestamp
			FROM messages
			WHERE sender_id = ? OR receiver_id = ?
		) m
		JOIN users u ON u.user_id = partner_id
		ORDER BY partner_id, last_time DESC
	`, userID, userID, userID, userID).Rows()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load conversations"})
		return
	}
	defer rows.Close()

	var conversations []ConversationSummary
	for rows.Next() {
		var conv ConversationSummary
		rows.Scan(&conv.UserID, &conv.Name, &conv.AvatarURL, &conv.LastMessage, &conv.LastTime, &conv.UnreadCount)
		conversations = append(conversations, conv)
	}

	if conversations == nil {
		conversations = []ConversationSummary{}
	}

	c.JSON(http.StatusOK, gin.H{"data": conversations})
}

// GetConversation handles GET /api/v1/messages/:userId
// Returns all messages between the current user and another user
func GetConversation(c *gin.Context) {
	myID := c.GetUint("userID")
	otherID := c.Param("userId")

	var messages []models.Message
	config.DB.
		Preload("Sender").
		Preload("Receiver").
		Where(
			"(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			myID, otherID, otherID, myID,
		).
		Order("timestamp ASC").
		Find(&messages)

	// Mark messages from the other user as read
	config.DB.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND is_read = false", otherID, myID).
		Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"data": messages})
}

// MarkAsRead handles PATCH /api/v1/messages/:id/read
func MarkAsRead(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("userID")

	result := config.DB.Model(&models.Message{}).
		Where("message_id = ? AND receiver_id = ?", id, userID).
		Update("is_read", true)

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

// GetUnreadCount handles GET /api/v1/messages/unread-count
func GetUnreadCount(c *gin.Context) {
	userID := c.GetUint("userID")

	var count int64
	config.DB.Model(&models.Message{}).
		Where("receiver_id = ? AND is_read = false", userID).
		Count(&count)

	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}
