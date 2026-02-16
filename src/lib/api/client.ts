// ============================================
// API Client - 客户端 API 调用封装
// ============================================

import {
  NetworkError,
  TimeoutError,
  ApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from './errors'

/**
 * 请求配置选项
 */
export interface RequestConfig extends Omit<RequestInit, 'body'> {
  /** 请求体数据 */
  body?: unknown
  /** 超时时间（毫秒），默认 10000 */
  timeout?: number
  /** 是否自动添加认证头 */
  withAuth?: boolean
  /** 自定义 token */
  token?: string | null
  /** 是否跳过全局错误处理 */
  skipErrorHandler?: boolean
  /** 基础 URL，默认使用相对路径 */
  baseURL?: string
}

/**
 * API 响应包装
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code?: string
}

/**
 * 请求结果
 */
export type RequestResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: Error }

// ============================================
// Token 管理
// ============================================

const TOKEN_KEY = 'token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

// ============================================
// 核心请求函数
// ============================================

const DEFAULT_TIMEOUT = 10000
const DEFAULT_BASE_URL = ''

/**
 * 创建 AbortController 包装的超时 Promise
 */
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`请求超时（${timeoutMs}ms）`, timeoutMs))
    }, timeoutMs)
  })
}

/**
 * 处理 HTTP 错误状态码
 */
function handleHttpError(response: Response, data: ApiResponse): never {
  const message = data.error || `请求失败: ${response.status}`

  switch (response.status) {
    case 400:
      // 检查是否是验证错误
      if (data.code === 'VALIDATION_ERROR' && typeof data.data === 'object') {
        throw new ValidationError(message, data.data as Record<string, string>)
      }
      throw new ApiError(message, 400, data.code, data.data)
    case 401:
      // 清除过期 token
      removeToken()
      throw new UnauthorizedError(message)
    case 403:
      throw new ForbiddenError(message)
    case 404:
      throw new NotFoundError(message)
    case 422:
      throw new ValidationError(message, (data.data as Record<string, string>) || {})
    default:
      throw new ApiError(message, response.status, data.code, data.data)
  }
}

/**
 * 构建完整 URL
 */
function buildURL(url: string, baseURL: string = DEFAULT_BASE_URL): string {
  if (url.startsWith('http')) return url
  if (baseURL) {
    const normalizedBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`
    return `${normalizedBase}${normalizedUrl}`
  }
  return url
}

/**
 * 构建请求头
 */
function buildHeaders(config: RequestConfig): HeadersInit {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...((config.headers as Record<string, string>) || {}),
  }

  // 自动添加 Content-Type（如果不是 FormData）
  if (config.body && !(config.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  // 添加认证头
  const token = config.token ?? (config.withAuth !== false ? getToken() : null)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * 发送 API 请求
 * 
 * @example
 * ```typescript
 * const result = await fetchApi<User>('/api/users/me')
 * if (result.success) {
 *   console.log(result.data)
 * }
 * ```
 */
export async function fetchApi<T = unknown>(
  url: string,
  config: RequestConfig = {}
): Promise<RequestResult<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    body,
    baseURL,
    skipErrorHandler,
    ...fetchOptions
  } = config

  const fullURL = buildURL(url, baseURL)
  const headers = buildHeaders(config)

  // 准备请求体
  const requestBody = body instanceof FormData 
    ? body 
    : body !== undefined 
      ? JSON.stringify(body) 
      : undefined

  try {
    // 使用 Promise.race 实现超时
    const response = await Promise.race([
      fetch(fullURL, {
        ...fetchOptions,
        headers,
        body: requestBody,
      }),
      createTimeoutPromise(timeout),
    ])

    // 解析响应数据
    let data: ApiResponse<T>
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = { success: response.ok, error: text }
    }

    // 处理错误响应
    if (!response.ok) {
      handleHttpError(response, data)
    }

    return {
      success: true,
      data: data.data as T,
      message: data.message,
    }
  } catch (error) {
    // 处理已知的错误类型
    if (
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      error instanceof ApiError ||
      error instanceof ValidationError
    ) {
      if (!skipErrorHandler) {
        return { success: false, error }
      }
      throw error
    }

    // 处理网络错误（TypeError 通常表示网络问题）
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new NetworkError('网络连接失败', error)
      if (!skipErrorHandler) {
        return { success: false, error: networkError }
      }
      throw networkError
    }

    // 其他未知错误
    const apiError = new ApiError(
      error instanceof Error ? error.message : '未知错误'
    )
    if (!skipErrorHandler) {
      return { success: false, error: apiError }
    }
    throw apiError
  }
}

// ============================================
// 便捷方法
// ============================================

/**
 * GET 请求
 */
export function get<T = unknown>(
  url: string,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<RequestResult<T>> {
  return fetchApi<T>(url, { ...config, method: 'GET' })
}

/**
 * POST 请求
 */
export function post<T = unknown>(
  url: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<RequestResult<T>> {
  return fetchApi<T>(url, { ...config, method: 'POST', body })
}

/**
 * PUT 请求
 */
export function put<T = unknown>(
  url: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<RequestResult<T>> {
  return fetchApi<T>(url, { ...config, method: 'PUT', body })
}

/**
 * PATCH 请求
 */
export function patch<T = unknown>(
  url: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<RequestResult<T>> {
  return fetchApi<T>(url, { ...config, method: 'PATCH', body })
}

/**
 * DELETE 请求
 */
export function del<T = unknown>(
  url: string,
  config?: Omit<RequestConfig, 'method'>
): Promise<RequestResult<T>> {
  return fetchApi<T>(url, { ...config, method: 'DELETE' })
}

// ============================================
// 配置 API 客户端
// ============================================

export interface ApiClientConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  withAuth?: boolean
  onError?: (error: Error) => void
  onUnauthorized?: () => void
}

let globalConfig: ApiClientConfig = {}

export function configureApiClient(config: ApiClientConfig): void {
  globalConfig = { ...globalConfig, ...config }
}

export function getApiClientConfig(): ApiClientConfig {
  return { ...globalConfig }
}

/**
 * 创建预配置的 API 客户端实例
 */
export function createApiClient(config: ApiClientConfig = {}) {
  const clientConfig = { ...globalConfig, ...config }

  const request = async <T = unknown>(
    url: string,
    requestConfig: RequestConfig = {}
  ): Promise<RequestResult<T>> => {
    const mergedConfig: RequestConfig = {
      ...clientConfig,
      ...requestConfig,
      headers: {
        ...clientConfig.headers,
        ...(requestConfig.headers as Record<string, string> || {}),
      },
    }

    const result = await fetchApi<T>(url, mergedConfig)

    if (!result.success) {
      if (result.error instanceof UnauthorizedError && clientConfig.onUnauthorized) {
        clientConfig.onUnauthorized()
      }
      if (clientConfig.onError) {
        clientConfig.onError(result.error)
      }
    }

    return result
  }

  return {
    get: <T>(url: string, config?: RequestConfig) =>
      request<T>(url, { ...config, method: 'GET' }),
    post: <T>(url: string, body?: unknown, config?: RequestConfig) =>
      request<T>(url, { ...config, method: 'POST', body }),
    put: <T>(url: string, body?: unknown, config?: RequestConfig) =>
      request<T>(url, { ...config, method: 'PUT', body }),
    patch: <T>(url: string, body?: unknown, config?: RequestConfig) =>
      request<T>(url, { ...config, method: 'PATCH', body }),
    delete: <T>(url: string, config?: RequestConfig) =>
      request<T>(url, { ...config, method: 'DELETE' }),
  }
}

// 默认导出全局 API 客户端
export const api = createApiClient()
