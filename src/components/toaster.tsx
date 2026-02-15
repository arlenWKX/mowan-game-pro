"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

interface Toast {
  id: string
  message: string
  type: "success" | "error" | "info"
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

export function showToast(message: string, type: Toast["type"] = "info") {
  const toast: Toast = {
    id: Math.random().toString(36).substring(7),
    message,
    type
  }
  toasts = [...toasts, toast]
  toastListeners.forEach(listener => listener(toasts))
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== toast.id)
    toastListeners.forEach(listener => listener(toasts))
  }, 3000)
}

export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    toastListeners.push(setCurrentToasts)
    return () => {
      toastListeners = toastListeners.filter(l => l !== setCurrentToasts)
    }
  }, [])

  const removeToast = (id: string) => {
    toasts = toasts.filter(t => t.id !== id)
    toastListeners.forEach(listener => listener(toasts))
  }

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  }

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
      {currentToasts.map(toast => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3 bg-card border rounded-lg shadow-lg animate-slide-in min-w-[280px]"
        >
          {icons[toast.type]}
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}