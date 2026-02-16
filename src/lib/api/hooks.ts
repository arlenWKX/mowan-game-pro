// ============================================
// API Hooks - React Hooks for Data Fetching
// ============================================

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchApi,
  get,
  post,
  put,
  patch,
  del,
  type RequestConfig,
  type RequestResult,
} from './client'
import {
  isApiError,
  isNetworkError,
  isTimeoutError,
  isValidationError,
  isUnauthorizedError,
} from './errors'

// ============================================
// useApiQuery - 用于 GET 请求
// ============================================

export interface UseApiQueryOptions<T> extends Omit<RequestConfig, 'method'> {
  /** 是否立即执行请求 */
  enabled?: boolean
  /** 依赖数组，变化时重新请求 */
  deps?: unknown[]
  /** 数据转换函数 */
  transform?: (data: unknown) => T
  /** 请求成功回调 */
  onSuccess?: (data: T) => void
  /** 请求失败回调 */
  onError?: (error: Error) => void
  /** 初始数据 */
  initialData?: T
  /** 是否保留上次数据（避免闪烁） */
  keepPreviousData?: boolean
  /** 重试次数 */
  retry?: number
  /** 重试间隔（毫秒） */
  retryDelay?: number
}

export interface UseApiQueryResult<T> {
  /** 响应数据 */
  data: T | undefined
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否获取成功 */
  isSuccess: boolean
  /** 是否发生错误 */
  isError: boolean
  /** 错误对象 */
  error: Error | null
  /** 手动刷新数据 */
  refetch: () => Promise<void>
  /** 取消请求 */
  cancel: () => void
}

/**
 * 用于 GET 请求的 React Hook
 * 
 * @example
 * ```typescript
 * const { data, isLoading, error, refetch } = useApiQuery<User>(
 *   '/api/users/me',
 *   { enabled: !!userId }
 * )
 * ```
 */
