package controllers

// ============================================================
// File: backend/controllers/auth_controller.go
// Handles user registration and login.
// ============================================================

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"plsp-lost-found/config"
	"plsp-lost-found/middleware"
	"plsp-lost-found/models"
)

// Register handles POST /api/v1/auth/register
// Creates a new user account
func Register(c *gin.Context) {
	var req models.RegisterRequest

	// Bind and validate the JSON body
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email already exists
	var existing models.User
	if result := config.DB.Where("email = ?", req.Email).First(&existing); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}

	// Hash the password using bcrypt (cost=10 is standard)
	// bcrypt is a one-way hash — you can't reverse it to get the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	// Create the user record
	user := models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         "student", // new users are students by default
		StudentID:    req.StudentID,
		Department:   req.Department,
		Phone:        req.Phone,
		IsActive:     true,
	}

	if result := config.DB.Create(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	// Log the action in audit trail
	logAudit(user.UserID, "USER_REGISTERED", "user", user.UserID, c.ClientIP())

	c.JSON(http.StatusCreated, gin.H{
		"message": "Account created successfully",
		"user": models.UserResponse{
			UserID:     user.UserID,
			Name:       user.Name,
			Email:      user.Email,
			Role:       user.Role,
			StudentID:  user.StudentID,
			Department: user.Department,
		},
	})
}

// Login handles POST /api/v1/auth/login
// Validates credentials and returns a JWT token
func Login(c *gin.Context) {
	var req models.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user models.User
	if result := config.DB.Where("email = ? AND is_active = true", req.Email).First(&user); result.Error != nil {
		// Use a generic error to prevent email enumeration attacks
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Compare the provided password against the stored hash
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := generateJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	logAudit(user.UserID, "USER_LOGIN", "user", user.UserID, c.ClientIP())

	c.JSON(http.StatusOK, models.LoginResponse{
		Token: token,
		User: models.UserResponse{
			UserID:     user.UserID,
			Name:       user.Name,
			Email:      user.Email,
			Role:       user.Role,
			StudentID:  user.StudentID,
			Department: user.Department,
			Phone:      user.Phone,
			AvatarURL:  user.AvatarURL,
			IsActive:   user.IsActive,
			CreatedAt:  user.CreatedAt,
		},
	})
}

// GetMe handles GET /api/v1/auth/me
// Returns the currently logged-in user's profile
func GetMe(c *gin.Context) {
	userID := c.GetUint("userID")

	var user models.User
	if result := config.DB.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, models.UserResponse{
		UserID:     user.UserID,
		Name:       user.Name,
		Email:      user.Email,
		Role:       user.Role,
		StudentID:  user.StudentID,
		Department: user.Department,
		Phone:      user.Phone,
		AvatarURL:  user.AvatarURL,
		IsActive:   user.IsActive,
		CreatedAt:  user.CreatedAt,
	})
}

// ──────────────────────────────────────────────────────────
// Helper: Generate a signed JWT token
// ──────────────────────────────────────────────────────────
func generateJWT(user models.User) (string, error) {
	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	expiry := time.Now().Add(24 * time.Hour) // token valid for 24 hours

	claims := &middleware.Claims{
		UserID: user.UserID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiry),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.Email,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ──────────────────────────────────────────────────────────
// Helper: Log to audit trail
// ──────────────────────────────────────────────────────────
func logAudit(userID uint, action, entityType string, entityID uint, ip string) {
	log := models.AuditTrail{
		UserID:     &userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   &entityID,
		IPAddress:  ip,
	}
	config.DB.Create(&log)
}
