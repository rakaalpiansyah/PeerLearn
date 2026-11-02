package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	AppEnv      string
	JWTSecret   string
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
		jwtSecret = "peerlearn-secure-jwt-secret-dev-2026"
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		AppEnv:      appEnv,
		JWTSecret:   jwtSecret,
	}
}
