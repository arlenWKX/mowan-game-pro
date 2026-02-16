"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Menu, X, Trophy, Home, Users, BookOpen, Shield } from "lucide-react"
import { useAuth } from "@/hooks"
import { cn } from "@/lib/utils"

export function Header() {
  const pathname = usePathname()
  const { user, logout, isAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    window.location.href = "/"
  }

  const navItems = [
    { href: "/", label: "首页", icon: Home },
    { href: "/rooms", label: "房间", icon: Users, auth: true },
    { href: "/leaderboard", label: "排行榜", icon: Trophy },
    { href: "/rules", label: "规则", icon: BookOpen },
    { href: "/admin", label: "管理", icon: Shield, admin: true },
  ]

  const visibleNavItems = navItems.filter(item => {
    if (item.auth && !isAuthenticated) return false
    if (item.admin && !user?.isAdmin) return false
    return true
  })

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              魔丸小游戏
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  pathname === item.href 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Actions - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground px-2">
                  {user?.nickname}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  退出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">登录</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">注册</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "关闭菜单" : "打开菜单"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t animate-in slide-in-from-top-2">
            <nav className="flex flex-col gap-1">
              {visibleNavItems.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      pathname === item.href 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
              
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-destructive text-left hover:bg-destructive/10 rounded-lg transition-colors mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              ) : (
                <div className="flex gap-2 px-4 pt-4 mt-2 border-t">
                  <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">登录</Button>
                  </Link>
                  <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">注册</Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
