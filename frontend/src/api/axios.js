import axios from "axios";

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  "http://localhost:5000/api";

const toSafeBaseUrl = (value) => {
  return (value || "").replace(/\/+$/, "");
};

const API_BASE_URL = toSafeBaseUrl(rawBaseUrl);
const BASE_URL = API_BASE_URL.replace("/api", "");


const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ✅ Response interceptor for global error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);
export { API_BASE_URL, BASE_URL };

export default API;
