import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error?.response?.status === 401) {
      const refresh = useAuthStore.getState().refreshToken;
      const original = error.config;
      if (refresh && !original._retry) {
        original._retry = true;
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh-token`, {
            refresh_token: refresh,
          });
          useAuthStore.getState().setAccessToken(data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
