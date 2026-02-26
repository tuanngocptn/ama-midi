import type { ApiSuccess, ApiError } from '@ama-midi/shared';

const BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const csrfToken = getCookie('csrf_token');
    if (csrfToken && method !== 'GET') {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err: ApiError = await res.json();
      throw new ApiHttpError(res.status, err.error, err.code);
    }

    const json: ApiSuccess<T> = await res.json();
    return json.data;
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }

  del<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export class ApiHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2];
}

export const api = new ApiClient();
