import axios from "axios";

const fallbackURL = 'http://localhost:8080/';

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
export const register = (data: any) => api.post('/users/register', data);
export const login = (data: any) => api.post("/auth/login", data);
export const fetchPosts = () => api.get("/posts");
export const uploadPhoto = (data: any) => api.post("/applicants/upload", data);
export const getApplicant = (id: string) => api.get(`/applicants/${id}`);
export const apply = (data: any) => api.post("/applicants/apply", data);
export const savePersonalDetails = (data: any) => api.post("/save-personal-details", data);
export const saveEducationalDetails = (data: any) => api.post("/save-educational-details", data);
export const saveWorkDetails = (data: any) => api.post("/save-work-details", data);
export const saveDocuments = (data: any) => api.post("/save-documents", data);
export const submitApplication = (data: any) => api.post("/submit-application", data);
export const updatePayment = (data: any) => api.patch("/update-payment-status", data);
export const postsForUser = (data: any) => api.post("/posts/user", data);

export default api;