import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const COLS = ['A', 'B', 'C', 'D', 'E', 'F']
export const ROWS = [1, 2, 3]

export function createEmptyBoard(): Record<string, number | null> {
  const board: Record<string, number | null> = {}
  for (const row of ROWS) {
    for (const col of COLS) {
      board[`${row}${col}`] = null
    }
  }
  return board
}

export function getFrontCell(cellId: string): string | null {
  const row = parseInt(cellId[0])
  const col = cellId[1]
  if (row === 1) return 'public'
  return `${row - 1}${col}`
}

export function canMoveForward(board: Record<string, number | null>, cellId: string): { can: boolean; result?: string; error?: string } {
  const num = board[cellId]
  if (num === null || num === undefined) {
    return { can: false, error: '该位置没有棋子' }
  }
  
  const front = getFrontCell(cellId)
  if (front === 'public') {
    return { can: true, result: 'public' }
  }
  
  if (board[front] !== null) {
    return { can: false, error: '前方格子已被占用' }
  }
  
  return { can: true, result: front }
}

export function getAvailableNumbers(board: Record<string, number | null>): number[] {
  const used = new Set<number>()
  for (const num of Object.values(board)) {
    if (num !== null) used.add(num)
  }
  return Array.from({ length: 10 }, (_, i) => i).filter(n => !used.has(n))
}

export function isValidBoard(board: Record<string, number | null>): boolean {
  return Object.values(board).filter(v => v !== null).length === 10
}

interface DuelPiece {
  number: number
  playerId: string
}

export function duel(p1: DuelPiece, p2: DuelPiece): { winner: string | null; eliminated: string[] } {
  const n1 = p1.number
  const n2 = p2.number
  
  // Special rules
  if (n1 === n2) {
    return { winner: null, eliminated: [p1.playerId, p2.playerId] }
  }
  
  if ((n1 === 0 && (n2 === 6 || n2 === 9)) || (n2 === 0 && (n1 === 6 || n1 === 9))) {
    return { winner: null, eliminated: [p1.playerId, p2.playerId] }
  }
  
  if (n1 === 8 && n2 === 0) {
    return { winner: p1.playerId, eliminated: [p2.playerId] }
  }
  
  if (n2 === 8 && n1 === 0) {
    return { winner: p2.playerId, eliminated: [p1.playerId] }
  }
  
  // General rule: smaller wins
  if (n1 < n2) {
    return { winner: p1.playerId, eliminated: [p2.playerId] }
  } else {
    return { winner: p2.playerId, eliminated: [p1.playerId] }
  }
}

export function resolvePublicArea(
  publicArea: DuelPiece[],
  turnOrder: string[]
): { remaining: DuelPiece[]; eliminated: { number: number; playerId: string }[]; extraAction: string | null } {
  if (publicArea.length === 0) {
    return { remaining: [], eliminated: [], extraAction: null }
  }
  
  if (publicArea.length === 1) {
    return { remaining: [], eliminated: [], extraAction: publicArea[0].playerId }
  }
  
  const eliminated: { number: number; playerId: string }[] = []
  let currentArea = [...publicArea]
  
  while (currentArea.length >= 2) {
    // Sort by turn order
    const orderMap = new Map(turnOrder.map((id, idx) => [id, idx]))
    currentArea.sort((a, b) => (orderMap.get(a.playerId) ?? 999) - (orderMap.get(b.playerId) ?? 999))
    
    const piece1 = currentArea[0]
    const piece2 = currentArea[1]
    
    const result = duel(piece1, piece2)
    
    // Remove dueling pieces
    currentArea = currentArea.slice(2)
    
    // Add eliminated
    for (const pid of result.eliminated) {
      eliminated.push({
        number: pid === piece1.playerId ? piece1.number : piece2.number,
        playerId: pid
      })
    }
    
    // Winner stays
    if (result.winner !== null) {
      const winnerPiece = result.winner === piece1.playerId ? piece1 : piece2
      currentArea.push(winnerPiece)
    }
    
    // Check if can continue
    if (currentArea.length < 2) break
    
    const playersInArea = new Set(currentArea.map(p => p.playerId))
    if (playersInArea.size < 2) break
  }
  
  return { remaining: currentArea, eliminated, extraAction: null }
}