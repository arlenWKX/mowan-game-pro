"use client"

import { useState, useCallback, useMemo } from 'react'
import type { Board, CellId, GameAction } from '@/types'
import { getFrontCell, canMoveForward } from '@/lib/utils'
import { post } from '@/lib/api/client'

interface UseGameActionsProps {
  myBoard: Board
  myUserId: string
  currentTurn: number
  turnOrder: string[]
  publicArea: { number: number; playerId: string; nickname: string }[]
  isMyTurn: boolean
  roomId: string
}

interface UseGameActionsReturn {
  // 选中状态
  selectedCell: string | null
  selectedNumber: number | null
  
  // 可操作状态
  canAdvance: boolean
  canChallenge: boolean
  canRecall: boolean
  isExtraTurn: boolean
  movableCells: string[]
  
  // 操作方法
  selectCell: (cellId: string) => void
  clearSelection: () => void
  advance: () => Promise<boolean>
  challenge: (targetPlayerId: string, targetCellId: string) => Promise<boolean>
  recall: (publicAreaIndex: number, targetCellId: string) => Promise<boolean>
}

/**
 * 游戏操作 Hook
 * 
 * 管理游戏中的操作逻辑：
 * - 选中棋子
 * - 判断可移动位置
 * - 前进、单挑、回收操作
 */
export function useGameActions({
  myBoard,
  myUserId,
  currentTurn,
  turnOrder,
  publicArea,
  isMyTurn,
  roomId
}: UseGameActionsProps): UseGameActionsReturn {
  const [selectedCell, setSelectedCell] = useState<string | null>(null)

  // 获取选中的数字
  const selectedNumber = useMemo(() => {
    if (!selectedCell) return null
    const num = myBoard[selectedCell as CellId]
    return typeof num === 'number' ? num : null
  }, [selectedCell, myBoard])

  // 判断是否是额外回合
  // 额外回合触发条件：公共区域只有一枚棋子，且是该玩家的棋子
  const isExtraTurn = useMemo(() => {
    if (publicArea.length !== 1) return false
    return publicArea[0].playerId === myUserId
  }, [publicArea, myUserId])

  // 能否前进：选中了自己的棋子
  const canAdvance = useMemo(() => {
    if (!isMyTurn) return false
    if (!selectedCell) return false
    const num = myBoard[selectedCell as CellId]
    return typeof num === 'number'
  }, [isMyTurn, selectedCell, myBoard])

  // 能否单挑：额外回合时可以使用
  const canChallenge = useMemo(() => {
    return isMyTurn && isExtraTurn
  }, [isMyTurn, isExtraTurn])

  // 能否回收：额外回合且公共区域有自己的棋子
  const canRecall = useMemo(() => {
    if (!isMyTurn || !isExtraTurn) return false
    return publicArea.some(p => p.playerId === myUserId)
  }, [isMyTurn, isExtraTurn, publicArea, myUserId])

  // 计算可移动到的格子
  const movableCells = useMemo(() => {
    if (!selectedCell) return []
    
    const num = myBoard[selectedCell as CellId]
    if (typeof num !== 'number') return []

    const result = canMoveForward(myBoard, selectedCell as CellId)
    if (result.can && result.result) {
      return [result.result === 'public' ? 'public' : result.result]
    }
    return []
  }, [selectedCell, myBoard])

  // 选中格子
  const selectCell = useCallback((cellId: string) => {
    setSelectedCell(prev => prev === cellId ? null : cellId)
  }, [])

  // 清除选中
  const clearSelection = useCallback(() => {
    setSelectedCell(null)
  }, [])

  // 前进操作
  const advance = useCallback(async (): Promise<boolean> => {
    if (!canAdvance || !selectedCell) return false
    
    // 计算目标位置
    const result = canMoveForward(myBoard, selectedCell as CellId)
    if (!result.can || !result.result) return false
    
    const action: GameAction = {
      type: 'move',
      from: selectedCell,
      to: result.result === 'public' ? 'public' : result.result
    }
    
    try {
      const response = await post(`/api/rooms/${roomId}/action`, { action })
      if (response.success) {
        clearSelection()
        return true
      }
    } catch (error) {
      console.error('Failed to advance:', error)
    }
    return false
  }, [canAdvance, selectedCell, myBoard, roomId, clearSelection])

  // 单挑操作
  const challenge = useCallback(async (
    targetPlayerId: string, 
    targetCellId: string
  ): Promise<boolean> => {
    if (!canChallenge) return false
    
    const action: GameAction = {
      type: 'duel',
      targetPlayerId
    }
    
    try {
      const response = await post(`/api/rooms/${roomId}/action`, { action })
      return response.success
    } catch (error) {
      console.error('Failed to challenge:', error)
      return false
    }
  }, [canChallenge, roomId])

  // 回收操作
  const recall = useCallback(async (
    publicAreaIndex: number,
    targetCellId: string
  ): Promise<boolean> => {
    if (!canRecall) return false
    
    const action: GameAction = {
      type: 'recycle',
      pieceIndex: publicAreaIndex
    }
    
    try {
      const response = await post(`/api/rooms/${roomId}/action`, { action })
      return response.success
    } catch (error) {
      console.error('Failed to recall:', error)
      return false
    }
  }, [canRecall, roomId])

  return {
    selectedCell,
    selectedNumber,
    canAdvance,
    canChallenge,
    canRecall,
    isExtraTurn,
    movableCells,
    selectCell,
    clearSelection,
    advance,
    challenge,
    recall
  }
}
