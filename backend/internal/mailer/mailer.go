package mailer

import (
	"context"
	"fmt"
	"net/smtp"
	"strings"
)

type Mailer interface {
	SendPasswordResetOTP(ctx context.Context, toEmail, otpCode string, ttlMinutes int) error
}

type SMTPMailer struct {
	host string
	port string
	user string
	pass string
	from string
}

func NewSMTPMailer(host, port, user, pass, from string) *SMTPMailer {
	return &SMTPMailer{
		host: strings.TrimSpace(host),
		port: strings.TrimSpace(port),
		user: strings.TrimSpace(user),
		pass: strings.TrimSpace(pass),
		from: strings.TrimSpace(from),
	}
}

func (m *SMTPMailer) IsConfigured() bool {
	return m.host != "" && m.user != "" && m.pass != "" && m.from != ""
}

func (m *SMTPMailer) SendPasswordResetOTP(ctx context.Context, toEmail, otpCode string, ttlMinutes int) error {
	if !m.IsConfigured() {
		return nil
	}

	subject := "Kode OTP Reset Kata Sandi PeerLearn"
	body := fmt.Sprintf(
		"Halo,\r\n\r\n"+
			"Berikut adalah kode OTP 6 digit untuk mereset kata sandi akun PeerLearn Anda:\r\n\r\n"+
			"    %s\r\n\r\n"+
			"Kode ini berlaku selama %d menit dan hanya dapat digunakan satu kali.\r\n"+
			"Jika Anda tidak merasa meminta reset kata sandi, silakan abaikan email ini.\r\n\r\n"+
			"Salam,\r\nTim Komunitas PeerLearn",
		otpCode,
		ttlMinutes,
	)

	msg := strings.Join([]string{
		fmt.Sprintf("From: PeerLearn <%s>", m.from),
		fmt.Sprintf("To: %s", toEmail),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=\"UTF-8\"",
		"",
		body,
	}, "\r\n")

	addr := fmt.Sprintf("%s:%s", m.host, m.port)
	auth := smtp.PlainAuth("", m.user, m.pass, m.host)

	if err := smtp.SendMail(addr, auth, m.from, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("smtpMailer.SendPasswordResetOTP: %w", err)
	}
	return nil
}