/**
 * API Service Layer
 * Centralized API calls with TypeScript types
 */

import axios, { AxiosResponse } from 'axios';
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

const API_BASE = 'http://localhost:3001/api';

// Helper to extract data from response
const getData = <T>(response: AxiosResponse<T>): T => response.data;

// Tasks API
export const getTasks = () => axios.get<Task[]>(`${API_BASE}/tasks`).then(getData);
export const getPendingTasks = () => axios.get<Task[]>(`${API_BASE}/tasks/pending`).then(getData);
export const getTask = (id: string) => axios.get<Task>(`${API_BASE}/tasks/${id}`).then(getData);
export const createTask = (data: CreateTaskDTO) => axios.post<Task>(`${API_BASE}/tasks`, data).then(getData);
export const updateTask = (id: string, data: UpdateTaskDTO) =>
  axios.put<Task>(`${API_BASE}/tasks/${id}`, data).then(getData);
export const deleteTask = (id: string) =>
  axios.delete<{ message: string }>(`${API_BASE}/tasks/${id}`).then(getData);

// Sessions API
export const getSessions = () => axios.get<WorkSession[]>(`${API_BASE}/sessions`).then(getData);
export const getSessionStats = () => axios.get<SessionStats>(`${API_BASE}/sessions/stats`).then(getData);
export const getCurrentSession = () =>
  axios.get<WorkSession | null>(`${API_BASE}/sessions/current`).then(getData);
export const startSession = (data: StartSessionDTO) =>
  axios.post<WorkSession>(`${API_BASE}/sessions/start`, data).then(getData);
export const completeSession = (id: string, data: CompleteSessionDTO) =>
  axios.post<WorkSession>(`${API_BASE}/sessions/${id}/complete`, data).then(getData);
export const stopSession = (id: string) => axios.post<WorkSession>(`${API_BASE}/sessions/${id}/stop`).then(getData);

// SOPs API
export const getSOPs = () => axios.get<SOP[]>(`${API_BASE}/sops`).then(getData);
export const createSOP = (data: Partial<SOP>) => axios.post<SOP>(`${API_BASE}/sops`, data).then(getData);

// CRM API
export const getContacts = () => axios.get<Contact[]>(`${API_BASE}/crm/contacts`).then(getData);
export const getContact = (id: string) => axios.get<Contact>(`${API_BASE}/crm/contacts/${id}`).then(getData);
export const createContact = (data: CreateContactDTO) =>
  axios.post<Contact>(`${API_BASE}/crm/contacts`, data).then(getData);
export const updateContact = (id: string, data: Partial<CreateContactDTO>) =>
  axios.put<Contact>(`${API_BASE}/crm/contacts/${id}`, data).then(getData);
export const deleteContact = (id: string) =>
  axios.delete<{ message: string }>(`${API_BASE}/crm/contacts/${id}`).then(getData);
export const addCommunication = (contactId: string, data: Partial<Communication>) =>
  axios.post<Communication>(`${API_BASE}/crm/contacts/${contactId}/communication`, data).then(getData);
export const getOverdueFollowups = () => axios.get<Contact[]>(`${API_BASE}/crm/followups`).then(getData);

// Goals API
export const getGoals = (status?: string) => {
  const url = status ? `${API_BASE}/goals?status=${status}` : `${API_BASE}/goals`;
  return axios.get<Goal[]>(url).then(getData);
};
export const getGoal = (id: string) => axios.get<Goal>(`${API_BASE}/goals/${id}`).then(getData);
export const createGoal = (data: CreateGoalDTO) => axios.post<Goal>(`${API_BASE}/goals`, data).then(getData);
export const updateGoal = (id: string, data: Partial<Goal>) =>
  axios.put<Goal>(`${API_BASE}/goals/${id}`, data).then(getData);
export const deleteGoal = (id: string) =>
  axios.delete<{ message: string }>(`${API_BASE}/goals/${id}`).then(getData);
export const getGoalStats = () => axios.get<GoalStats>(`${API_BASE}/goals/stats/overview`).then(getData);

// Projects API
export const getProjects = () => axios.get<Project[]>(`${API_BASE}/projects`).then(getData);
export const getProject = (id: string) => axios.get<Project>(`${API_BASE}/projects/${id}`).then(getData);
export const createProject = (data: CreateProjectDTO) =>
  axios.post<Project>(`${API_BASE}/projects`, data).then(getData);
export const updateProject = (id: string, data: Partial<CreateProjectDTO>) =>
  axios.put<Project>(`${API_BASE}/projects/${id}`, data).then(getData);
export const deleteProject = (id: string) =>
  axios.delete<{ message: string }>(`${API_BASE}/projects/${id}`).then(getData);
export const getProjectStats = (id: string) =>
  axios.get<ProjectStats>(`${API_BASE}/projects/${id}/stats`).then(getData);

// Content API
export const getContentIdeas = () => axios.get<ContentIdea[]>(`${API_BASE}/content`).then(getData);
export const getContentStats = () => axios.get<ContentStats>(`${API_BASE}/content/stats`).then(getData);
export const createContentIdea = (data: Partial<ContentIdea>) =>
  axios.post<ContentIdea>(`${API_BASE}/content`, data).then(getData);

// Sales Pipeline API
export const getDeals = () => axios.get<Deal[]>(`${API_BASE}/sales-pipeline/deals`).then(getData);
export const createDeal = (data: Partial<Deal>) =>
  axios.post<Deal>(`${API_BASE}/sales-pipeline/deals`, data).then(getData);

// Job Search API
export const getJobApplications = () => axios.get<JobApplication[]>(`${API_BASE}/jobs`).then(getData);
export const createJobApplication = (data: Partial<JobApplication>) =>
  axios.post<JobApplication>(`${API_BASE}/jobs`, data).then(getData);

// Mutuus API
export const getMutuusMilestones = () => axios.get<MutuusMilestone[]>(`${API_BASE}/mutuus`).then(getData);
export const updateMutuusMilestone = (id: string, data: Partial<MutuusMilestone>) =>
  axios.put<MutuusMilestone>(`${API_BASE}/mutuus/${id}`, data).then(getData);

// Dashboard API
export const getDashboardStats = () => axios.get<DashboardStats>(`${API_BASE}/dashboard/stats`).then(getData);

// AI API
export const chatWithAI = (messages: ChatMessage[], context?: AIContext) =>
  axios
    .post<{ message: string; provider: string; model: string }>(`${API_BASE}/ai/chat`, { messages, context })
    .then(getData);
export const summarizeSession = (documentation: string, taskTitle: string) =>
  axios.post<{ summary: string }>(`${API_BASE}/ai/summarize-session`, { documentation, taskTitle }).then(getData);
export const analyzeProductivity = (sessions: WorkSession[]) =>
  axios.post<{ analysis: string }>(`${API_BASE}/ai/analyze-productivity`, { sessions }).then(getData);
export const generateSOP = (sessions: WorkSession[], processName: string) =>
  axios.post<SOP>(`${API_BASE}/ai/generate-sop`, { sessions, processName }).then(getData);
