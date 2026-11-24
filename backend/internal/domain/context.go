package domain

import (
	"context"

	"github.com/google/uuid"
)

type viewerRoleContextKey struct{}

// WithViewerRole attaches the authenticated caller role to ctx for downstream privacy checks.
func WithViewerRole(ctx context.Context, role UserRole) context.Context {
	return context.WithValue(ctx, viewerRoleContextKey{}, role)
}

// ViewerRoleFromContext extracts the caller role from ctx when present.
func ViewerRoleFromContext(ctx context.Context) (UserRole, bool) {
	if ctx == nil {
		return "", false
	}
	role, ok := ctx.Value(viewerRoleContextKey{}).(UserRole)
	return role, ok
}

// SanitizeGroupForViewer masks private session links, exact campus room/GPS coordinates,
// and host email unless the caller is the host, an accepted/attended member, or an admin.
func SanitizeGroupForViewer(g *GroupResponse, viewerID *uuid.UUID, viewerRole UserRole) {
	if g == nil {
		return
	}

	isPrivileged := viewerRole == RoleAdmin || (viewerID != nil && g.HostID == *viewerID)
	isAccepted := g.UserMembership != nil && (*g.UserMembership == MembershipAccepted || *g.UserMembership == MembershipAttended)

	if g.Host != nil && !isPrivileged {
		g.Host.Email = ""
	}

	if !isPrivileged && !isAccepted {
		if g.Format == FormatOnline {
			g.LocationOrLink = ""
		} else if g.Format == FormatOffline {
			g.BuildingDetails = ""
			g.Latitude = nil
			g.Longitude = nil
		}
	}
}
