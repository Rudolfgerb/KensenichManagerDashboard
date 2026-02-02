/**
 * API Service Layer
 * Centralized API calls with TypeScript types, error handling, and environment config
 */

import axios, { AxiosResponse, AxiosError, AxiosInstance } from 'axios';
import type {
  Task,
  WorkSession,
  SOP,
  Contact,
  Communication,
  Goal,
  Project,
  ContentIdea,
  Deal,
  JobApplication,
  MutuusMilestone,
  SessionStats,
  GoalStats,
  ContentStats,
  ProjectStats,
  DashboardStats,
  ChatMessage,
  AIContext,
  CreateTaskDTO,
  UpdateTaskDTO,
  CreateContactDTO,
  CreateGoalDTO,
  CreateProjectDTO,
  StartSessionDTO,
  CompleteSessionDTO,
} from '../types';

// Environment-based API URL with fallback
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast callback for notifications
let toastCallback: ((message: string, type: ToastType, duration?: number) => void) | null = null;

export const setToastCallback = (callback: (message: string, type: ToastType, duration?: number) => void) => {
  toastCallback = callback;
};

const showToast = (message: string, type: ToastType, duration?: number) => {
  if (toastCallback) {
    toastCallback(message, type, duration);
  }
};

// Error message extraction with German translations
const getErrorMessage = (error: AxiosError): string => {
  if (error.response) {
    const data = error.response.data as any;

    switch (error.response.status) {
      case 400:
        return data?.message || data?.error || 'Ungültige Anfrage. Bitte überprüfe deine Eingaben.';
      case 401:
        return 'Nicht autorisiert. Bitte melde dich erneut an.';
      case 403:
        return 'Zugriff verweigert.';
      case 404:
        return data?.message || 'Die angeforderte Ressource wurde nicht gefunden.';
      case 409:
        return data?.message || 'Konflikt: Die Ressource existiert bereits.';
      case 422:
        return data?.message || 'Validierungsfehler. Bitte überprüfe deine Eingaben.';
      case 429:
        return 'Zu viele Anfragen. Bitte warte einen Moment.';
      case 500:
        return data?.message || 'Serverfehler. Bitte versuche es später erneut.';
      default:
        return data?.message || data?.error || `Fehler: ${error.response.status}`;
    }
  } else if (error.request) {
    return 'Keine Verbindung zum Server. Bitte überprüfe deine Internetverbindung.';
  } else {
    return error.message || 'Ein unbekannter Fehler ist aufgetreten.';
  }
};

