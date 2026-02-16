// ============================================
// API Errors - 客户端 API 错误类型定义
// ============================================

/**
 * 网络错误 - 连接失败、DNS 错误等
 */
export class NetworkError extends Error {
  constructor(
    message: string = '网络连接失败，请检查网络后重试',
    public originalError?: Error
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * 超时错误 - 请求超时
 */
export class TimeoutError extends Error {
  constructor(
    message: string = '请求超时，请稍后重试',
    public timeoutMs: number = 10000
  ) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * API 错误 - 服务器返回的错误
 */
export class ApiError extends Error {
  constructor(
    message: string = '请求失败',
    public statusCode: number = 500,
    public code?: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 验证错误 - 表单验证失败
 */
export class ValidationError extends Error {
  public errors: Record<string, string>

  constructor(
    message: string = '表单验证失败',
    errors: Record<string, string> = {}
  ) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/**
 * 未授权错误 - 登录过期或无效 token
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = '登录已过期，请重新登录') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

/**
 * 禁止访问错误 - 权限不足
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = '权限不足，无法访问') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

/**
 * 资源不存在错误
 */
export class NotFoundError extends ApiError {
  constructor(message: string = '请求的资源不存在') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/**
 * 检查错误类型
 */
export const isNetworkError = (error: unknown): error is NetworkError =>
  error instanceof NetworkError

export const isTimeoutError = (error: unknown): error is TimeoutError =>
  error instanceof TimeoutError

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError

export const isUnauthorizedError = (error: unknown): error is UnauthorizedError =>
  error instanceof UnauthorizedError

export const isForbiddenError = (error: unknown): error is ForbiddenError =>
  error instanceof ForbiddenError

export const isNotFoundError = (error: unknown): error is NotFoundError =>
  error instanceof NotFoundError
