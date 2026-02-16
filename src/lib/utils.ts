import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BOARD_COLS, BOARD_ROWS, type Board, type CellId } from "@/types"

// ============================================
// UI Utilities
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// Board Utilities
// ============================================

/** 生成4位房间ID */
export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** 生成唯一ID */
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

/** 创建空棋盘 */
export function createEmptyBoard(): Board {
  const board: Board = {}
  for (const row of BOARD_ROWS) {
    for (const col of BOARD_COLS) {
      board[`${row}${col}` as CellId] = null
    }
  }
  return board
}

/** 获取所有格子ID */
export function getAllCellIds(): CellId[] {
  return BOARD_ROWS.flatMap(row => BOARD_COLS.map(col => `${row}${col}` as CellId))
}

/** 获取前方格子 */
export function getFrontCell(cellId: CellId): CellId | 'public' {
  const row = parseInt(cellId[0]) as typeof BOARD_ROWS[number]
  const col = cellId[1] as typeof BOARD_COLS[number]
  return row === 1 ? 'public' : `${row - 1}${col}` as CellId
}

/** 检查是否可以向前移动 */
export function canMoveForward(board: Board, cellId: CellId): { 
  can: boolean; result?: CellId | 'public'; error?: string 
} {
  const num = board[cellId]
  if (num === null) return { can: false, error: '该位置没有棋子' }
  
  const front = getFrontCell(cellId)
  if (front === 'public') return { can: true, result: 'public' }
  if (board[front] !== null) return { can: false, error: '前方格子已被占用' }
  
  return { can: true, result: front }
}

/** 获取可用的数字 */
export function getAvailableNumbers(board: Board): number[] {
  const used = new Set(Object.values(board).filter((v): v is number => v !== null))
  return Array.from({ length: 10 }, (_, i) => i).filter(n => !used.has(n))
}

/** 检查棋盘是否有效 */
export function isValidBoard(board: Board): boolean {
  return Object.values(board).filter(v => v !== null).length === 10
}

/** 创建随机棋盘（用于人机） */
export function createRandomBoard(): Board {
  const board = createEmptyBoard()
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  
  // Fisher-Yates shuffle
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }
  
  // 获取所有格子ID，随机选择10个放置数字
  const allCells = getAllCellIds()
  // 再次洗牌格子顺序
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]]
  }
  
  // 只在前10个格子放置数字，其余保持null
  allCells.slice(0, 10).forEach((cellId, i) => {
    board[cellId] = numbers[i]
  })
  
  return board
}

// ============================================
// Game Logic - Combat
// ============================================

/** 两个数字对决 
 * 特殊规则：相同→同归于尽, 0 vs 6/9→同归于尽, 8 > 0
 * 一般规则：小数字获胜 (0 > 1 > ... > 9)
 */
export function duel(n1: number, n2: number): { winner: number | null } {
  if (n1 === n2) return { winner: null }
  if ((n1 === 0 && (n2 === 6 || n2 === 9)) || (n2 === 0 && (n1 === 6 || n1 === 9))) return { winner: null }
  if (n1 === 8 && n2 === 0) return { winner: n1 }
  if (n2 === 8 && n1 === 0) return { winner: n2 }
  return { winner: n1 < n2 ? n1 : n2 }
}

/** 公共区域对决结果 */
export interface DuelResult {
  winner?: string;
  losers?: string[];
  tied?: string[];
}

/** 解析公共区域对决
 * 处理多棋子对决，返回所有对决结果
 */
export function resolvePublicArea(publicArea: Array<{ number: number; playerId: string }>): DuelResult[] {
  if (publicArea.length <= 1) {
    return [];
  }

  // 按数字分组
  const byNumber = new Map<number, string[]>();
  for (const piece of publicArea) {
    const existing = byNumber.get(piece.number) || [];
    existing.push(piece.playerId);
    byNumber.set(piece.number, existing);
  }

  const results: DuelResult[] = [];

  // 处理相同数字（同归于尽）
  for (const [number, playerIds] of Array.from(byNumber.entries())) {
    if (playerIds.length > 1) {
      results.push({ tied: playerIds });
    }
  }

  // 处理不同数字的对决
  if (byNumber.size >= 2) {
    // 找出所有唯一数字
    const numbers = Array.from(byNumber.keys());
    
    // 两两对决
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const n1 = numbers[i];
        const n2 = numbers[j];
        const players1 = byNumber.get(n1)!;
        const players2 = byNumber.get(n2)!;
        
        // 单个玩家之间的对决
        for (const p1 of players1) {
          for (const p2 of players2) {
            const result = duel(n1, n2);
            if (result.winner === null) {
              // 平局，双方都输
              results.push({ tied: [p1, p2] });
            } else if (result.winner === n1) {
              results.push({ winner: p1, losers: [p2] });
            } else {
              results.push({ winner: p2, losers: [p1] });
            }
          }
        }
      }
    }
  }

  return results;
}

// ============================================
// Validation
// ============================================

export const validators = {
  username: (v: string) => /^[a-zA-Z0-9_]{3,20}$/.test(v),
  password: (v: string) => v.length >= 6 && v.length <= 50,
  nickname: (v: string) => v.length >= 2 && v.length <= 20,
}

// ============================================
// Async Utils
// ============================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T, delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
