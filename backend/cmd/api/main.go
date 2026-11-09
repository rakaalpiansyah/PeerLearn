package main

import (
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"

	"peerlearn/backend/internal/config"
	"peerlearn/backend/internal/database"
	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/handler"
	"peerlearn/backend/internal/middleware"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

func main() {
	cfg := config.LoadConfig()

	app := fiber.New(fiber.Config{
		AppName:               "PeerLearn Community API v1",
		DisableStartupMessage: false,
		BodyLimit:             4 * 1024 * 1024,
		ReadTimeout:           10 * time.Second,
		WriteTimeout:          15 * time.Second,
		IdleTimeout:           60 * time.Second,
	})

	app.Use(middleware.SetupCORS(cfg.AllowedOrigins))
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.RequestLogger())

	// Connect to Neon PostgreSQL
	if cfg.DatabaseURL == "" {
		log.Fatal("[Fatal] DATABASE_URL is not configured.")
	}

	db, err := database.ConnectPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[Database] Fatal connection error: %v", err)
	}
	defer db.Close()

	// Execute schema migration
	migrationPath := filepath.Join("internal", "database", "migrations", "000001_init_schema.sql")
	if err := db.RunMigrations(migrationPath); err != nil {
		log.Printf("[Warning] Migration execution note: %v", err)
	}

	// Repositories
	healthRepo := repository.NewHealthRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	skillRepo := repository.NewSkillRepository(db.Pool)
	groupRepo := repository.NewGroupRepository(db.Pool)
	membershipRepo := repository.NewMembershipRepository(db.Pool)
	feedbackRepo := repository.NewFeedbackRepository(db.Pool)
	reportRepo := repository.NewReportRepository(db.Pool)
	messageRepo := repository.NewMessageRepository(db.Pool)

	// Services
	healthService := service.NewHealthService(healthRepo)
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	userService := service.NewUserService(userRepo, skillRepo, groupRepo)
	groupService := service.NewGroupService(groupRepo, userRepo)
	membershipService := service.NewMembershipService(membershipRepo, groupRepo, feedbackRepo, userRepo)
	engagementService := service.NewEngagementService(feedbackRepo, reportRepo, groupRepo, userRepo)
	messageService := service.NewMessageService(messageRepo, groupRepo, membershipRepo)

	// Handlers
	healthHandler := handler.NewHealthHandler(healthService)
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	groupHandler := handler.NewGroupHandler(groupService)
	membershipHandler := handler.NewMembershipHandler(membershipService)
	engagementHandler := handler.NewEngagementHandler(engagementService)
	messageHandler := handler.NewMessageHandler(messageService)

	jwtAuth := middleware.JWTMiddleware(cfg.JWTSecret)

	// Routing
	api := app.Group("/api/v1", middleware.APIRateLimiter())
	api.Get("/health", healthHandler.Check)
	api.Get("/skills", userHandler.GetSkills)
	api.Get("/users/:id/profile", userHandler.GetPublicProfile)
	api.Get("/users/:id/public", userHandler.GetPublicProfile)

	// Auth Endpoints
	auth := api.Group("/auth", middleware.AuthRateLimiter())
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Get("/me", jwtAuth, authHandler.Me)

	// User Profile
	users := api.Group("/users", jwtAuth)
	users.Put("/profile", userHandler.UpdateProfile)
	users.Post("/skills", userHandler.SetSkills)
	users.Post("/skills/custom", userHandler.AddCustomSkill)

	// Public Group Exploration & Smart Recommendations
	api.Get("/groups/recommendations", jwtAuth, groupHandler.GetRecommendations)
	api.Post("/groups/resolve-map-link", jwtAuth, groupHandler.ResolveMapLink)
	api.Get("/groups", groupHandler.List)
	api.Get("/groups/:id", groupHandler.GetByID)
	api.Get("/groups/:id/members", membershipHandler.GetMembers)
	api.Get("/groups/:id/feedbacks", engagementHandler.GetFeedbacks)

	// Protected Group Actions
	protectedGroups := api.Group("/groups", jwtAuth)
	protectedGroups.Post("/", groupHandler.Create)
	protectedGroups.Put("/:id", groupHandler.Update)
	protectedGroups.Patch("/:id/status", groupHandler.UpdateStatus)
	protectedGroups.Post("/:id/join", membershipHandler.Join)
	protectedGroups.Post("/:id/feedback", engagementHandler.CreateFeedback)
	protectedGroups.Get("/:id/messages", messageHandler.GetMessages)
	protectedGroups.Post("/:id/messages", messageHandler.SendMessage)
	protectedGroups.Post("/:id/messages/:messageId/reactions", messageHandler.ToggleReaction)
	protectedGroups.Post("/:id/messages/:messageId/pin", messageHandler.TogglePin)

	// Protected Memberships & Sessions
	api.Patch("/memberships/:id/status", jwtAuth, membershipHandler.UpdateStatus)
	api.Get("/my-sessions", jwtAuth, membershipHandler.GetMySessions)

	// Community Safety & Moderation
	api.Post("/reports", jwtAuth, engagementHandler.CreateReport)
	admin := api.Group("/admin", jwtAuth, middleware.RequireRole(domain.RoleAdmin))
	admin.Get("/reports", engagementHandler.ListReports)
	admin.Get("/moderation/reports", engagementHandler.ListReports)
	admin.Patch("/reports/:id", engagementHandler.ResolveReport)
	admin.Patch("/users/:id/moderation", engagementHandler.ModerateUser)

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[Server] PeerLearn API active on port %s (%s)", cfg.Port, cfg.AppEnv)
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatalf("[Server] HTTP server crash: %v", err)
		}
	}()

	<-quit
	log.Println("[Server] Gracefully shutting down server...")
	if err := app.Shutdown(); err != nil {
		log.Printf("[Server] Error during shutdown: %v", err)
	}
	log.Println("[Server] Server stopped successfully")
}
