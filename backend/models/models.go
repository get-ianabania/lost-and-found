package models

// ============================================================
// File: backend/models/models.go
// These Go structs mirror your PostgreSQL tables.
// GORM uses these structs to read/write database rows.
// The `gorm:"..."` tags tell GORM about column names, keys, etc.
// The `json:"..."` tags control what the API sends back to the frontend.
// ============================================================

import (
	"time"
)

// ──────────────────────────────────────────────────────────
// USER MODEL
// ──────────────────────────────────────────────────────────
type User struct {
	UserID       uint      `gorm:"primaryKey;autoIncrement"    json:"user_id"`
	Name         string    `gorm:"size:100;not null"           json:"name"`
	Email        string    `gorm:"size:100;uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"size:255;not null"           json:"-"` // "-" = never sent to frontend
	Role         string    `gorm:"type:user_role;default:'student'" json:"role"`
	StudentID    string    `gorm:"size:50"                     json:"student_id"`
	Department   string    `gorm:"size:100"                    json:"department"`
	Phone        string    `gorm:"size:20"                     json:"phone"`
	AvatarURL    string    `gorm:"size:255"                    json:"avatar_url"`
	IsActive     bool      `gorm:"default:true"                json:"is_active"`
	CreatedAt    time.Time `                                   json:"created_at"`
	UpdatedAt    time.Time `                                   json:"updated_at"`
}

// UserResponse is what we return from the API (no password)
type UserResponse struct {
	UserID     uint      `json:"user_id"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	Role       string    `json:"role"`
	StudentID  string    `json:"student_id"`
	Department string    `json:"department"`
	Phone      string    `json:"phone"`
	AvatarURL  string    `json:"avatar_url"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
}

// ──────────────────────────────────────────────────────────
// ITEM MODEL
// ──────────────────────────────────────────────────────────
type Item struct {
	ItemID        uint       `gorm:"primaryKey;autoIncrement"     json:"item_id"`
	UserID        uint       `gorm:"not null"                     json:"user_id"`
	Name          string     `gorm:"size:100;not null"            json:"name"`
	Description   string     `gorm:"type:text"                    json:"description"`
	Category      string     `gorm:"size:50"                      json:"category"`
	Status        string     `gorm:"type:item_status;default:'lost'" json:"status"`
	Location      string     `gorm:"size:150"                     json:"location"`
	DateReported  time.Time  `gorm:"type:date;default:now()"      json:"date_reported"`
	DateLostFound *time.Time `gorm:"type:date"                    json:"date_lost_found"`
	IsArchived    bool       `gorm:"default:false"                json:"is_archived"`
	AutoArchiveAt *time.Time `                                    json:"auto_archive_at"`
	CreatedAt     time.Time  `                                    json:"created_at"`
	UpdatedAt     time.Time  `                                    json:"updated_at"`

	// Associations (GORM will load these when Preload is used)
	User   User    `gorm:"foreignKey:UserID"  json:"reporter,omitempty"`
	Photos []Photo `gorm:"foreignKey:ItemID"  json:"photos,omitempty"`
}

// ──────────────────────────────────────────────────────────
// PHOTO MODEL
// ──────────────────────────────────────────────────────────
type Photo struct {
	PhotoID    uint      `gorm:"primaryKey;autoIncrement" json:"photo_id"`
	ItemID     uint      `gorm:"not null"                 json:"item_id"`
	FilePath   string    `gorm:"size:255;not null"        json:"file_path"`
	FileName   string    `gorm:"size:255"                 json:"file_name"`
	UploadedAt time.Time `gorm:"default:now()"            json:"uploaded_at"`
}

// ──────────────────────────────────────────────────────────
// STATUS TRACKER MODEL
// ──────────────────────────────────────────────────────────
type StatusTracker struct {
	StatusID  uint      `gorm:"primaryKey;autoIncrement" json:"status_id"`
	ItemID    uint      `gorm:"not null"                 json:"item_id"`
	OldStatus string    `gorm:"size:50"                  json:"old_status"`
	NewStatus string    `gorm:"size:50;not null"         json:"new_status"`
	ChangedBy *uint     `                                json:"changed_by"`
	Note      string    `gorm:"type:text"                json:"note"`
	UpdatedAt time.Time `gorm:"default:now()"            json:"updated_at"`

	Changer *User `gorm:"foreignKey:ChangedBy" json:"changer,omitempty"`
}

