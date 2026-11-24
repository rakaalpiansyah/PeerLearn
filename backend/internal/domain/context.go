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
// and host/co-host emails unless the caller is a manager, accepted/attended member, or admin.
func SanitizeGroupForViewer(g *GroupResponse, viewerID *uuid.UUID, viewerRole UserRole) {
	if g == nil {
		return
	}

	isCoHost := false
	if viewerID != nil {
		for _, ch := range g.CoHosts {
			if ch.UserID == *viewerID {
				isCoHost = true
				break
			}
		}
	}

	isPrivileged := viewerRole == RoleAdmin || (viewerID != nil && g.HostID == *viewerID) || isCoHost
	isAccepted := g.UserMembership != nil && (*g.UserMembership == MembershipAccepted || *g.UserMembership == MembershipAttended)

	if !isPrivileged {
		if g.Host != nil {
			g.Host.Email = ""
		}
		for i := range g.CoHosts {
			if g.CoHosts[i].User != nil {
				userCopy := *g.CoHosts[i].User
				userCopy.Email = ""
				g.CoHosts[i].User = &userCopy
			}
		}
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
