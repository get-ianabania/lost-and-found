package controllers

// ============================================================
// File: backend/controllers/claim_controller.go
// Handles the claiming workflow:
// 1. User submits a claim for a found item
// 2. User answers verification quiz questions
// 3. Admin reviews and approves/rejects
// ============================================================

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"plsp-lost-found/config"
	"plsp-lost-found/models"
)

// SubmitClaim handles POST /api/v1/claims
func SubmitClaim(c *gin.Context) {
	userID := c.GetUint("userID")
	var req models.CreateClaimRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check item exists and is in 'found' status
	var item models.Item
	if result := config.DB.First(&item, req.ItemID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	if item.Status != "found" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item is not available for claiming"})
		return
	}

	// Prevent duplicate claims from same user
	var existingClaim models.Claim
	if result := config.DB.Where("item_id = ? AND user_id = ? AND status = 'pending'",
		req.ItemID, userID).First(&existingClaim); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "You already have a pending claim for this item"})
		return
	}

	claim := models.Claim{
		ItemID: req.ItemID,
		UserID: userID,
		Status: "pending",
		Note:   req.Note,
	}

	if result := config.DB.Create(&claim); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit claim"})
		return
	}

	// Update item status to 'claimed' (under review)
	config.DB.Model(&item).Update("status", "claimed")

	logAudit(userID, "CLAIM_SUBMITTED", "claim", claim.ClaimID, c.ClientIP())

	// Return the claim and the quiz questions (without answers)
	var quizzes []models.VerificationQuiz
	config.DB.Where("item_id = ?", req.ItemID).Find(&quizzes)

	quizForClaimant := make([]models.QuizForClaimant, len(quizzes))
	for i, q := range quizzes {
		quizForClaimant[i] = models.QuizForClaimant{
			QuizID:   q.QuizID,
			Question: q.Question,
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"claim":      claim,
		"quiz":       quizForClaimant,
		"message":    "Claim submitted. Please answer the verification questions.",
	})
}

// AnswerQuiz handles POST /api/v1/claims/:id/quiz
// User submits answers to verification questions
func AnswerQuiz(c *gin.Context) {
	claimID := c.Param("id")
	userID := c.GetUint("userID")

	var req models.SubmitQuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify the claim belongs to this user
	var claim models.Claim
	if result := config.DB.Where("claim_id = ? AND user_id = ?", claimID, userID).
		First(&claim); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Claim not found"})
		return
	}

	allCorrect := true
	results := []gin.H{}

	for _, ans := range req.Answers {
		// Get the quiz question and correct answer
		var quiz models.VerificationQuiz
		if result := config.DB.First(&quiz, ans.QuizID); result.Error != nil {
			continue
		}

		// Case-insensitive comparison
		isCorrect := strings.EqualFold(
			strings.TrimSpace(ans.AnswerGiven),
			strings.TrimSpace(quiz.Answer),
		)

		if !isCorrect {
			allCorrect = false
		}

		// Record the attempt
		attempt := models.QuizAttempt{
			QuizID:      ans.QuizID,
			ClaimID:     claim.ClaimID,
			UserID:      userID,
			AnswerGiven: ans.AnswerGiven,
			IsCorrect:   isCorrect,
		}
		config.DB.Create(&attempt)

		results = append(results, gin.H{
			"quiz_id":    ans.QuizID,
			"is_correct": isCorrect,
		})
	}

	logAudit(userID, "QUIZ_ATTEMPTED", "claim", claim.ClaimID, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{
		"all_correct": allCorrect,
		"results":     results,
		"message": func() string {
			if allCorrect {
				return "All answers correct! Your claim is now pending admin approval."
			}
			return "Some answers were incorrect. An admin will still review your claim."
		}(),
	})
}

// GetMyClaims handles GET /api/v1/claims/mine
func GetMyClaims(c *gin.Context) {
	userID := c.GetUint("userID")

	var claims []models.Claim
	config.DB.
		Preload("Item").
		Preload("Item.Photos").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&claims)

	c.JSON(http.StatusOK, gin.H{"data": claims})
}

// GetAllClaims handles GET /api/v1/admin/claims (admin only)
func GetAllClaims(c *gin.Context) {
	status := c.Query("status")

	db := config.DB.
		Preload("Item").
		Preload("Item.Photos").
		Preload("Claimant")

	if status != "" {
		db = db.Where("status = ?", status)
	}

	var claims []models.Claim
	db.Order("created_at DESC").Find(&claims)

	c.JSON(http.StatusOK, gin.H{"data": claims})
}

// AdminDecision handles POST /api/v1/admin/claims/:id/decision
// Admin approves or rejects a claim
func AdminDecision(c *gin.Context) {
	claimID := c.Param("id")
	adminID := c.GetUint("userID")

	var req models.AdminDecisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var claim models.Claim
	if result := config.DB.Preload("Item").First(&claim, claimID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Claim not found"})
		return
	}

	// Record admin decision
	approval := models.AdminApproval{
		ClaimID:      claim.ClaimID,
		AdminID:      adminID,
		Decision:     req.Decision,
		DecisionNote: req.Note,
	}
	config.DB.Create(&approval)

	// Update claim status
	config.DB.Model(&claim).Update("status", req.Decision)

	// Update item status based on decision
	if req.Decision == "approved" {
		config.DB.Model(&models.Item{}).
			Where("item_id = ?", claim.ItemID).
			Update("status", "resolved")

		// Notify the claimant
		notif := models.Notification{
			UserID:  claim.UserID,
			Type:    "in_app",
			Title:   "Claim Approved! 🎉",
			Message: "Your claim has been approved. Please visit the Lost & Found office to pick up your item.",
		}
		config.DB.Create(&notif)
	} else if req.Decision == "rejected" {
		// Revert item to 'found' status
		config.DB.Model(&models.Item{}).
			Where("item_id = ?", claim.ItemID).
			Update("status", "found")

		notif := models.Notification{
			UserID:  claim.UserID,
			Type:    "in_app",
			Title:   "Claim Update",
			Message: "Your claim was not approved. Reason: " + req.Note,
		}
		config.DB.Create(&notif)
	}

	logAudit(adminID, "ADMIN_DECISION_"+strings.ToUpper(req.Decision), "claim", claim.ClaimID, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{
		"message":  "Decision recorded",
		"approval": approval,
	})
}

// AddQuizQuestions handles POST /api/v1/items/:id/quiz (admin/staff)
// Sets verification questions for an item
func AddQuizQuestions(c *gin.Context) {
	itemID := c.Param("id")
	userID := c.GetUint("userID")

	var req struct {
		Questions []struct {
			Question string `json:"question" binding:"required"`
			Answer   string `json:"answer"   binding:"required"`
		} `json:"questions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Delete existing quiz questions for this item
	config.DB.Where("item_id = ?", itemID).Delete(&models.VerificationQuiz{})

	var quizzes []models.VerificationQuiz
	for _, q := range req.Questions {
		quiz := models.VerificationQuiz{
			ItemID:    parseUint(itemID),
			Question:  q.Question,
			Answer:    q.Answer,
			CreatedBy: &userID,
		}
		config.DB.Create(&quiz)
		quizzes = append(quizzes, quiz)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Quiz questions saved",
		"count":   len(quizzes),
	})
}

func parseUint(s string) uint {
	var n uint
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + uint(c-'0')
		}
	}
	return n
}
