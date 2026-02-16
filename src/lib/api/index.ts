// ============================================
// API Client - 统一导出
// ============================================

// ============================================
// Errors
// ============================================

export {
  // 错误类
  NetworkError,
  TimeoutError,
  ApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  // 类型守卫
  isNetworkError,
  isTimeoutError,
  isApiError,
  isValidationError,
  isUnauthorizedError,
  isForbiddenError,
  isNotFoundError,
} from './errors'

export type {
  NetworkError as NetworkErrorType,
  TimeoutError as TimeoutErrorType,
  ApiError as ApiErrorType,
  ValidationError as ValidationErrorType,
} from './errors'

// ============================================
// Client
// ============================================

export {
  // 核心函数
  fetchApi,
  get,
  post,
  put,
  patch,
  del,
  // Token 管理
  getToken,
  setToken,
  removeToken,
  // 配置
  configureApiClient,
  getApiClientConfig,
  createApiClient,
  api,
} from './client'

export type {
  RequestConfig,
  ApiResponse,
  RequestResult,
  ApiClientConfig,
} from './client'

// ============================================
// Hooks
// ============================================

export {
  // Query hooks
  useApiQuery,
  useApiLazyQuery,
  // Mutation hooks
  useApiMutation,
  useApiPost,
  useApiPut,
  useApiPatch,
  useApiDelete,
  // Utilities
  useErrorType,
} from './hooks'

export type {
  UseApiQueryOptions,
  UseApiQueryResult,
  MutationMethod,
  UseApiMutationOptions,
  UseApiMutationResult,
  UseApiLazyQueryResult,
} from './hooks'
