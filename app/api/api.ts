import axios from "axios";

const fallbackURL = 'https://hrms-backend-346486007446.asia-south1.run.app';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || fallbackURL,
  timeout: 10000,
  // headers: {
  //   'Content-Type': 'application/json',
  // },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (logout, redirect, etc.)
      console.error('Unauthorized - Redirect to login');
    }
    return Promise.reject(error);
  }
);

export const getOrganizations = () => api.get("/organizations");
export const getProfile = () => api.get("/auth/profile");
export const login = (data: any) => api.post("/auth/login", data);

export default api;