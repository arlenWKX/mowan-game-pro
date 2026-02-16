// ============================================
// Authentication - 认证工具
// ============================================

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { JWTPayload } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'mowan-jwt-secret-key-2024'
const SALT_ROUNDS = 10
const TOKEN_EXPIRES_IN = '7d'

// Re-export types
export type { JWTPayload }

/**
 * 哈希密码
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hashed: string): boolean {
  return bcrypt.compareSync(password, hashed)
}

/**
 * 生成JWT令牌
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN })
}

/**
 * 验证JWT令牌
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * 解码令牌（不验证）
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | null
  } catch {
    return null
  }
}

/**
 * 获取令牌过期时间
 */
export function getTokenExpiry(token: string): Date | null {
  const decoded = decodeToken(token)
  if (!decoded?.exp) return null
  return new Date(decoded.exp * 1000)
}

/**
 * 检查令牌是否即将过期（默认24小时内）
 */
export function isTokenExpiringSoon(token: string, thresholdMs: number = 24 * 60 * 60 * 1000): boolean {
  const expiry = getTokenExpiry(token)
  if (!expiry) return true
  return expiry.getTime() - Date.now() < thresholdMs
}
