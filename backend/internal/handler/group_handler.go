package handler

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type GroupHandler struct {
	groupService service.GroupService
}

func NewGroupHandler(groupService service.GroupService) *GroupHandler {
	return &GroupHandler{groupService: groupService}
}

func (h *GroupHandler) Create(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	hostID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	var req domain.CreateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	group, err := h.groupService.Create(c.Context(), hostID, req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"INTERNAL_SERVER_ERROR",
			"Gagal membuat sesi belajar",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Pengajuan sesi belajar berhasil dikirim dan menunggu persetujuan Admin!",
		group,
	))
}

func (h *GroupHandler) List(c *fiber.Ctx) error {
	var currentUserID *uuid.UUID
	if userIDVal := c.Locals("userID"); userIDVal != nil {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			currentUserID = &uid
		}
	}

	var ctx context.Context = c.Context()
	if roleVal := c.Locals("role"); roleVal != nil {
		if role, ok := roleVal.(domain.UserRole); ok {
			ctx = domain.WithViewerRole(ctx, role)
		}
	}

	filter := domain.GroupFilter{
		Category: c.Query("category"),
		Format:   domain.GroupFormat(c.Query("format")),
		Status:   domain.GroupStatus(c.Query("status")),
		Search:   c.Query("search"),
	}

	groups, err := h.groupService.List(ctx, filter, currentUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat daftar sesi belajar",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar sesi belajar berhasil diambil",
		groups,
	))
}

func (h *GroupHandler) GetByID(c *fiber.Ctx) error {
	idStr := c.Params("id")
	groupID, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	var currentUserID *uuid.UUID
	if userIDVal := c.Locals("userID"); userIDVal != nil {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			currentUserID = &uid
		}
	}

	var ctx context.Context = c.Context()
	if roleVal := c.Locals("role"); roleVal != nil {
		if role, ok := roleVal.(domain.UserRole); ok {
			ctx = domain.WithViewerRole(ctx, role)
		}
	}

	group, err := h.groupService.GetByID(ctx, groupID, currentUserID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(domain.FailureResponse(
			"GROUP_NOT_FOUND",
			"Sesi belajar tidak ditemukan",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Detail sesi belajar berhasil diambil",
		group,
	))
}

func (h *GroupHandler) Update(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	hostID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	var req domain.UpdateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	if err := h.groupService.Update(c.Context(), hostID, groupID, req); err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
				"FORBIDDEN",
				"Anda bukan penyelenggara sesi belajar ini",
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"UPDATE_FAILED",
			"Gagal memperbarui informasi sesi belajar",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Sesi belajar berhasil diperbarui",
		nil,
	))
}

