package mailer

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"strings"

	"peerlearn/backend/internal/config"
)

type Mailer interface {
	Send(ctx context.Context, to, subject, body string) error
	IsConfigured() bool
}

type smtpMailer struct {
	host string
	port string
	user string
	pass string
	from string
}

type devLogMailer struct{}

func NewMailer(cfg *config.Config) Mailer {
	if cfg != nil && cfg.SMTPHost != "" && cfg.SMTPFrom != "" {
		return &smtpMailer{
			host: cfg.SMTPHost,
			port: cfg.SMTPPort,
			user: cfg.SMTPUser,
			pass: cfg.SMTPPass,
			from: cfg.SMTPFrom,
		}
	}
	return &devLogMailer{}
}

func (m *smtpMailer) IsConfigured() bool {
	return m.host != "" && m.from != ""
}

func (m *smtpMailer) Send(_ context.Context, to, subject, body string) error {
	addr := m.host + ":" + m.port
	var auth smtp.Auth
	if m.user != "" && m.pass != "" {
		auth = smtp.PlainAuth("", m.user, m.pass, m.host)
	}
	msg := strings.Join([]string{
		fmt.Sprintf("From: %s", m.from),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")
	if err := smtp.SendMail(addr, auth, m.from, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("smtpMailer.Send: %w", err)
	}
	return nil
}

func (m *devLogMailer) IsConfigured() bool {
	return false
}

func (m *devLogMailer) Send(_ context.Context, to, subject, _ string) error {
	// Never log secret token strings in application logs; local dev uses API dev_token fallback cleanly.
	log.Printf("[Mailer:Dev] Queued transactional message for %s (subject: %s)", to, subject)
	return nil
}
