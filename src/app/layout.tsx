import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/header"
import { Toaster } from "@/components/toaster"
import { AuthProvider } from "@/components/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "魔丸小游戏 - 策略推理数字对决",
    template: "%s | 魔丸小游戏"
  },
  description: "魔丸小游戏是一款2-5人策略推理类棋类游戏，支持在线对战和人机对战。反向排序对决，考验你的策略思维！",
  keywords: ["魔丸小游戏", "策略游戏", "棋类游戏", "数字对决", "在线对战"],
  authors: [{ name: "Mowan Game" }],
  creator: "Mowan Game",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "魔丸小游戏",
    title: "魔丸小游戏 - 策略推理数字对决",
    description: "2-5人策略推理类棋类游戏，支持在线对战和人机对战"
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <Header />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
