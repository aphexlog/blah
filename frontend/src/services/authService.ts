import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class AuthService {
  private authToken: string | null = null;

  constructor() {
    // Set up axios interceptors
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  clearAuth() {
    this.authToken = null;
  }

  async login(email: string, password: string): Promise<AxiosResponse<ApiResponse<{ user: User; token: string }>>> {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    role?: string;
  }): Promise<AxiosResponse<ApiResponse<{ user: User; token: string }>>> {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
    return response;
  }

  async logout(): Promise<AxiosResponse<ApiResponse>> {
    const response = await axios.post(`${API_BASE_URL}/auth/logout`);
    return response;
  }

  async refreshToken(token: string): Promise<AxiosResponse<ApiResponse<{ token: string }>>> {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      token,
    });
    return response;
  }

  async forgotPassword(email: string): Promise<AxiosResponse<ApiResponse>> {
    const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
      email,
    });
    return response;
  }

  async resetPassword(token: string, password: string): Promise<AxiosResponse<ApiResponse>> {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
      token,
      password,
    });
    return response;
  }

  async getCurrentUser(): Promise<AxiosResponse<ApiResponse<User>>> {
    const response = await axios.get(`${API_BASE_URL}/auth/me`);
    return response;
  }

  async updateProfile(userData: Partial<User>): Promise<AxiosResponse<ApiResponse<User>>> {
    const response = await axios.put(`${API_BASE_URL}/auth/profile`, userData);
    return response;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AxiosResponse<ApiResponse>> {
    const response = await axios.post(`${API_BASE_URL}/auth/change-password`, {
      currentPassword,
      newPassword,
    });
    return response;
  }
}

export const authService = new AuthService();