// Create axios instance with interceptors
const createAPIClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const errorMessage = getErrorMessage(error);

      // Don't show toast for certain status codes or if it's a silent request
      const config = error.config as any;
      if (!config?.silent) {
        showToast(errorMessage, 'error', 5000);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createAPIClient();

// Helper to extract data from response
const getData = <T>(response: AxiosResponse<T>): T => response.data;

// Abort controller management for cleanup
const abortControllers = new Map<string, AbortController>();

export const createAbortController = (key: string): AbortController => {
  // Cancel any existing request with the same key
  const existing = abortControllers.get(key);
  if (existing) {
    existing.abort();
  }

  const controller = new AbortController();
  abortControllers.set(key, controller);
  return controller;
};

export const cancelRequest = (key: string): void => {
  const controller = abortControllers.get(key);
  if (controller) {
    controller.abort();
    abortControllers.delete(key);
  }
};

// Tasks API
export const getTasks = (signal?: AbortSignal) =>
  apiClient.get<Task[]>('/tasks', { signal }).then(getData);
export const getPendingTasks = (signal?: AbortSignal) =>
  apiClient.get<Task[]>('/tasks/pending', { signal }).then(getData);
export const getTask = (id: string, signal?: AbortSignal) =>
  apiClient.get<Task>(`/tasks/${id}`, { signal }).then(getData);
export const createTask = (data: CreateTaskDTO) =>
  apiClient.post<Task>('/tasks', data).then(getData);
export const updateTask = (id: string, data: UpdateTaskDTO) =>
  apiClient.put<Task>(`/tasks/${id}`, data).then(getData);
export const deleteTask = (id: string) =>
  apiClient.delete<{ message: string }>(`/tasks/${id}`).then(getData);

// Sessions API
export const getSessions = (signal?: AbortSignal) =>
  apiClient.get<WorkSession[]>('/sessions', { signal }).then(getData);
export const getSessionStats = (signal?: AbortSignal) =>
  apiClient.get<SessionStats>('/sessions/stats', { signal }).then(getData);
export const getCurrentSession = (signal?: AbortSignal) =>
  apiClient.get<WorkSession | null>('/sessions/current', { signal }).then(getData);
export const startSession = (data: StartSessionDTO) =>
  apiClient.post<WorkSession>('/sessions/start', data).then(getData);
export const completeSession = (id: string, data: CompleteSessionDTO) =>
  apiClient.post<WorkSession>(`/sessions/${id}/complete`, data).then(getData);
export const stopSession = (id: string) =>
  apiClient.post<WorkSession>(`/sessions/${id}/stop`).then(getData);

// SOPs API
export const getSOPs = (signal?: AbortSignal) =>
  apiClient.get<SOP[]>('/sops', { signal }).then(getData);
export const createSOP = (data: Partial<SOP>) =>
  apiClient.post<SOP>('/sops', data).then(getData);

// CRM API
export const getContacts = (signal?: AbortSignal) =>
  apiClient.get<Contact[]>('/crm/contacts', { signal }).then(getData);
export const getContact = (id: string, signal?: AbortSignal) =>
  apiClient.get<Contact>(`/crm/contacts/${id}`, { signal }).then(getData);
export const createContact = (data: CreateContactDTO) =>
  apiClient.post<Contact>('/crm/contacts', data).then(getData);
export const updateContact = (id: string, data: Partial<CreateContactDTO>) =>
  apiClient.put<Contact>(`/crm/contacts/${id}`, data).then(getData);
export const deleteContact = (id: string) =>
  apiClient.delete<{ message: string }>(`/crm/contacts/${id}`).then(getData);
export const addCommunication = (contactId: string, data: Partial<Communication>) =>
  apiClient.post<Communication>(`/crm/contacts/${contactId}/communication`, data).then(getData);
export const getOverdueFollowups = (signal?: AbortSignal) =>
  apiClient.get<Contact[]>('/crm/followups', { signal }).then(getData);

// Goals API
export const getGoals = (status?: string, signal?: AbortSignal) => {
  const params = status ? { status } : undefined;
  return apiClient.get<Goal[]>('/goals', { params, signal }).then(getData);
};
export const getGoal = (id: string, signal?: AbortSignal) =>
  apiClient.get<Goal>(`/goals/${id}`, { signal }).then(getData);
export const createGoal = (data: CreateGoalDTO) =>
  apiClient.post<Goal>('/goals', data).then(getData);
export const updateGoal = (id: string, data: Partial<Goal>) =>
  apiClient.put<Goal>(`/goals/${id}`, data).then(getData);
export const deleteGoal = (id: string) =>
  apiClient.delete<{ message: string }>(`/goals/${id}`).then(getData);
export const getGoalStats = (signal?: AbortSignal) =>
  apiClient.get<GoalStats>('/goals/stats/overview', { signal }).then(getData);

// Projects API
export const getProjects = (signal?: AbortSignal) =>
  apiClient.get<Project[]>('/projects', { signal }).then(getData);
export const getProject = (id: string, signal?: AbortSignal) =>
  apiClient.get<Project>(`/projects/${id}`, { signal }).then(getData);
export const createProject = (data: CreateProjectDTO) =>
  apiClient.post<Project>('/projects', data).then(getData);
export const updateProject = (id: string, data: Partial<CreateProjectDTO>) =>
  apiClient.put<Project>(`/projects/${id}`, data).then(getData);
export const deleteProject = (id: string) =>
  apiClient.delete<{ message: string }>(`/projects/${id}`).then(getData);
export const getProjectStats = (id: string, signal?: AbortSignal) =>
  apiClient.get<ProjectStats>(`/projects/${id}/stats`, { signal }).then(getData);

// Content API
export const getContentIdeas = (params?: { status?: string; platform?: string }, signal?: AbortSignal) =>
  apiClient.get<ContentIdea[]>('/content/ideas', { params, signal }).then(getData);
export const getContentStats = (signal?: AbortSignal) =>
  apiClient.get<ContentStats>('/content/ideas/stats/overview', { signal }).then(getData);
export const getContentIdea = (id: string, signal?: AbortSignal) =>
  apiClient.get<ContentIdea>(`/content/ideas/${id}`, { signal }).then(getData);
export const createContentIdea = (data: Partial<ContentIdea>) =>
  apiClient.post<ContentIdea>('/content/ideas', data).then(getData);
export const updateContentIdea = (id: string, data: Partial<ContentIdea>) =>
  apiClient.put<ContentIdea>(`/content/ideas/${id}`, data).then(getData);
export const deleteContentIdea = (id: string) =>
  apiClient.delete<{ message: string }>(`/content/ideas/${id}`).then(getData);

// Content Archive API
export const getContentArchive = (params?: { element_type?: string; platform?: string }, signal?: AbortSignal) =>
  apiClient.get<any[]>('/content/archive', { params, signal }).then(getData);
export const createArchiveItem = (formData: FormData, onProgress?: (progress: number) => void) =>
  apiClient.post<any>('/content/archive', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  }).then(getData);
export const deleteArchiveItem = (id: string) =>
  apiClient.delete<{ message: string }>(`/content/archive/${id}`).then(getData);

// Content Elements API
export const updateContentElement = (id: string, data: any) =>
  apiClient.put<any>(`/content/elements/${id}`, data).then(getData);

// Sales Pipeline API
export const getDeals = (signal?: AbortSignal) =>
  apiClient.get<Deal[]>('/sales-pipeline/deals', { signal }).then(getData);
