"use client"

import { cn } from "@/lib/utils"

interface NumberPaletteProps {
  available: number[]
  selected: number | null
  onSelect: (num: number) => void
  disabled?: boolean
}

export function NumberPalette({ available, selected, onSelect, disabled = false }: NumberPaletteProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {Array.from({ length: 10 }, (_, i) => i).map(num => {
        const isAvailable = available.includes(num)
        const isSelected = selected === num

        return (
          <button
            key={num}
            onClick={() => isAvailable && !disabled && onSelect(num)}
            disabled={!isAvailable || disabled}
            className={cn(
              "w-12 h-12 rounded-lg border-2 font-bold transition-all duration-200",
              isSelected && "bg-primary border-primary text-primary-foreground",
              !isSelected && isAvailable && "bg-muted border-border hover:border-primary",
              !isAvailable && "opacity-30 cursor-not-allowed bg-muted border-border",
              disabled && "cursor-not-allowed"
            )}
          >
            {num}
          </button>
        )
      })}
    </div>
  )
}