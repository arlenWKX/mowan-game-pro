"use client"

import { cn } from "@/lib/utils"

interface GameBoardProps {
  board: Record<string, number | null | string>
  onCellClick?: (cellId: string) => void
  selectedCell?: string | null
  readonly?: boolean
  size?: "sm" | "md" | "lg"
}

const COLS = ["A", "B", "C", "D", "E", "F"]
const ROWS = [1, 2, 3]

export function GameBoard({ 
  board, 
  onCellClick, 
  selectedCell, 
  readonly = false,
  size = "md" 
}: GameBoardProps) {
  const sizeClasses = {
    sm: "max-w-[200px] text-sm",
    md: "max-w-[360px] text-xl",
    lg: "max-w-[480px] text-2xl"
  }

  const cellSizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-2xl"
  }

  const getCellContent = (value: number | null | string): string => {
    if (value === null) return ""
    if (value === "occupied") return "●"
    return String(value)
  }

  return (
    <div className={`grid grid-cols-6 gap-2 ${sizeClasses[size]}`}>
      {ROWS.map(row =>
        COLS.map(col => {
          const cellId = `${row}${col}`
          const value = board[cellId]
          const isOccupied = value !== null && value !== undefined

          return (
            <button
              key={cellId}
              onClick={() => !readonly && onCellClick?.(cellId)}
              disabled={readonly}
              className={cn(
                "aspect-square bg-muted rounded-lg border-2 flex items-center justify-center font-bold transition-all duration-200",
                cellSizeClasses[size],
                isOccupied && "bg-primary border-primary text-primary-foreground",
                selectedCell === cellId && "ring-2 ring-secondary ring-offset-2 ring-offset-background",
                !readonly && "hover:border-primary cursor-pointer",
                readonly && "cursor-default"
              )}
            >
              {getCellContent(value)}
            </button>
          )
        })
      )}
    </div>
  )
}