// ──────────────────────────────────────────────────────────
// CLAIM MODEL
// ──────────────────────────────────────────────────────────
type Claim struct {
	ClaimID   uint      `gorm:"primaryKey;autoIncrement"      json:"claim_id"`
	ItemID    uint      `gorm:"not null"                      json:"item_id"`
	UserID    uint      `gorm:"not null"                      json:"user_id"`
	ClaimDate time.Time `gorm:"type:date;default:now()"       json:"claim_date"`
	Status    string    `gorm:"type:claim_status;default:'pending'" json:"status"`
	Note      string    `gorm:"type:text"                     json:"note"`
	CreatedAt time.Time `                                     json:"created_at"`
	UpdatedAt time.Time `                                     json:"updated_at"`

	Item      Item `gorm:"foreignKey:ItemID" json:"item,omitempty"`
	Claimant  User `gorm:"foreignKey:UserID" json:"claimant,omitempty"`
}

// ──────────────────────────────────────────────────────────
// VERIFICATION QUIZ MODEL
// ──────────────────────────────────────────────────────────
type VerificationQuiz struct {
	QuizID    uint      `gorm:"primaryKey;autoIncrement" json:"quiz_id"`
	ItemID    uint      `gorm:"not null"                 json:"item_id"`
	Question  string    `gorm:"size:255;not null"        json:"question"`
	Answer    string    `gorm:"size:255;not null"        json:"-"` // answer hidden from frontend
	CreatedBy *uint     `                                json:"created_by"`
	CreatedAt time.Time `gorm:"default:now()"            json:"created_at"`
}

// QuizForClaimant hides the answer when sent to a claimant
type QuizForClaimant struct {
	QuizID   uint   `json:"quiz_id"`
	Question string `json:"question"`
}

// ──────────────────────────────────────────────────────────
// QUIZ ATTEMPT MODEL
// ──────────────────────────────────────────────────────────
type QuizAttempt struct {
	AttemptID   uint      `gorm:"primaryKey;autoIncrement" json:"attempt_id"`
	QuizID      uint      `gorm:"not null"                 json:"quiz_id"`
	ClaimID     uint      `gorm:"not null"                 json:"claim_id"`
	UserID      uint      `gorm:"not null"                 json:"user_id"`
	AnswerGiven string    `gorm:"size:255;not null"        json:"answer_given"`
	IsCorrect   bool      `                                json:"is_correct"`
	AttemptedAt time.Time `gorm:"default:now()"            json:"attempted_at"`
}

// ──────────────────────────────────────────────────────────
// ADMIN APPROVAL MODEL
// ──────────────────────────────────────────────────────────
type AdminApproval struct {
	ApprovalID   uint      `gorm:"primaryKey;autoIncrement"         json:"approval_id"`
	ClaimID      uint      `gorm:"not null"                         json:"claim_id"`
	AdminID      uint      `gorm:"not null"                         json:"admin_id"`
	Decision     string    `gorm:"type:approval_decision;not null"  json:"decision"`
	DecisionNote string    `gorm:"type:text"                        json:"decision_note"`
	DecisionDate time.Time `gorm:"default:now()"                    json:"decision_date"`

	Claim Claim `gorm:"foreignKey:ClaimID" json:"claim,omitempty"`
	Admin User  `gorm:"foreignKey:AdminID" json:"admin,omitempty"`
}

