import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Bearer token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("peerlearn_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorPayload = error.response?.data?.error || {
      code: "NETWORK_ERROR",
      message: error.message || "Koneksi ke server gagal",
    };
    return Promise.reject({ ...errorPayload, status: error.response?.status });
  },
);

export const systemApi = {
  getHealth: () => apiClient.get("/health"),
};

export const authApi = {
  register: (payload) => apiClient.post("/auth/register", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
  getMe: () => apiClient.get("/auth/me"),
};

export const userApi = {
  updateProfile: (payload) => apiClient.put("/users/profile", payload),
  getSkills: () => apiClient.get("/skills"),
  updateSkills: (skills) => apiClient.post("/users/skills", { skills }),
  addCustomSkill: (payload) => apiClient.post("/users/skills/custom", payload),
  getPublicProfile: (userId) => apiClient.get(`/users/${userId}/public`),
};

export const groupApi = {
  list: (params) => apiClient.get("/groups", { params }),
  getRecommendations: () => apiClient.get("/groups/recommendations"),
  getByID: (id) => apiClient.get(`/groups/${id}`),
  create: (payload) => apiClient.post("/groups", payload),
  update: (id, payload) => apiClient.put(`/groups/${id}`, payload),
  updateStatus: (id, status) =>
    apiClient.patch(`/groups/${id}/status`, { status }),
  getMembers: (id) => apiClient.get(`/groups/${id}/members`),
  getFeedbacks: (id) => apiClient.get(`/groups/${id}/feedbacks`),
  getMessages: (groupId) => apiClient.get(`/groups/${groupId}/messages`),
  sendMessage: (groupId, message, replyToMessageId = null) =>
    apiClient.post(`/groups/${groupId}/messages`, {
      message,
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    }),
  toggleReaction: (groupId, messageId, emoji) =>
    apiClient.post(`/groups/${groupId}/messages/${messageId}/reactions`, { emoji }),
  togglePinMessage: (groupId, messageId) =>
    apiClient.post(`/groups/${groupId}/messages/${messageId}/pin`),
  resolveMapLink: (url) => apiClient.post("/groups/resolve-map-link", { url }),
};

export const membershipApi = {
  join: (groupId) => apiClient.post(`/groups/${groupId}/join`),
  updateStatus: (membershipId, status) =>
    apiClient.patch(`/memberships/${membershipId}/status`, { status }),
  getMySessions: () => apiClient.get("/my-sessions"),
};

export const engagementApi = {
  createFeedback: (groupId, payload) =>
    apiClient.post(`/groups/${groupId}/feedback`, payload),
  createReport: (payload) => apiClient.post("/reports", payload),
  listReports: () => apiClient.get("/admin/reports"),
  resolveReport: (id, status) =>
    apiClient.patch(`/admin/reports/${id}`, { status }),
  listModeration: () => apiClient.get("/admin/moderation/reports"),
  moderateUser: (id, payload) =>
    apiClient.patch(`/admin/users/${id}/moderation`, payload),
};
