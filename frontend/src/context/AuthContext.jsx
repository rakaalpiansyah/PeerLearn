import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authApi, userApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() =>
    localStorage.getItem("peerlearn_token"),
  );
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const tokenRef = useRef(token);
  const profileRequest = useRef(0);
  const sessionVersion = useRef(0);

  const logout = useCallback(() => {
    sessionVersion.current += 1;
    profileRequest.current += 1;
    tokenRef.current = null;
    localStorage.removeItem("peerlearn_token");
    setToken(null);
    setUser(null);
    setProfileError(null);
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!tokenRef.current) return;
    const requestId = ++profileRequest.current;
    const session = sessionVersion.current;
    setLoading(true);
    try {
      const res = await authApi.getMe();
      if (!res?.success || !res.data?.id) {
        throw new Error("Respons profil tidak dapat digunakan");
      }
      if (
        session !== sessionVersion.current ||
        requestId !== profileRequest.current
      )
        return;
      setUser(res.data);
      setProfileError(null);
      return res.data;
    } catch (error) {
      if (session === sessionVersion.current) {
        // A same-session 401 remains definitive even if a newer profile read has started.
        if (error?.status === 401) logout();
        else if (requestId === profileRequest.current) {
          setProfileError("Profil Anda belum dapat dimuat.");
        }
      }
      throw error;
    } finally {
      if (requestId === profileRequest.current) setLoading(false);
    }
  }, [logout]);

  const retryProfile = useCallback(async () => {
    try {
      return await refreshProfile();
    } catch {
      // The recovery UI consumes profileError; form callers use refreshProfile to receive failures.
      return null;
    }
  }, [refreshProfile]);

  useEffect(() => {
    if (token) retryProfile();
    else setLoading(false);
    return () => {
      sessionVersion.current += 1;
      profileRequest.current += 1;
    };
  }, [token, retryProfile]);

  const adoptSession = (data) => {
    sessionVersion.current += 1;
    profileRequest.current += 1;
    tokenRef.current = data.token;
    localStorage.setItem("peerlearn_token", data.token);
    setToken(data.token);
    setUser(data.user);
    setProfileError(null);
    setLoading(false);
    return data.user;
  };

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success) return adoptSession(res.data);
    throw new Error(res.message || "Login gagal");
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    if (res.success) return adoptSession(res.data);
    throw new Error(res.message || "Registrasi gagal");
  };

  const updateProfile = async (profileData) => {
    const res = await userApi.updateProfile(profileData);
    if (res.success) {
      setUser(res.data);
      return res.data;
    }
    throw new Error(res.message || "Gagal memperbarui profil");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        profileError,
        login,
        register,
        logout,
        updateProfile,
        refreshProfile,
        retryProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
