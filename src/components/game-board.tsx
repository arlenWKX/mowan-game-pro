"use client"

import { cn } from "@/lib/utils"

interface GameBoardProps {
  /** 棋盘数据: { "1A": 0, "1B": 1, ... } 或 { "1A": "occupied", ... } */
  board: Record<string, number | null | string>
  /** 点击格子回调 */
  onCellClick?: (cellId: string) => void
  /** 是否只读 */
  readonly?: boolean
  /** 尺寸 */
  size?: "sm" | "md" | "lg"
  /** 是否显示标签 */
  showLabels?: boolean
  /** 当前要放置的下一个数字 (部署阶段使用) */
  nextNumber?: number | null
  /** 当前选中的格子ID (游戏阶段使用) */
  selectedCell?: string | null
  /** 可移动到的目标格子高亮 */
  movableCells?: string[]
}

const COLS = ["A", "B", "C", "D", "E", "F"]
const ROWS = [1, 2, 3]

/**
 * 游戏棋盘组件 - 3x6 网格
 * 
 * 坐标系统:
 * - 行号: 1, 2, 3 (第1行是最前列)
 * - 列号: A, B, C, D, E, F
 * - 格子ID: "1A", "2B" 等
 */
export function GameBoard({ 
  board, 
  onCellClick, 
  readonly = false,
  size = "md",
  showLabels = true,
  nextNumber = null,
  selectedCell = null,
  movableCells = []
}: GameBoardProps) {
  
  // 尺寸配置
  const cellSizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 sm:w-12 sm:h-12 text-base",
    lg: "w-14 h-14 text-lg"
  }

  const labelSizes = {
    sm: "w-6 h-8 text-[10px]",
    md: "w-8 h-11 sm:h-12 text-xs",
    lg: "w-8 h-14 text-xs"
  }

  // 获取格子内容
  const getCellContent = (cellId: string): { value: React.ReactNode; type: 'empty' | 'number' | 'hidden' } => {
    const val = board[cellId]
    if (val === null || val === undefined) return { value: null, type: 'empty' }
    if (val === "occupied") return { value: "●", type: 'hidden' }
    if (typeof val === 'number') return { value: val, type: 'number' }
    return { value: String(val), type: 'number' }
  }

  // 检查格子是否为空
  const isEmpty = (cellId: string) => {
    const val = board[cellId]
    return val === null || val === undefined
  }

  // 检查格子是否有数字
  const hasNumber = (cellId: string) => {
    const val = board[cellId]
    return typeof val === 'number'
  }

  // 检查是否是隐藏状态（其他玩家的棋子）
  const isHidden = (cellId: string) => {
    const val = board[cellId]
    return val === "occupied"
  }

  return (
    <div className="inline-block">
      {/* 列标签 */}
      {showLabels && (
        <div className="flex ml-10 mb-1">
          {COLS.map(col => (
            <div 
              key={col} 
              className={cn(
                "flex items-center justify-center font-medium text-muted-foreground",
                cellSizes[size].split(' ')[0] // 使用 cell 的宽度
              )}
            >
              {col}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex">
        {/* 行标签 */}
        {showLabels && (
          <div className="flex flex-col mr-1">
            {ROWS.map(row => (
              <div 
                key={row} 
                className={cn(
                  "flex items-center justify-center font-medium text-muted-foreground",
                  labelSizes[size]
                )}
              >
                {row}
              </div>
            ))}
          </div>
        )}
        
        {/* 棋盘网格 - 使用明确的3行6列布局 */}
        <div className="grid grid-cols-6 gap-1 bg-muted/30 rounded-xl p-2">
          {ROWS.map(row =>
            COLS.map(col => {
              const cellId = `${row}${col}`
              const { value, type } = getCellContent(cellId)
              const empty = isEmpty(cellId)
              const hasNum = hasNumber(cellId)
              const hidden = isHidden(cellId)
              const isSelected = selectedCell === cellId
              const isMovable = movableCells.includes(cellId)
              
              // 部署阶段：可以放置（格子为空且还有数字）
              const canPlace = !readonly && empty && nextNumber !== null
              // 部署阶段：可以移除（格子有数字）
              const canRemove = !readonly && hasNum

              return (
                <button
                  key={cellId}
                  type="button"
                  onClick={() => !readonly && onCellClick?.(cellId)}
                  disabled={readonly || (!canPlace && !canRemove && !isMovable)}
                  className={cn(
                    cellSizes[size],
                    "rounded-lg border-2 flex items-center justify-center font-bold transition-all duration-150",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    
                    // 空格子样式
                    empty && [
                      "bg-background border-border/60",
                      canPlace && [
                        "border-dashed border-primary/50 hover:border-primary hover:bg-primary/5",
                        "cursor-pointer"
                      ],
                      isMovable && [
                        "border-green-500 bg-green-500/10 animate-pulse",
                        "cursor-pointer"
                      ],
                      !canPlace && !isMovable && "cursor-default"
                    ],
                    
                    // 有数字的格子样式
                    hasNum && [
                      "bg-primary border-primary text-primary-foreground shadow-sm",
                      isSelected && "ring-2 ring-yellow-400 ring-offset-1 ring-offset-background scale-105",
                      canRemove && "hover:brightness-110 cursor-pointer",
                      !canRemove && !isSelected && "cursor-default"
                    ],
                    
                    // 隐藏数字（其他玩家）样式
                    hidden && [
                      "bg-muted border-border text-muted-foreground",
                      "cursor-default"
                    ]
                  )}
                  title={canPlace ? `放置 ${nextNumber}` : canRemove ? "点击移除" : isMovable ? "可移动到这里" : undefined}
                >
                  {/* 格子内容 */}
                  <span className={cn(
                    // 部署阶段预览下一个要放置的数字
                    canPlace && nextNumber !== null && "text-primary/40"
                  )}>
                    {canPlace && nextNumber !== null ? nextNumber : value}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
      
      {/* 图例 - 只在部署阶段显示 */}
      {!readonly && nextNumber !== null && (
        <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border-2 border-dashed border-primary/50 bg-background inline-block"></span>
            点击放置 {nextNumber}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-primary border-2 border-primary inline-block"></span>
            已放置
          </span>
        </div>
      )}
    </div>
  )
}
