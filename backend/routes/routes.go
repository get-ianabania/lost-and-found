package routes

// ============================================================
// File: backend/routes/routes.go
// Maps HTTP methods + URL paths to controller functions.
// This is the "routing table" of your API.
// ============================================================

import (
	"github.com/gin-gonic/gin"
	"plsp-lost-found/controllers"
)

// AuthRoutes — public, no JWT needed
func AuthRoutes(r *gin.RouterGroup) {
	auth := r.Group("/auth")
	{
		auth.POST("/register", controllers.Register)
		auth.POST("/login", controllers.Login)
		auth.GET("/me", controllers.GetMe) // requires token but listed here for clarity
	}
}

// UserRoutes — for profile management
func UserRoutes(r *gin.RouterGroup) {
	users := r.Group("/users")
	{
		users.GET("/me", controllers.GetMe)
		users.PUT("/me", controllers.UpdateProfile)
		users.POST("/me/avatar", controllers.UploadAvatar)
	}
}

// ItemRoutes — lost & found item operations
func ItemRoutes(r *gin.RouterGroup) {
	items := r.Group("/items")
	{
		items.GET("", controllers.GetItems)          // GET /api/v1/items?search=&status=&category=
		items.GET("/mine", controllers.GetMyItems)   // GET /api/v1/items/mine
		items.GET("/:id", controllers.GetItem)       // GET /api/v1/items/5
		items.POST("", controllers.CreateItem)       // POST /api/v1/items
		items.PATCH("/:id/status", controllers.UpdateItemStatus)  // PATCH /api/v1/items/5/status
		items.POST("/:id/photos", controllers.UploadPhotos)       // POST /api/v1/items/5/photos
		items.POST("/:id/quiz", controllers.AddQuizQuestions)     // POST /api/v1/items/5/quiz
		items.DELETE("/:id", controllers.DeleteItem) // DELETE /api/v1/items/5
	}
}

// ClaimRoutes — claiming workflow
func ClaimRoutes(r *gin.RouterGroup) {
	claims := r.Group("/claims")
	{
		claims.POST("", controllers.SubmitClaim)                  // POST /api/v1/claims
		claims.GET("/mine", controllers.GetMyClaims)              // GET /api/v1/claims/mine
		claims.POST("/:id/quiz", controllers.AnswerQuiz)          // POST /api/v1/claims/3/quiz
	}
}

// MessageRoutes — in-app messaging
func MessageRoutes(r *gin.RouterGroup) {
	messages := r.Group("/messages")
	{
		messages.POST("",              controllers.SendMessage)
		messages.GET("/conversations", controllers.GetConversations)
		messages.GET("/unread-count",  controllers.GetUnreadCount)
		messages.GET("/:userId",       controllers.GetConversation)
		messages.PATCH("/:id/read",    controllers.MarkAsRead)
	}
}

// NotificationRoutes
func NotificationRoutes(r *gin.RouterGroup) {
	notifs := r.Group("/notifications")
	{
		notifs.GET("", controllers.GetNotifications)              // GET /api/v1/notifications
		notifs.PATCH("/:id/read", controllers.MarkNotifRead)      // PATCH /api/v1/notifications/2/read
		notifs.PATCH("/read-all", controllers.MarkAllNotifsRead)  // PATCH /api/v1/notifications/read-all
	}
}

// AnalyticsRoutes — statistics & hotspots
func AnalyticsRoutes(r *gin.RouterGroup) {
	analytics := r.Group("/analytics")
	{
		analytics.GET("/hotspots",    controllers.GetHotspots)
		analytics.GET("/summary",     controllers.GetAnalyticsSummary)
		analytics.GET("/by-category", controllers.GetByCategory)
		analytics.GET("/trends",      controllers.GetTrendData)
	}
}

// MapRoutes — campus map data
func MapRoutes(r *gin.RouterGroup) {
	mapRoutes := r.Group("/map")
	{
		mapRoutes.GET("", controllers.GetMapItems)                     // GET /api/v1/map
		mapRoutes.POST("/items/:id", controllers.SetMapCoordinates)    // POST /api/v1/map/items/5
	}
}

// AdminRoutes — admin-only routes
func AdminRoutes(r *gin.RouterGroup) {
	// User management
	r.GET("/users", controllers.AdminGetUsers)
	r.PATCH("/users/:id/role", controllers.AdminUpdateUserRole)
	r.PATCH("/users/:id/status", controllers.AdminToggleUserStatus)

	// Item management
	r.GET("/items", controllers.GetItems)
	r.PATCH("/items/:id/archive", controllers.AdminArchiveItem)

	// Claim management
	r.GET("/claims", controllers.GetAllClaims)
	r.POST("/claims/:id/decision", controllers.AdminDecision)

	// Analytics & audit
	r.GET("/audit-trail",     controllers.GetAuditTrail)
	r.GET("/analytics",       controllers.GetAnalyticsSummary)
	r.GET("/dashboard-stats", controllers.AdminGetDashboardStats)
}
