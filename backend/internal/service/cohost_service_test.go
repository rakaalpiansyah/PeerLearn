package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type mockCohostRepo struct {
	records map[string]*domain.StudyGroupCohost
}

func cohostKey(groupID, userID uuid.UUID) string { return groupID.String() + ":" + userID.String() }

func (m *mockCohostRepo) Invite(ctx context.Context, c *domain.StudyGroupCohost) error {
	m.records[cohostKey(c.GroupID, c.UserID)] = c
	return nil
}
func (m *mockCohostRepo) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.StudyGroupCohost, error) {
	out := []domain.StudyGroupCohost{}
	for _, r := range m.records {
		if r.GroupID == groupID && (r.Status == domain.CohostInvited || r.Status == domain.CohostAccepted) {
			out = append(out, *r)
		}
	}
	return out, nil
}
func (m *mockCohostRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.StudyGroupCohost, error) {
	out := []domain.StudyGroupCohost{}
	for _, r := range m.records {
		if r.UserID == userID {
			out = append(out, *r)
		}
	}
	return out, nil
}
func (m *mockCohostRepo) Find(ctx context.Context, groupID, userID uuid.UUID) (*domain.StudyGroupCohost, error) {
	if r, ok := m.records[cohostKey(groupID, userID)]; ok {
		return r, nil
	}
	return nil, repository.ErrCohostNotFound
}
func (m *mockCohostRepo) UpdateStatus(ctx context.Context, groupID, userID uuid.UUID, status domain.CohostStatus) error {
	if r, ok := m.records[cohostKey(groupID, userID)]; ok {
		r.Status = status
		return nil
	}
	return repository.ErrCohostNotFound
}
func (m *mockCohostRepo) Remove(ctx context.Context, groupID, userID uuid.UUID) error {
	delete(m.records, cohostKey(groupID, userID))
	return nil
}
func (m *mockCohostRepo) CountActiveOrInvited(ctx context.Context, groupID uuid.UUID) (int, error) {
	count := 0
	for _, r := range m.records {
		if r.GroupID == groupID && (r.Status == domain.CohostInvited || r.Status == domain.CohostAccepted) {
			count++
		}
	}
	return count, nil
}
func (m *mockCohostRepo) IsAcceptedCohost(ctx context.Context, groupID, userID uuid.UUID) (bool, error) {
	r, ok := m.records[cohostKey(groupID, userID)]
	return ok && r.Status == domain.CohostAccepted, nil
}
func (m *mockCohostRepo) ListAcceptedUserIDs(ctx context.Context, groupID uuid.UUID) ([]uuid.UUID, error) {
	out := []uuid.UUID{}
	for _, r := range m.records {
		if r.GroupID == groupID && r.Status == domain.CohostAccepted {
			out = append(out, r.UserID)
		}
	}
	return out, nil
}

type mockCohostGroupRepo struct {
	repository.GroupRepository
	groups map[uuid.UUID]*domain.GroupResponse
}

func (m *mockCohostGroupRepo) FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupResponse, error) {
	if g, ok := m.groups[id]; ok {
		return g, nil
	}
	return nil, repository.ErrGroupNotFound
}

func TestCohostService_InviteRespondAndRemove(t *testing.T) {
	hostID := uuid.New()
	cohostID := uuid.New()
	otherID := uuid.New()
	groupID := uuid.New()

	cohostRepo := &mockCohostRepo{records: map[string]*domain.StudyGroupCohost{}}
	groupRepo := &mockCohostGroupRepo{
		groups: map[uuid.UUID]*domain.GroupResponse{
			groupID: {ID: groupID, HostID: hostID, Title: "Basis Data"},
		},
	}
	userRepo := &mockResetUserRepo{
		users: map[string]*domain.User{
			"fajar@uinsgd.ac.id": {ID: cohostID, Email: "fajar@uinsgd.ac.id", FullName: "Fajar", AccountStatus: domain.AccountActive},
		},
	}

	svc := NewCohostService(cohostRepo, groupRepo, userRepo)

	// Non-host cannot invite
	_, err := svc.InviteByEmail(context.Background(), otherID, groupID, "fajar@uinsgd.ac.id")
	assert.ErrorIs(t, err, ErrUnauthorizedAction)

	// Primary host invites co-tutor
	rec, err := svc.InviteByEmail(context.Background(), hostID, groupID, "fajar@uinsgd.ac.id")
	require.NoError(t, err)
	assert.Equal(t, domain.CohostInvited, rec.Status)

	// Invited user accepts
	err = svc.RespondInvitation(context.Background(), cohostID, groupID, domain.CohostAccepted)
	require.NoError(t, err)

	ok, err := cohostRepo.IsAcceptedCohost(context.Background(), groupID, cohostID)
	require.NoError(t, err)
	assert.True(t, ok)

	// Primary host removes co-tutor
	err = svc.RemoveCohost(context.Background(), hostID, groupID, cohostID)
	require.NoError(t, err)

	list, err := svc.ListByGroup(context.Background(), groupID)
	require.NoError(t, err)
	assert.Empty(t, list)
}