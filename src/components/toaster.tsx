"use client"

import { useEffect, useState, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info" | "loading"

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastOptions {
  duration?: number
  type?: ToastType
}

// Toast state management
let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

const DEFAULT_DURATION = 5000
const LOADING_DURATION = Infinity

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toasts]))
}

export function showToast(message: string, type: ToastType = "info", options?: ToastOptions) {
  const duration = options?.duration ?? (type === "loading" ? LOADING_DURATION : DEFAULT_DURATION)
  
  const toast: Toast = {
    id: Math.random().toString(36).substring(2, 9),
    message,
    type,
    duration
  }
  
  toasts = [...toasts, toast]
  notifyListeners()
  
  if (duration !== LOADING_DURATION) {
    setTimeout(() => {
      dismissToast(toast.id)
    }, duration)
  }
  
  return toast.id
}

export function dismissToast(id: string) {
  const toast = toasts.find(t => t.id === id)
  if (!toast) return
  
  toasts = toasts.filter(t => t.id !== id)
  notifyListeners()
}

export function updateToast(id: string, message: string, type: ToastType) {
  const toast = toasts.find(t => t.id === id)
  if (!toast) return
  
  toasts = toasts.map(t => 
    t.id === id ? { ...t, message, type } : t
  )
  notifyListeners()
  
  // Reset timer for non-loading toasts
  if (type !== "loading") {
    setTimeout(() => dismissToast(id), DEFAULT_DURATION)
  }
}

export function promiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string
    error: string
  }
): Promise<T> {
  const id = showToast(messages.loading, "loading")
  
  promise
    .then(() => {
      updateToast(id, messages.success, "success")
    })
    .catch(() => {
      updateToast(id, messages.error, "error")
    })
  
  return promise
}

// Toast Item Component
function ToastItem({ toast }: { toast: Toast }) {
  const [progress, setProgress] = useState(100)
  
  useEffect(() => {
    if (toast.duration === LOADING_DURATION) return
    
    const startTime = Date.now()
    const duration = toast.duration || DEFAULT_DURATION
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      
      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 16)
    
    return () => clearInterval(interval)
  }, [toast.duration])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    loading: <Loader2 className="w-5 h-5 text-primary animate-spin" />
  }

  const styles = {
    success: "border-green-500/20 bg-green-500/5",
    error: "border-red-500/20 bg-red-500/5",
    info: "border-blue-500/20 bg-blue-500/5",
    loading: "border-primary/20 bg-primary/5"
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg min-w-[280px] max-w-md overflow-hidden",
        "animate-in slide-in-from-right-full duration-300",
        styles[toast.type]
      )}
    >
      {/* Progress bar */}
      {toast.duration !== LOADING_DURATION && (
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      )}
      
      {icons[toast.type]}
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => dismissToast(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Main Toaster Component
export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts)
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-2">
        {currentToasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  )
}