// ──────────────────────────────────────────────────────────
// MESSAGE MODEL
// ──────────────────────────────────────────────────────────
type Message struct {
	MessageID  uint      `gorm:"primaryKey;autoIncrement" json:"message_id"`
	SenderID   uint      `gorm:"not null"                 json:"sender_id"`
	ReceiverID uint      `gorm:"not null"                 json:"receiver_id"`
	ItemID     *uint     `                                json:"item_id"`
	Content    string    `gorm:"type:text;not null"       json:"content"`
	IsRead     bool      `gorm:"default:false"            json:"is_read"`
	Timestamp  time.Time `gorm:"default:now()"            json:"timestamp"`

	Sender   User  `gorm:"foreignKey:SenderID"   json:"sender,omitempty"`
	Receiver User  `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
	Item     *Item `gorm:"foreignKey:ItemID"     json:"item,omitempty"`
}

// ──────────────────────────────────────────────────────────
// NOTIFICATION MODEL
// ──────────────────────────────────────────────────────────
type Notification struct {
	NotificationID uint      `gorm:"primaryKey;autoIncrement"              json:"notification_id"`
	UserID         uint      `gorm:"not null"                              json:"user_id"`
	Type           string    `gorm:"type:notification_type;default:'in_app'" json:"type"`
	Title          string    `gorm:"size:150"                              json:"title"`
	Message        string    `gorm:"type:text;not null"                    json:"message"`
	IsRead         bool      `gorm:"default:false"                         json:"is_read"`
	SentAt         time.Time `gorm:"default:now()"                         json:"sent_at"`
}

// ──────────────────────────────────────────────────────────
// AUDIT TRAIL MODEL
// ──────────────────────────────────────────────────────────
type AuditTrail struct {
	LogID      uint      `gorm:"primaryKey;autoIncrement" json:"log_id"`
	UserID     *uint     `                                json:"user_id"`
	Action     string    `gorm:"size:255;not null"        json:"action"`
	EntityType string    `gorm:"size:50"                  json:"entity_type"`
	EntityID   *uint     `                                json:"entity_id"`
	IPAddress  string    `gorm:"size:45"                  json:"ip_address"`
	Metadata   string    `gorm:"type:jsonb"               json:"metadata"`
	Timestamp  time.Time `gorm:"default:now()"            json:"timestamp"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// ──────────────────────────────────────────────────────────
// HOTSPOT ANALYTICS MODEL
// ──────────────────────────────────────────────────────────
type HotspotAnalytics struct {
	HotspotID   uint      `gorm:"primaryKey;autoIncrement" json:"hotspot_id"`
	Location    string    `gorm:"size:150;uniqueIndex"     json:"location"`
	ReportCount int       `gorm:"default:0"                json:"report_count"`
	LastUpdated time.Time `gorm:"default:now()"            json:"last_updated"`
}

// ──────────────────────────────────────────────────────────
// CAMPUS MAP MODEL
// ──────────────────────────────────────────────────────────
type CampusMap struct {
	MapID     uint      `gorm:"primaryKey;autoIncrement"    json:"map_id"`
	ItemID    uint      `gorm:"uniqueIndex;not null"        json:"item_id"`
	Latitude  float64   `gorm:"type:decimal(10,7);not null" json:"latitude"`
	Longitude float64   `gorm:"type:decimal(10,7);not null" json:"longitude"`
	Label     string    `gorm:"size:100"                    json:"label"`
	CreatedAt time.Time `gorm:"default:now()"               json:"created_at"`

	Item Item `gorm:"foreignKey:ItemID" json:"item,omitempty"`
}

func (CampusMap) TableName() string        { return "campus_map"        }
func (HotspotAnalytics) TableName() string { return "hotspot_analytics" }
func (StatusTracker) TableName() string    { return "status_tracker"    }
func (VerificationQuiz) TableName() string { return "verification_quiz" }
func (QuizAttempt) TableName() string      { return "quiz_attempts"     }
func (AdminApproval) TableName() string    { return "admin_approvals"   }
func (AuditTrail) TableName() string       { return "audit_trail"       }
// ──────────────────────────────────────────────────────────
// REQUEST/RESPONSE DTOs
// DTOs = Data Transfer Objects, used in API requests
// ──────────────────────────────────────────────────────────

type RegisterRequest struct {
	Name       string `json:"name"        binding:"required"`
	Email      string `json:"email"       binding:"required,email"`
	Password   string `json:"password"    binding:"required,min=8"`
	StudentID  string `json:"student_id"`
	Department string `json:"department"`
	Phone      string `json:"phone"`
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type CreateItemRequest struct {
	Name          string  `json:"name"            binding:"required"`
	Description   string  `json:"description"`
	Category      string  `json:"category"        binding:"required"`
	Status        string  `json:"status"          binding:"required,oneof=lost found"`
	Location      string  `json:"location"        binding:"required"`
	DateLostFound string  `json:"date_lost_found"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
}

type CreateClaimRequest struct {
	ItemID uint   `json:"item_id" binding:"required"`
	Note   string `json:"note"`
}

type SubmitQuizRequest struct {
	Answers []QuizAnswer `json:"answers" binding:"required"`
}

type QuizAnswer struct {
	QuizID      uint   `json:"quiz_id"      binding:"required"`
	AnswerGiven string `json:"answer_given" binding:"required"`
}

type AdminDecisionRequest struct {
	Decision string `json:"decision"      binding:"required,oneof=approved rejected pending_info"`
	Note     string `json:"decision_note"`
}

type SendMessageRequest struct {
	ReceiverID uint   `json:"receiver_id" binding:"required"`
	ItemID     *uint  `json:"item_id"`
	Content    string `json:"content"     binding:"required"`
}

type PaginationQuery struct {
	Page     int    `form:"page"     default:"1"`
	Limit    int    `form:"limit"    default:"10"`
	Search   string `form:"search"`
	Status   string `form:"status"`
	Category string `form:"category"`
	Location string `form:"location"`
}
