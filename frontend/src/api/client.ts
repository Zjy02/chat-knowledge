const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'zhiwen_token';

export class ApiError extends Error {
  code: string;
  status: number;
  requestId?: string;

  constructor(message: string, code = 'REQUEST_FAILED', status = 0, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

function authHeaders(): Record<string, string> {
  const token = tokenStorage.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: { code?: string; message?: string; request_id?: string } = {};
  try {
    payload = await response.json();
  } catch {
    // Non-JSON upstream errors (for example an Nginx 502 page) still need a
    // stable message for the UI.
  }
  return new ApiError(
    payload.message || `请求失败（${response.status}）`,
    payload.code || 'REQUEST_FAILED',
    response.status,
    payload.request_id,
  );
}

export async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...(skipAuth ? {} : authHeaders()),
  };
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('网络连接失败，请检查服务是否启动', 'NETWORK_ERROR');
  }

  if (response.status === 401 && !skipAuth) {
    window.dispatchEvent(new CustomEvent('zhiwen:unauthorized'));
  }
  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export { API_BASE };
