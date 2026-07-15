import axios from "axios";

const fallbackBaseUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3000/api/v1`
    : "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || fallbackBaseUrl,
  withCredentials: true,
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const url = original?.url || "";
    const canRefresh =
      error.response?.status === 401 &&
      !original?._retry &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/me") &&
      !url.includes("/auth/refresh");

    if (canRefresh) {
      original._retry = true;
      refreshPromise ||= api.post("/auth/refresh").finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return api(original);
    }
    return Promise.reject(error);
  },
);

export function downloadUrl(path) {
  return `${api.defaults.baseURL}${path}`;
}
