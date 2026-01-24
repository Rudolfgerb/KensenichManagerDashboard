/**
 * Custom React Hooks for API calls
 * Provides reusable data fetching logic with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export interface UseAPIResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseAPIOptions {
  skip?: boolean;
  dependencies?: any[];
}

/**
 * Generic hook for fetching data from an API endpoint
 * @param endpoint - API endpoint path
 * @param options - Hook options
 * @returns UseAPIResult with data, loading state, error, and refetch function
 */
export function useAPI<T = any>(
  endpoint: string,
  options: UseAPIOptions = {}
): UseAPIResult<T> {
  const { skip = false, dependencies = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (skip) return;

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}${endpoint}`);
      setData(response.data);
    } catch (err) {
      const error = err as AxiosError;
      setError(new Error(error.response?.data?.error?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [endpoint, skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for mutation operations (POST, PUT, DELETE)
 */
export interface UseMutationResult<T, V> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (variables: V) => Promise<T>;
  reset: () => void;
}

export function useMutation<T = any, V = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
): UseMutationResult<T, V> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (variables: V): Promise<T> => {
      try {
        setLoading(true);
        setError(null);

        let response;
        if (method === 'POST') {
          response = await axios.post(`${API_BASE_URL}${endpoint}`, variables);
        } else if (method === 'PUT') {
          response = await axios.put(`${API_BASE_URL}${endpoint}`, variables);
        } else {
          response = await axios.delete(`${API_BASE_URL}${endpoint}`, { data: variables });
        }

        setData(response.data);
        return response.data;
      } catch (err) {
        const error = err as AxiosError;
        const errorObj = new Error(error.response?.data?.error?.message || error.message);
        setError(errorObj);
        throw errorObj;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, method]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

/**
 * Hook for Tasks
 */
export function useTasks() {
  return useAPI<import('../types').Task[]>('/tasks');
}

export function useTask(id: string, skip = false) {
  return useAPI<import('../types').Task>(`/tasks/${id}`, { skip });
}

export function useCreateTask() {
  return useMutation<import('../types').Task, import('../types').CreateTaskDTO>('/tasks', 'POST');
}

export function useUpdateTask(id: string) {
  return useMutation<import('../types').Task, import('../types').UpdateTaskDTO>(`/tasks/${id}`, 'PUT');
}

export function useDeleteTask(id: string) {
  return useMutation<{ message: string }, {}>(`/tasks/${id}`, 'DELETE');
}

/**
 * Hook for Sessions
 */
export function useSessions() {
  return useAPI<import('../types').WorkSession[]>('/sessions');
}

export function useSessionStats() {
  return useAPI<import('../types').SessionStats>('/sessions/stats');
}

export function useCurrentSession() {
  return useAPI<import('../types').WorkSession>('/sessions/current');
}

export function useStartSession() {
  return useMutation<import('../types').WorkSession, import('../types').StartSessionDTO>('/sessions/start', 'POST');
}

export function useCompleteSession(id: string) {
  return useMutation<import('../types').WorkSession, import('../types').CompleteSessionDTO>(`/sessions/${id}/complete`, 'POST');
}

/**
 * Hook for CRM
 */
export function useContacts() {
  return useAPI<import('../types').Contact[]>('/crm/contacts');
}

export function useContact(id: string, skip = false) {
  return useAPI<import('../types').Contact>(`/crm/contacts/${id}`, { skip });
}

export function useCreateContact() {
  return useMutation<import('../types').Contact, import('../types').CreateContactDTO>('/crm/contacts', 'POST');
}

export function useOverdueFollowups() {
  return useAPI<import('../types').Contact[]>('/crm/followups');
}

/**
 * Hook for Goals
 */
export function useGoals() {
  return useAPI<import('../types').Goal[]>('/goals');
}

export function useGoal(id: string, skip = false) {
  return useAPI<import('../types').Goal>(`/goals/${id}`, { skip });
}

export function useCreateGoal() {
  return useMutation<import('../types').Goal, import('../types').CreateGoalDTO>('/goals', 'POST');
}

export function useGoalStats() {
  return useAPI<import('../types').GoalStats>('/goals/stats/overview');
}

/**
 * Hook for Projects
 */
export function useProjects() {
  return useAPI<import('../types').Project[]>('/projects');
}

export function useProject(id: string, skip = false) {
  return useAPI<import('../types').Project>(`/projects/${id}`, { skip });
}

export function useCreateProject() {
  return useMutation<import('../types').Project, import('../types').CreateProjectDTO>('/projects', 'POST');
}

export function useProjectStats(id: string, skip = false) {
  return useAPI<import('../types').ProjectStats>(`/projects/${id}/stats`, { skip });
}

/**
 * Hook for Content
 */
export function useContentIdeas() {
  return useAPI<import('../types').ContentIdea[]>('/content');
}

export function useContentStats() {
  return useAPI<import('../types').ContentStats>('/content/stats');
}

/**
 * Hook for Dashboard
 */
export function useDashboardStats() {
  return useAPI<import('../types').DashboardStats>('/dashboard/stats');
}

/**
 * Hook for AI Chat
 */
export function useChatWithAI() {
  return useMutation<
    { message: string; provider: string; model: string },
    { messages: import('../types').ChatMessage[]; context?: import('../types').AIContext }
  >('/ai/chat', 'POST');
}
