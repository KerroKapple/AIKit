import axios, { AxiosInstance } from 'axios';
import { env } from '../env';

export const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com';
export const DASHSCOPE_API = `${DASHSCOPE_BASE}/api/v1`;
export const DASHSCOPE_COMPAT = `${DASHSCOPE_BASE}/compatible-mode/v1`;

export function createSubmitClient(): AxiosInstance {
  return axios.create({
    baseURL: DASHSCOPE_API,
    timeout: 30_000,
    headers: {
      Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
  });
}

export function createPollClient(): AxiosInstance {
  return axios.create({
    baseURL: DASHSCOPE_API,
    timeout: 30_000,
    headers: {
      Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}
