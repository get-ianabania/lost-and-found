package config

// ============================================================
// File: backend/config/database.go
// This connects your Go server to PostgreSQL using GORM.
// GORM is an ORM (Object-Relational Mapper) — it lets you
// query the database using Go structs instead of raw SQL.
// ============================================================

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database instance
// Other files import this: config.DB.Find(&items)
var DB *gorm.DB

func ConnectDB() {
	// Build the PostgreSQL connection string (DSN = Data Source Name)
	// Format: host=... user=... password=... dbname=... port=... sslmode=...
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Manila",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "plsp_lost_found"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_SSL_MODE", "disable"),
	)

	// Open connection
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info), // logs SQL queries
	})
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}

	// Configure connection pool
	// (how many DB connections to keep open at once)
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("❌ Failed to get DB instance:", err)
	}
	sqlDB.SetMaxIdleConns(10)  // idle connections kept open
	sqlDB.SetMaxOpenConns(100) // max simultaneous connections

	DB = db
	log.Println("✅ Connected to PostgreSQL database")
}

// getEnv reads an environment variable with a fallback default
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
