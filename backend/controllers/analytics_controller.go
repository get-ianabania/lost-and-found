package controllers

// ============================================================
// File: backend/controllers/analytics_controller.go
// Provides data for the admin analytics dashboard:
// - Item counts by status
// - Hotspot locations
// - Category breakdown
// - Trend data over time
// ============================================================

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"plsp-lost-found/config"
	"plsp-lost-found/models"
)

// GetAnalyticsSummary handles GET /api/v1/analytics/summary
// Returns overall counts for the dashboard stats cards
func GetAnalyticsSummary(c *gin.Context) {
	type Summary struct {
		TotalItems    int64 `json:"total_items"`
		LostItems     int64 `json:"lost_items"`
		FoundItems    int64 `json:"found_items"`
		ClaimedItems  int64 `json:"claimed_items"`
		ResolvedItems int64 `json:"resolved_items"`
		TotalUsers    int64 `json:"total_users"`
		PendingClaims int64 `json:"pending_claims"`
		TotalClaims   int64 `json:"total_claims"`
	}

	var s Summary

	config.DB.Model(&models.Item{}).Count(&s.TotalItems)
	config.DB.Model(&models.Item{}).Where("status = 'lost'").Count(&s.LostItems)
	config.DB.Model(&models.Item{}).Where("status = 'found'").Count(&s.FoundItems)
	config.DB.Model(&models.Item{}).Where("status = 'claimed'").Count(&s.ClaimedItems)
	config.DB.Model(&models.Item{}).Where("status = 'resolved'").Count(&s.ResolvedItems)
	config.DB.Model(&models.User{}).Where("is_active = true").Count(&s.TotalUsers)
	config.DB.Model(&models.Claim{}).Where("status = 'pending'").Count(&s.PendingClaims)
	config.DB.Model(&models.Claim{}).Count(&s.TotalClaims)

	c.JSON(http.StatusOK, s)
}

// GetHotspots handles GET /api/v1/analytics/hotspots
// Returns locations sorted by number of reports (most active first)
func GetHotspots(c *gin.Context) {
	var hotspots []models.HotspotAnalytics
	config.DB.
		Order("report_count DESC").
		Limit(20).
		Find(&hotspots)

	c.JSON(http.StatusOK, gin.H{"data": hotspots})
}

// GetByCategory handles GET /api/v1/analytics/by-category
// Returns item counts grouped by category (for pie/bar charts)
func GetByCategory(c *gin.Context) {
	type CategoryCount struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}

	var results []CategoryCount
	config.DB.Model(&models.Item{}).
		Select("category, COUNT(*) as count").
		Where("category != '' AND category IS NOT NULL").
		Group("category").
		Order("count DESC").
		Scan(&results)

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// GetTrendData handles GET /api/v1/analytics/trends
// Returns daily report counts for the last 30 days (for line charts)
func GetTrendData(c *gin.Context) {
	type DayCount struct {
		Day   string `json:"day"`
		Lost  int64  `json:"lost"`
		Found int64  `json:"found"`
	}

	var results []DayCount
	config.DB.Raw(`
		SELECT
			TO_CHAR(date_reported, 'YYYY-MM-DD') as day,
			COUNT(CASE WHEN status = 'lost'  THEN 1 END) as lost,
			COUNT(CASE WHEN status = 'found' THEN 1 END) as found
		FROM items
		WHERE date_reported >= NOW() - INTERVAL '30 days'
		GROUP BY day
		ORDER BY day ASC
	`).Scan(&results)

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// GetAuditTrail handles GET /api/v1/admin/audit-trail
func GetAuditTrail(c *gin.Context) {
	page  := 1
	limit := 50

	var logs []models.AuditTrail
	config.DB.
		Preload("User").
		Order("timestamp DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&logs)

	var total int64
	config.DB.Model(&models.AuditTrail{}).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
	})
}
