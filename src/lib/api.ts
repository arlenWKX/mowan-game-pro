// ============================================
// API Utilities - 统一的API处理
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyToken, type JWTPayload } from "./auth"


// ============================================
// Error Classes
// ============================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = "未授权") {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = "禁止访问") {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = "资源不存在") {
    super(message, 404, 'NOT_FOUND')
  }
}

export class BadRequestError extends APIError {
  constructor(message: string = "请求参数错误") {
    super(message, 400, 'BAD_REQUEST')
  }
}

export class ConflictError extends APIError {
  constructor(message: string = "资源冲突") {
    super(message, 409, 'CONFLICT')
  }
}

// ============================================
// Response Helpers
// ============================================

export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    message,
    data
  })
}

export function errorResponse(error: APIError | Error | string) {
  if (error instanceof APIError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code 
      },
      { status: error.statusCode }
    )
  }
  
  return NextResponse.json(
    { error: typeof error === 'string' ? error : error.message },
    { status: 500 }
  )
}

// ============================================
// Authentication Middleware
// ============================================

export interface AuthContext {
  userId: string
  username: string
  isAdmin: boolean
}

export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.substring(7)
}

export function authenticate(req: NextRequest): AuthContext {
  const token = extractToken(req)
  if (!token) {
    throw new UnauthorizedError("缺少认证令牌")
  }

  const payload = verifyToken(token)
  if (!payload) {
    throw new UnauthorizedError("无效的认证令牌")
  }

  return {
    userId: payload.userId,
    username: payload.username,
    isAdmin: payload.isAdmin
  }
}

export function requireAdmin(req: NextRequest): AuthContext {
  const context = authenticate(req)
  if (!context.isAdmin) {
    throw new ForbiddenError("需要管理员权限")
  }
  return context
}

// ============================================
// Request Validation
// ============================================

export async function parseJSON<T>(req: NextRequest): Promise<T> {
  try {
    return await req.json()
  } catch {
    throw new BadRequestError("无效的JSON格式")
  }
}

export function validateString(
  value: unknown, 
  fieldName: string,
  options?: { min?: number; max?: number; pattern?: RegExp }
): string {
  if (typeof value !== 'string') {
    throw new BadRequestError(`${fieldName}必须是字符串`)
  }
  
  if (options?.min !== undefined && value.length < options.min) {
    throw new BadRequestError(`${fieldName}至少需要${options.min}个字符`)
  }
  
  if (options?.max !== undefined && value.length > options.max) {
    throw new BadRequestError(`${fieldName}最多${options.max}个字符`)
  }
  
  if (options?.pattern && !options.pattern.test(value)) {
    throw new BadRequestError(`${fieldName}格式不正确`)
  }
  
  return value
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number; integer?: boolean }
): number {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (typeof num !== 'number' || isNaN(num)) {
    throw new BadRequestError(`${fieldName}必须是数字`)
  }
  
  if (options?.integer && !Number.isInteger(num)) {
    throw new BadRequestError(`${fieldName}必须是整数`)
  }
  
  if (options?.min !== undefined && num < options.min) {
    throw new BadRequestError(`${fieldName}不能小于${options.min}`)
  }
  
  if (options?.max !== undefined && num > options.max) {
    throw new BadRequestError(`${fieldName}不能大于${options.max}`)
  }
  
  return num
}

// ============================================
// Route Handler Wrapper
// ============================================

// eslint-disable-next-line
export function withErrorHandler(handler: (req: NextRequest, context: { params: unknown }) => Promise<NextResponse>) {
  return async (req: NextRequest, context: { params: unknown }) => {
    try {
      return await handler(req, context)
    } catch (error) {
      console.error(`[API Error] ${req.method} ${req.url}:`, error)
      return errorResponse(error instanceof Error ? error : String(error))
    }
  }
}

// eslint-disable-next-line
export function withAuth(handler: (req: NextRequest, context: { params: unknown; auth: AuthContext }) => Promise<NextResponse>) {
  return withErrorHandler(async (req, context) => {
    const auth = authenticate(req)
    return handler(req, { ...context, auth })
  })
}

// eslint-disable-next-line
export function withAdmin(handler: (req: NextRequest, context: { params: unknown; auth: AuthContext }) => Promise<NextResponse>) {
  return withErrorHandler(async (req, context) => {
    const auth = requireAdmin(req)
    return handler(req, { ...context, auth })
  })
}

// ============================================
// Client-side API Helpers
// ============================================

export interface FetchOptions extends RequestInit {
  token?: string | null
}

export async function apiClient<T>(
  url: string,
  options: FetchOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  }

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    })

    const data = await response.json()

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || `请求失败: ${response.status}` 
      }
    }

    return { success: true, data }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '网络错误'
    }
  }
}

// ============================================
// Rate Limiting (Simple In-Memory)
// ============================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

export function getRateLimitHeaders(
  identifier: string,
  maxRequests: number = 100
): Record<string, string> {
  const entry = rateLimitMap.get(identifier)
  const remaining = entry 
    ? Math.max(0, maxRequests - entry.count)
    : maxRequests
  const reset = entry 
    ? Math.ceil((entry.resetTime - Date.now()) / 1000)
    : 60

  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset)
  }
}
