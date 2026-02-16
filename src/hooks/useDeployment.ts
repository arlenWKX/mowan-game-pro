"use client"

import { useState, useCallback, useMemo } from 'react'
import type { Board } from '@/types'
import { createEmptyBoard, isValidBoard } from '@/lib/utils'

const BOARD_CELLS = [
  '1A', '1B', '1C', '1D', '1E', '1F',
  '2A', '2B', '2C', '2D', '2E', '2F',
  '3A', '3B', '3C', '3D', '3E', '3F'
]

export function useDeployment() {
  const [board, setBoard] = useState<Board>(createEmptyBoard())

  // Get next available number (0-9)
  const nextNumber = useMemo(() => {
    const used = new Set(Object.values(board).filter((v): v is number => v !== null))
    for (let i = 0; i <= 9; i++) {
      if (!used.has(i)) return i
    }
    return null
  }, [board])

  const deployedCount = Object.values(board).filter(v => v !== null).length
  const isComplete = isValidBoard(board)

  // Place or remove number on cell click
  const handleCellClick = useCallback((cellId: string) => {
    setBoard(prev => {
      const currentValue = prev[cellId]
      
      // If cell has a number, remove it
      if (currentValue !== null) {
        return { ...prev, [cellId]: null }
      }
      
      // If cell is empty and we have numbers left, place the next number
      if (nextNumber !== null) {
        return { ...prev, [cellId]: nextNumber }
      }
      
      return prev
    })
  }, [nextNumber])

  // Reset board
  const reset = useCallback(() => {
    setBoard(createEmptyBoard())
  }, [])

  // Submit deployment
  const submit = useCallback(async (token: string, roomId: string) => {
    if (!isValidBoard(board)) return { success: false, error: '请放置所有10个数字' }
    try {
      const res = await fetch(`/api/rooms/${roomId}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ board })
      })
      const data = await res.json()
      return { success: res.ok && data.success, error: data.error }
    } catch {
      return { success: false, error: '网络错误' }
    }
  }, [board])

  // Get placed numbers for display
  const placedNumbers = useMemo(() => {
    const numbers: Record<number, string | null> = {}
    for (let i = 0; i <= 9; i++) numbers[i] = null
    
    for (const [cellId, value] of Object.entries(board)) {
      if (value !== null) {
        numbers[value] = cellId
      }
    }
    return numbers
  }, [board])

  return {
    board,
    deployedCount,
    isComplete,
    nextNumber,
    placedNumbers,
    handleCellClick,
    reset,
    submit
  }
}
