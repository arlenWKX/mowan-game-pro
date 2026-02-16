"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User } from "@/types"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)


  // 从 localStorage 加载认证状态
  useEffect(() => {
    if (typeof window === "undefined") return
    
    try {
      const storedToken = localStorage.getItem("token")
      const storedUser = localStorage.getItem("user")
      
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error("Auth hydration error:", error)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback((newToken: string, newUser: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", newToken)
      localStorage.setItem("user", JSON.stringify(newUser))
    }
    setToken(newToken)
    setUser(newUser)
    setIsAuthenticated(true)
    setIsLoading(false)
  }, [])

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    setIsLoading(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
