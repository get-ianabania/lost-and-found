package main

// ============================================================
// PLSP Lost & Found System - Go Backend
// File: backend/main.go
// This is the entry point of your Go server.
// ============================================================

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"plsp-lost-found/config"
	"plsp-lost-found/middleware"
	"plsp-lost-found/routes"
)

func main() {
	// Load .env file (only in development)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Connect to PostgreSQL database
	config.ConnectDB()

	// Set Gin mode from environment (release = production)
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = gin.DebugMode
	}
	gin.SetMode(ginMode)

	// Create Gin router
	router := gin.New()
	router.Use(gin.Logger())   // logs every request
	router.Use(gin.Recovery()) // recovers from panics

	// ──────────────────────────────────────────
	// CORS Configuration
	// Allows your Next.js frontend (localhost:3000) to call this API
	// ──────────────────────────────────────────
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", os.Getenv("FRONTEND_URL")},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// ──────────────────────────────────────────
	// Static file serving for uploaded images
	// Accessible at: http://localhost:8080/uploads/filename.jpg
	// ──────────────────────────────────────────
	router.Static("/uploads", "./uploads")

	// ──────────────────────────────────────────
	// Health check endpoint
	// ──────────────────────────────────────────
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "PLSP Lost & Found API"})
	})

	// ──────────────────────────────────────────
	// API Routes — all prefixed with /api/v1
	// ──────────────────────────────────────────
	api := router.Group("/api/v1")
	{
		// Public routes (no authentication required)
		routes.AuthRoutes(api)

		// Protected routes (JWT required)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			routes.UserRoutes(protected)
			routes.ItemRoutes(protected)
			routes.ClaimRoutes(protected)
			routes.MessageRoutes(protected)
			routes.NotificationRoutes(protected)
			routes.AnalyticsRoutes(protected)
			routes.MapRoutes(protected)
		}

		// Admin-only routes
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware())
		admin.Use(middleware.AdminOnly())
		{
			routes.AdminRoutes(admin)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("🚀 PLSP Lost & Found API running on port %s", port)
	router.Run(":" + port)
}
