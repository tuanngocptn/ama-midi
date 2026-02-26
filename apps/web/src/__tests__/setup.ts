import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  } as Storage;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

vi.mock('@/lib/api', () => {
  const api = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(() => null),
  };

  class ApiHttpError extends Error {
    status: number;
    code: string;
    constructor(status: number, message: string, code: string) {
      super(message);
      this.name = 'ApiHttpError';
      this.status = status;
      this.code = code;
    }
  }

  return { api, ApiHttpError };
});