export function useApiQuery<T = unknown>(
  url: string | null,
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const {
    enabled = true,
    deps = [],
    transform,
    onSuccess,
    onError,
    initialData,
    keepPreviousData = false,
    retry = 0,
    retryDelay = 1000,
    ...requestConfig
  } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)
  const previousDataRef = useRef<T | undefined>(initialData)

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const execute = useCallback(async () => {
    if (!url) return

    cancel() // 取消之前的请求
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setIsError(false)
    setError(null)

    // 保留之前的数据
    if (keepPreviousData && data !== undefined) {
      previousDataRef.current = data
    }

    const attemptRequest = async (): Promise<void> => {
      const result: RequestResult<T> = await get<T>(url, {
        ...requestConfig,
        signal: abortControllerRef.current?.signal,
      })

      if (!result.success) {
        // 检查是否是被取消的请求
        if (result.error.message === 'The operation was aborted') {
          return
        }

        // 重试逻辑
        if (retryCountRef.current < retry && isNetworkError(result.error)) {
          retryCountRef.current++
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return attemptRequest()
        }

        throw result.error
      }

      const finalData = transform ? transform(result.data) : result.data
      setData(finalData)
      setIsSuccess(true)
      onSuccess?.(finalData as T)
      retryCountRef.current = 0
    }

    try {
      await attemptRequest()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setIsError(true)
      setIsSuccess(false)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [url, ...deps])

  // 自动请求
  useEffect(() => {
    if (enabled && url) {
      execute()
    }
    return cancel
  }, [enabled, url, ...deps])

  const refetch = useCallback(async () => {
    retryCountRef.current = 0
    await execute()
  }, [execute])

  return {
    data: isLoading && keepPreviousData ? previousDataRef.current : data,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch,
    cancel,
  }
}

// ============================================
// useApiMutation - 用于 POST/PUT/DELETE
// ============================================

export type MutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface UseApiMutationOptions<TData, TVariables = unknown> {
  /** HTTP 方法 */
  method?: MutationMethod
  /** 请求 URL */
  url?: string
  /** 动态 URL 生成 */
  urlFn?: (variables: TVariables) => string
  /** 动态请求体生成 */
  bodyFn?: (variables: TVariables) => unknown
  /** 请求配置 */
  requestConfig?: Omit<RequestConfig, 'method' | 'body'>
  /** 成功回调 */
  onSuccess?: (data: TData, variables: TVariables) => void
  /** 错误回调 */
  onError?: (error: Error, variables: TVariables) => void
  /** 开始回调 */
  onMutate?: (variables: TVariables) => void
  /** 完成回调（无论成功失败） */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void
}

export interface UseApiMutationResult<TData, TVariables = unknown> {
  /** 执行 mutation */
  mutate: (variables?: TVariables) => Promise<TData | undefined>
  /** 是否正在执行 */
  isPending: boolean
  /** 是否执行成功 */
  isSuccess: boolean
  /** 是否执行失败 */
  isError: boolean
  /** 错误对象 */
  error: Error | null
  /** 响应数据 */
  data: TData | undefined
  /** 重置状态 */
  reset: () => void
}

/**
 * 用于 POST/PUT/PATCH/DELETE 的 React Hook
 * 
 * @example
 * ```typescript
 * const login = useApiMutation<AuthResponse, LoginInput>({
 *   url: '/api/auth/login',
 *   method: 'POST',
 *   onSuccess: (data) => {
 *     setToken(data.token)
 *   }
 * })
 * 
 * // 执行
 * await login.mutate({ username, password })
 * ```
 */
export function useApiMutation<TData = unknown, TVariables = unknown>(
  options: UseApiMutationOptions<TData, TVariables>
): UseApiMutationResult<TData, TVariables> {
  const {
    method = 'POST',
    url: fixedUrl,
    urlFn,
    bodyFn,
    requestConfig = {},
    onSuccess,
    onError,
    onMutate,
    onSettled,
  } = options

  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<TData | undefined>(undefined)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setData(undefined)
  }, [])

  const mutate = useCallback(
    async (variables?: TVariables): Promise<TData | undefined> => {
      // 确定 URL
      const url = urlFn ? urlFn(variables as TVariables) : fixedUrl
      if (!url) {
        throw new Error('URL is required')
      }

      // 确定请求体
      const body = bodyFn ? bodyFn(variables as TVariables) : variables

      onMutate?.(variables as TVariables)
      setIsPending(true)
      setIsError(false)
      setError(null)

      let result: RequestResult<TData>

      try {
        switch (method) {
          case 'POST':
            result = await post<TData>(url, body, requestConfig)
            break
          case 'PUT':
            result = await put<TData>(url, body, requestConfig)
            break
          case 'PATCH':
            result = await patch<TData>(url, body, requestConfig)
            break
          case 'DELETE':
            result = await del<TData>(url, requestConfig)
            break
          default:
            throw new Error(`Unknown method: ${method}`)
        }

        if (!result.success) {
          throw result.error
        }

        setData(result.data)
        setIsSuccess(true)
        onSuccess?.(result.data, variables as TVariables)
        onSettled?.(result.data, null, variables as TVariables)
        
        return result.data
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setIsError(true)
        setIsSuccess(false)
        onError?.(error, variables as TVariables)
        onSettled?.(undefined, error, variables as TVariables)
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [method, fixedUrl, urlFn, bodyFn, requestConfig, onSuccess, onError, onMutate, onSettled]
  )

  return {
    mutate,
    isPending,
    isSuccess,
    isError,
    error,
    data,
    reset,
  }
}

// ============================================
// 便捷 Hooks
// ============================================

/**
 * POST 请求的便捷 Hook
 */
export function useApiPost<TData = unknown, TBody = unknown>(
  url: string,
  options?: Omit<UseApiMutationOptions<TData, TBody>, 'method' | 'url'>
) {
  return useApiMutation<TData, TBody>({
    ...options,
    url,
    method: 'POST',
  })
}

/**
 * PUT 请求的便捷 Hook
 */
export function useApiPut<TData = unknown, TBody = unknown>(
  url: string,
  options?: Omit<UseApiMutationOptions<TData, TBody>, 'method' | 'url'>
) {
  return useApiMutation<TData, TBody>({
    ...options,
    url,
    method: 'PUT',
  })
}

/**
 * PATCH 请求的便捷 Hook
 */
export function useApiPatch<TData = unknown, TBody = unknown>(
  url: string,
  options?: Omit<UseApiMutationOptions<TData, TBody>, 'method' | 'url'>
) {
  return useApiMutation<TData, TBody>({
    ...options,
    url,
    method: 'PATCH',
  })
}

/**
 * DELETE 请求的便捷 Hook
 */
export function useApiDelete<TData = unknown>(
  url: string,
  options?: Omit<UseApiMutationOptions<TData, void>, 'method' | 'url'>
) {
  return useApiMutation<TData, void>({
    ...options,
    url,
    method: 'DELETE',
  })
}

// ============================================
// useApiLazyQuery - 手动触发的查询
// ============================================

export interface UseApiLazyQueryResult<T, TParams = unknown>
  extends Omit<UseApiQueryResult<T>, 'refetch'> {
  execute: (params?: TParams) => Promise<T | undefined>
}

/**
 * 手动触发的查询 Hook
 * 
 * @example
 * ```typescript
 * const { execute, data, isLoading } = useApiLazyQuery<SearchResult, string>({
 *   urlFn: (query) => `/api/search?q=${query}`,
 * })
 * 
 * // 手动执行
 * await execute('search term')
 * ```
 */
export function useApiLazyQuery<T = unknown, TParams = unknown>(
  options: Omit<UseApiQueryOptions<T>, 'enabled' | 'deps'> & {
    urlFn: (params?: TParams) => string
  }
): UseApiLazyQueryResult<T, TParams> {
  const [url, setUrl] = useState<string | null>(null)
  const { urlFn, ...queryOptions } = options

  const query = useApiQuery<T>(url, {
    ...queryOptions,
    enabled: !!url,
  })

  const execute = useCallback(
    async (params?: TParams): Promise<T | undefined> => {
      setUrl(urlFn(params))
      // 等待请求完成并返回数据
      return new Promise((resolve) => {
        const check = () => {
          if (!query.isLoading) {
            resolve(query.data)
          } else {
            setTimeout(check, 50)
          }
        }
        setTimeout(check, 0)
      })
    },
    [urlFn]
  )

  return {
    ...query,
    execute,
  }
}

// ============================================
// 状态判断工具
// ============================================

export function useErrorType(error: Error | null) {
  return {
    isApiError: error ? isApiError(error) : false,
    isNetworkError: error ? isNetworkError(error) : false,
    isTimeoutError: error ? isTimeoutError(error) : false,
    isValidationError: error ? isValidationError(error) : false,
    isUnauthorizedError: error ? isUnauthorizedError(error) : false,
  }
}
