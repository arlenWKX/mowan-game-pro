"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameBoard } from "@/components/game-board"
import { createEmptyBoard } from "@/lib/utils"
import { Sword, Target, Users, Crown } from "lucide-react"

export default function RulesPage() {
  // Example boards
  const exampleBoard = {
    ...createEmptyBoard(),
    "1A": 5, "1B": 3, "1C": 8,
    "2A": 0, "2B": 9, "2C": 1,
    "3A": 6, "3B": 2, "3C": 4,
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">游戏规则</h1>

      {/* Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            游戏目标
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            魔丸小游戏是一款2-5人策略推理游戏。玩家需要巧妙部署数字棋子，
            通过移动棋子到公共区域与其他玩家对决，目标是淘汰对手的所有棋子。
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>每位玩家拥有数字0-9共10个棋子</li>
            <li>将棋子部署在3×6的棋盘上</li>
            <li>每回合可以将一枚棋子向前移动一格</li>
            <li>棋子到达最前列进入公共区域，触发对决</li>
            <li>消灭对手所有棋子即可获胜</li>
          </ul>
        </CardContent>
      </Card>

      {/* Board */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            棋盘布局
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            棋盘为3行6列的网格，行号1-3（1为最前列），列号A-F。
            每列有3个格子，棋子只能向前移动（行号减小）。
          </p>
          <div className="flex justify-center py-4">
            <GameBoard board={exampleBoard} readonly />
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <strong className="block mb-1">第1行（最前列）</strong>
              <span className="text-muted-foreground">棋子到达此行后进入公共区域</span>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <strong className="block mb-1">第2行（中间）</strong>
              <span className="text-muted-foreground">棋子的中间位置</span>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <strong className="block mb-1">第3行（最后列）</strong>
              <span className="text-muted-foreground">棋子的起始位置</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Combat Rules */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="w-5 h-5 text-primary" />
            对决规则
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            当棋子进入公共区域时，会按照回合顺序两两对决。
            对决结果遵循以下规则（按优先级排序）：
          </p>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 text-destructive">特殊规则</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">1.</span>
                  <span><strong>相同数字</strong> → 同归于尽（两个棋子都被淘汰）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">2.</span>
                  <span><strong>0 vs 6/9</strong> → 同归于尽（0克制6和9）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">3.</span>
                  <span><strong>8 vs 0</strong> → 8获胜（8专门克制0）</span>
                </li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 text-primary">一般规则</h3>
              <p className="text-sm mb-2">
                如果不触发特殊规则，则按<strong>反向排序</strong>，<strong>小数字获胜</strong>：
              </p>
              <div className="flex items-center gap-2 text-sm font-mono bg-muted p-3 rounded">
                <span className="text-green-500 font-bold">0</span>
                <span>&gt;</span>
                <span>1</span>
                <span>&gt;</span>
                <span>2</span>
                <span>&gt;</span>
                <span>3</span>
                <span>&gt;</span>
                <span>4</span>
                <span>&gt;</span>
                <span>5</span>
                <span>&gt;</span>
                <span>6</span>
                <span>&gt;</span>
                <span>7</span>
                <span>&gt;</span>
                <span>8</span>
                <span>&gt;</span>
                <span className="text-destructive">9</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">对决示例</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-2 bg-background rounded">
                <div className="font-mono">5 vs 3</div>
                <div className="text-green-500">3 胜</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="font-mono">0 vs 6</div>
                <div className="text-destructive">同归于尽</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="font-mono">8 vs 0</div>
                <div className="text-green-500">8 胜</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="font-mono">7 vs 7</div>
                <div className="text-destructive">同归于尽</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            策略提示
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">1</span>
              <span><strong>部署阶段很关键</strong> - 将强力棋子（0、1、2）放在能快速出击的位置</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">2</span>
              <span><strong>保护你的8</strong> - 8是唯一能克制0的棋子，非常珍贵</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">3</span>
              <span><strong>注意回合顺序</strong> - 先行动的玩家在公共区域有先手优势</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">4</span>
              <span><strong>观察对手</strong> - 通过对手的移动推测其剩余棋子</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">5</span>
              <span><strong>保留后路</strong> - 不要过早将所有棋子暴露，留一些后手</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
