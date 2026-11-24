package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	AppEnv         string
	JWTSecret      string
	AllowedOrigins string
	SMTPHost       string
	SMTPPort       string
	SMTPUser       string
	SMTPPass       string
	SMTPFrom       string
	AppBaseURL     string
}

func LoadConfig() *Config {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env.local")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")

	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "development"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if strings.EqualFold(appEnv, "production") {
			log.Fatal("[Config] JWT_SECRET environment variable is required when APP_ENV=production")
		}
		jwtSecret = "peerlearn-secure-jwt-secret-dev-2026"
	}

	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173,http://localhost:4173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:4173"
	}

	appBaseURL := strings.TrimRight(os.Getenv("APP_BASE_URL"), "/")
	if appBaseURL == "" {
		appBaseURL = "http://localhost:5173"
	}

	smtpPort := os.Getenv("SMTP_PORT")
	if smtpPort == "" {
		smtpPort = "587"
	}

	return &Config{
		Port:           port,
		DatabaseURL:    dbURL,
		AppEnv:         appEnv,
		JWTSecret:      jwtSecret,
		AllowedOrigins: allowedOrigins,
		SMTPHost:       strings.TrimSpace(os.Getenv("SMTP_HOST")),
		SMTPPort:       smtpPort,
		SMTPUser:       strings.TrimSpace(os.Getenv("SMTP_USER")),
		SMTPPass:       os.Getenv("SMTP_PASS"),
		SMTPFrom:       strings.TrimSpace(os.Getenv("SMTP_FROM")),
		AppBaseURL:     appBaseURL,
	}
}
