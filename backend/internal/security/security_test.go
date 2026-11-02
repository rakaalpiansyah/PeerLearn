package security

import (
	"testing"
)

func TestHashPasswordAndCheck(t *testing.T) {
	password := "password123"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("unexpected error hashing password: %v", err)
	}

	if !CheckPasswordHash(password, hash) {
		t.Fatalf("expected password to match hash %s", hash)
	}

	if CheckPasswordHash("wrongpassword", hash) {
		t.Fatalf("expected wrong password to fail")
	}

	t.Logf("Generated hash for %s: %s", password, hash)
}
