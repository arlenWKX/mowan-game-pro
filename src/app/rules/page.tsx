import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function RulesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">游戏规则</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>【游戏概览】</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>游戏类型：</strong>策略推理类棋类游戏</p>
            <p><strong>玩家人数：</strong>2-5人</p>
            <p><strong>游戏时长：</strong>20-40分钟</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>【游戏配件】</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>玩家棋盘：</strong>3行×6列网格，坐标格式为[行号][列号]，如1A、2B、3F</p>
            <p><strong>数字棋子：</strong>每位玩家拥有0-9共10枚数字棋子</p>
            <p><strong>公共区域：</strong>桌面中央共享结算区</p>
            <p><strong>淘汰区：</strong>每位玩家独立的淘汰记录</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>【游戏流程】</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">阶段一：部署</h4>
              <p className="text-muted-foreground">每位玩家将数字0-9填入个人棋盘的任意10个不同格子中</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">阶段二：行动</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>前进：</strong>将棋子向前移动一格，前排棋子进入公共区域</li>
                <li><strong>单挑：</strong>强制将其他玩家的棋子移入公共区域（额外行动）</li>
                <li><strong>回收：</strong>将公共区域中的己方棋子回收重新部署（额外行动）</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>【对决规则】</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-primary">特殊规则（优先级最高）</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>相同数字 → 同归于尽</li>
                <li>0 vs 6/9 → 同归于尽</li>
                <li>8 &gt; 0</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-secondary">一般规则（反向排序）</h4>
              <p className="text-muted-foreground">
                0 &gt; 1 &gt; 2 &gt; 3 &gt; 4 &gt; 5 &gt; 6 &gt; 7 &gt; 8 &gt; 9
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                较小数字获胜！
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>【胜利条件】</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              当某一轮完成后，场上仅剩一位玩家拥有未被击败的数字，该玩家获胜。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}