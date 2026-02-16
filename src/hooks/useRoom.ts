"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Room, Player, GameStateResponse } from '@/types'

interface UseRoomState {
  room: Room | null
  players: Player[]
  gameState: GameStateResponse | null
  isLoading: boolean
  error: Error | null
}

// 深度比较两个对象是否相等
function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true
  if (typeof obj1 !== typeof obj2) return false
  if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) return obj1 === obj2
  
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2 as object)
  
  if (keys1.length !== keys2.length) return false
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (!deepEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])) {
      return false
    }
  }
  
  return true
}

export function useRoom(roomId: string, token: string | null) {
  const [state, setState] = useState<UseRoomState>({
    room: null,
    players: [],
    gameState: null,
    isLoading: false,
    error: null
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(false)
  
  // 保存上一次的数据用于比较
  const lastRoomRef = useRef<Room | null>(null)
  const lastPlayersRef = useRef<Player[]>([])
  const lastGameStateRef = useRef<GameStateResponse | null>(null)

  const fetchRoom = useCallback(async () => {
    if (!isMountedRef.current) return
    
    try {
      const res = await fetch(`/api/rooms/${roomId}`)
      
      if (!isMountedRef.current) return
      
      if (!res.ok) {
        if (res.status === 404) {
          const newState = {
            room: null, 
            players: [],
            gameState: null,
            isLoading: false, 
            error: new Error('房间不存在')
          }
          if (!deepEqual(state, newState)) {
            setState(newState)
          }
          return
        }
        throw new Error(`获取房间失败: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (!isMountedRef.current) return
      
      if (data.success) {
        const newRoom = data.data.room
        const newPlayers = data.data.players
        
        // 只有在数据变化时才更新状态
        const roomChanged = !deepEqual(lastRoomRef.current, newRoom)
        const playersChanged = !deepEqual(lastPlayersRef.current, newPlayers)
        
        if (roomChanged || playersChanged || state.error) {
          lastRoomRef.current = newRoom
          lastPlayersRef.current = newPlayers
          setState(prev => ({
            room: newRoom,
            players: newPlayers,
            gameState: prev.gameState,
            isLoading: false,
            error: null
          }))
        }
      } else {
        const newState = {
          room: null,
          players: [],
          gameState: null,
          isLoading: false,
          error: new Error(data.error || '获取房间失败')
        }
        if (!deepEqual(state, newState)) {
          setState(newState)
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return
      
      const newState = {
        room: null,
        players: [],
        gameState: null,
        isLoading: false,
        error: err instanceof Error ? err : new Error('网络错误')
      }
      if (!deepEqual(state, newState)) {
        setState(newState)
      }
    }
  }, [roomId])

  const fetchGameState = useCallback(async () => {
    if (!token || !isMountedRef.current) return
    try {
      const res = await fetch(`/api/rooms/${roomId}/state`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!isMountedRef.current) return
      
      if (res.ok) {
        const data = await res.json()
        if (data.success && isMountedRef.current) {
          const newGameState = data.data
          // 只有在数据变化时才更新
          if (!deepEqual(lastGameStateRef.current, newGameState)) {
            lastGameStateRef.current = newGameState
            setState(prev => ({ ...prev, gameState: newGameState }))
          }
        }
      }
    } catch {
      // 静默处理游戏状态获取失败
    }
  }, [roomId, token])

  // 初始加载 - 只在客户端挂载后执行
  useEffect(() => {
    isMountedRef.current = true
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    fetchRoom()
    
    return () => {
      isMountedRef.current = false
    }
  }, [fetchRoom])

  // 轮询更新
  useEffect(() => {
    if (!isMountedRef.current) return
    if (!state.room && state.error) return // Don't poll if room not found
    
    intervalRef.current = setInterval(() => {
      fetchRoom()
      if (state.room?.status === 'playing') fetchGameState()
    }, 2000)
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchRoom, fetchGameState, state.room?.status, state.error])

  const apiCall = useCallback(async (endpoint: string, method = 'POST') => {
    if (!token) return
    try {
      const res = await fetch(`/api/rooms/${roomId}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        await fetchRoom()
      }
    } catch (err) {
      console.error(`API call failed: ${endpoint}`, err)
    }
  }, [roomId, token, fetchRoom])

  return {
    room: state.room,
    players: state.players,
    gameState: state.gameState,
    isLoading: state.isLoading,
    error: state.error,
    leaveRoom: () => apiCall('/leave'),
    kickPlayer: (id: string) => apiCall(`/kick/${id}`),
    addBot: () => apiCall('/add-bot'),
    startGame: () => apiCall('/start'),
    refresh: fetchRoom
  }
}