export const createDeal = (data: Partial<Deal>) =>
  apiClient.post<Deal>('/sales-pipeline/deals', data).then(getData);

// Job Search API
export const getJobApplications = (signal?: AbortSignal) =>
  apiClient.get<JobApplication[]>('/jobs', { signal }).then(getData);
export const createJobApplication = (data: Partial<JobApplication>) =>
  apiClient.post<JobApplication>('/jobs', data).then(getData);
export const updateJobApplication = (id: string, data: Partial<JobApplication>) =>
  apiClient.put<JobApplication>(`/jobs/${id}`, data).then(getData);
export const deleteJobApplication = (id: string) =>
  apiClient.delete<{ message: string }>(`/jobs/${id}`).then(getData);

// Mutuus API
export const getMutuusMilestones = (signal?: AbortSignal) =>
  apiClient.get<MutuusMilestone[]>('/mutuus', { signal }).then(getData);
export const updateMutuusMilestone = (id: string, data: Partial<MutuusMilestone>) =>
  apiClient.put<MutuusMilestone>(`/mutuus/${id}`, data).then(getData);

// Dashboard API
export const getDashboardStats = (signal?: AbortSignal) =>
  apiClient.get<DashboardStats>('/dashboard/stats', { signal }).then(getData);
export const getDashboardSummary = (signal?: AbortSignal) =>
  apiClient.get<any>('/dashboard/summary', { signal }).then(getData);
export const getTodayEvents = (signal?: AbortSignal) =>
  apiClient.get<any[]>('/dashboard/events/today', { signal }).then(getData);
export const getUnreadNotifications = (signal?: AbortSignal) =>
  apiClient.get<any[]>('/dashboard/notifications/unread', { signal }).then(getData);
export const getActiveApplications = (signal?: AbortSignal) =>
  apiClient.get<any[]>('/dashboard/applications/active', { signal }).then(getData);

// AI API
export const chatWithAI = (messages: ChatMessage[], context?: AIContext) =>
  apiClient.post<{ message: string; provider: string; model: string }>('/ai/chat', { messages, context }).then(getData);
export const agentChat = (data: { message: string; conversationId?: string; provider?: string; model?: string }) =>
  apiClient.post<any>('/ai/agent/chat', data).then(getData);
export const summarizeSession = (documentation: string, taskTitle: string) =>
  apiClient.post<{ summary: string }>('/ai/summarize-session', { documentation, taskTitle }).then(getData);
export const analyzeProductivity = (sessions: WorkSession[]) =>
  apiClient.post<{ analysis: string }>('/ai/analyze-productivity', { sessions }).then(getData);
export const generateSOP = (sessions: WorkSession[], processName: string) =>
  apiClient.post<SOP>('/ai/generate-sop', { sessions, processName }).then(getData);

// AI Conversations API
export const getConversations = (signal?: AbortSignal) =>
  apiClient.get<any[]>('/ai/conversations', { signal }).then(getData);
export const getConversation = (id: string, signal?: AbortSignal) =>
  apiClient.get<any>(`/ai/conversations/${id}`, { signal }).then(getData);
export const createConversation = () =>
  apiClient.post<any>('/ai/conversations').then(getData);
export const deleteConversation = (id: string) =>
  apiClient.delete<any>(`/ai/conversations/${id}`).then(getData);

// AI Habits API
export const getHabits = (signal?: AbortSignal) =>
  apiClient.get<any[]>('/ai/habits', { signal }).then(getData);
export const updateHabit = (id: string, data: any) =>
  apiClient.put<any>(`/ai/habits/${id}`, data).then(getData);

// Integrations API
export const getIntegrations = (signal?: AbortSignal) =>
  apiClient.get<any[]>('/integrations', { signal }).then(getData);
export const connectIntegration = (data: any) =>
  apiClient.post<any>('/integrations/connect', data).then(getData);
export const disconnectIntegration = (data: any) =>
  apiClient.post<any>('/integrations/disconnect', data).then(getData);

// Social Profiles API
export const getSocialProfiles = (signal?: AbortSignal) =>
  apiClient.get<any[]>('/social/profiles', { signal }).then(getData);
export const connectSocialProfile = (id: string) =>
  apiClient.post<any>(`/social/profiles/${id}/connect`).then(getData);
export const disconnectSocialProfile = (id: string) =>
  apiClient.post<any>(`/social/profiles/${id}/disconnect`).then(getData);
export const updateSocialMetrics = (id: string, data: any) =>
  apiClient.put<any>(`/social/profiles/${id}/metrics`, data).then(getData);

// Agents API
export const getAgents = (signal?: AbortSignal) =>
  apiClient.get<any[]>('/agents', { signal }).then(getData);
export const createAgent = (data: any) =>
  apiClient.post<any>('/agents', data).then(getData);
export const updateAgent = (id: string, data: any) =>
  apiClient.put<any>(`/agents/${id}`, data).then(getData);
export const deleteAgent = (id: string) =>
  apiClient.delete<any>(`/agents/${id}`).then(getData);

// Export the API client for custom requests
export { apiClient, API_BASE };
