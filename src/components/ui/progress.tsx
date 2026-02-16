"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  className?: string
}

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out"
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
      />
    </div>
  )
}