func (h *GroupHandler) UpdateStatus(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	hostID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	var req struct {
		Status domain.GroupStatus `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	if err := h.groupService.UpdateStatus(c.Context(), hostID, groupID, req.Status); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"STATUS_CHANGE_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Status sesi belajar berhasil diubah",
		nil,
	))
}

func (h *GroupHandler) GetRecommendations(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	groups, err := h.groupService.GetRecommendations(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"INTERNAL_SERVER_ERROR",
			"Gagal mengambil rekomendasi sesi belajar",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Rekomendasi sesi belajar berhasil dimuat",
		groups,
	))
}

func (h *GroupHandler) ResolveMapLink(c *fiber.Ctx) error {
	var req domain.ResolveMapLinkRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			[]domain.ErrorDetail{{Field: "url", Message: err.Error()}},
		))
	}

	result, err := h.groupService.ResolveMapLink(c.Context(), req.URL)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_MAP_LINK",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Titik koordinat berhasil dideteksi",
		result,
	))
}

func (h *GroupHandler) AdminList(c *fiber.Ctx) error {
	filter := domain.GroupFilter{
		Category: c.Query("category"),
		Format:   domain.GroupFormat(c.Query("format")),
		Status:   domain.GroupStatus(c.Query("status")),
		Search:   c.Query("search"),
	}

	groups, err := h.groupService.ListForAdmin(c.Context(), filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat antrean sesi belajar admin",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar pengajuan sesi belajar berhasil diambil",
		groups,
	))
}

func (h *GroupHandler) AdminReview(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	adminID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi admin tidak valid",
			nil,
		))
	}

	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	var req domain.ReviewGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	updated, err := h.groupService.ReviewGroup(c.Context(), adminID, groupID, req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"REVIEW_FAILED",
			err.Error(),
			nil,
		))
	}

	msg := "Sesi belajar disetujui dan kini tayang di katalog mahasiswa"
	if req.Action == "reject" {
		msg = "Pengajuan sesi belajar ditolak dengan catatan perbaikan"
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(msg, updated))
}

func (h *GroupHandler) AddCoHost(c *fiber.Ctx) error {
	callerID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi pengguna tidak valid", nil))
	}
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi belajar tidak valid", nil))
	}
	var req domain.AddCoHostRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("BAD_REQUEST", "Format data Co-Author tidak valid", nil))
	}

	coHosts, err := h.groupService.AddCoHost(c.Context(), callerID, groupID, req.UserID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", "Hanya pembuat sesi utama yang dapat menambah Co-Author", nil))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("ADD_COHOST_FAILED", err.Error(), nil))
	}
	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Co-Author berhasil ditambahkan ke sesi belajar", coHosts))
}

func (h *GroupHandler) RemoveCoHost(c *fiber.Ctx) error {
	callerID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi pengguna tidak valid", nil))
	}
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi belajar tidak valid", nil))
	}
	targetUserID, err := uuid.Parse(c.Params("userId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID pengguna Co-Author tidak valid", nil))
	}

	coHosts, err := h.groupService.RemoveCoHost(c.Context(), callerID, groupID, targetUserID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", "Hanya pembuat sesi utama yang dapat menghapus Co-Author", nil))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("REMOVE_COHOST_FAILED", err.Error(), nil))
	}
	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Co-Author berhasil dihapus dari sesi belajar", coHosts))
}

func (h *GroupHandler) ListMaterials(c *fiber.Ctx) error {
	callerID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi pengguna tidak valid", nil))
	}
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi belajar tidak valid", nil))
	}

	var ctx context.Context = c.Context()
	if role, rOk := c.Locals("role").(domain.UserRole); rOk {
		ctx = domain.WithViewerRole(ctx, role)
	}

	materials, err := h.groupService.ListMaterials(ctx, callerID, groupID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", "Materi sesi hanya tersedia untuk penyelenggara dan peserta terkonfirmasi", nil))
		}
		return c.Status(fiber.StatusNotFound).JSON(domain.FailureResponse("FETCH_MATERIALS_FAILED", err.Error(), nil))
	}
	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Daftar materi sesi berhasil diambil", materials))
}

func (h *GroupHandler) AddMaterial(c *fiber.Ctx) error {
	callerID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi pengguna tidak valid", nil))
	}
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi belajar tidak valid", nil))
	}
	var req domain.CreateMaterialRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("BAD_REQUEST", "Format data materi tidak valid", nil))
	}

	mat, err := h.groupService.AddMaterial(c.Context(), callerID, groupID, req)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", "Hanya tutor atau Co-Author yang dapat menambahkan materi", nil))
		}
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse("VALIDATION_FAILED", err.Error(), nil))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse("ADD_MATERIAL_FAILED", err.Error(), nil))
	}
	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse("Tautan materi sesi berhasil ditambahkan", mat))
}

func (h *GroupHandler) DeleteMaterial(c *fiber.Ctx) error {
	callerID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi pengguna tidak valid", nil))
	}
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi belajar tidak valid", nil))
	}
	materialID, err := uuid.Parse(c.Params("materialId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID materi tidak valid", nil))
	}

	if err := h.groupService.DeleteMaterial(c.Context(), callerID, groupID, materialID); err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", "Hanya tutor atau Co-Author yang dapat menghapus materi", nil))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("DELETE_MATERIAL_FAILED", err.Error(), nil))
	}
	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Materi sesi berhasil dihapus", nil))
}
