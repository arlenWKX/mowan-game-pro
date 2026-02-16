"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface NumberPaletteProps {
  available: number[]
  selected: number | null
  onSelect: (num: number) => void
  disabled?: boolean
  used?: number[]
}

export function NumberPalette({ 
  available, 
  selected, 
  onSelect, 
  disabled = false,
  used = []
}: NumberPaletteProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>数字选择板</span>
        <span>剩余: {available.length} / 10</span>
      </div>
      
      <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-2 justify-center">
        {Array.from({ length: 10 }, (_, i) => i).map(num => {
          const isAvailable = available.includes(num)
          const isSelected = selected === num
          const isUsed = used.includes(num)

          return (
            <button
              key={num}
              onClick={() => isAvailable && !disabled && onSelect(num)}
              disabled={!isAvailable || disabled}
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 font-bold text-lg transition-all duration-200 relative",
                // Selected state - primary color
                isSelected && "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30",
                // Available but not selected
                !isSelected && isAvailable && "bg-muted border-border hover:border-primary hover:bg-primary/5 hover:scale-105",
                // Used (placed on board)
                !isAvailable && isUsed && "opacity-40 bg-muted border-border cursor-not-allowed",
                // Not available and not used (shouldn't happen)
                !isAvailable && !isUsed && "opacity-20 bg-muted border-border cursor-not-allowed",
                // Disabled
                disabled && "cursor-not-allowed"
              )}
            >
              {num}
              
              {/* Checkmark for used numbers */}
              {isUsed && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary-foreground rounded-full" />
              )}
            </button>
          )
        })}
      </div>
      
      {/* Hint text */}
      {!disabled && (
        <p className="text-center text-xs text-muted-foreground">
          {selected !== null ? (
            <span className="text-primary font-medium">已选择 {selected}，点击棋盘格子放置</span>
          ) : available.length > 0 ? (
            "点击数字选择，然后点击棋盘放置"
          ) : (
            <span className="text-green-500">所有数字已放置完成！</span>
          )}
        </p>
      )}
    </div>
  )
}
