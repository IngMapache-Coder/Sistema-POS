// app/layout.tsx (actualizado)
import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { AuthGuard } from "@/components/layout/auth-guard"
import './globals.css'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Tabby - Sistema POS para Restaurantes',
  description: 'Sistema de punto de venta para restaurante con gestión de ventas, inventario, empleados y reportes',
  icons: {
    icon: '/icon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} font-sans antialiased touch-manipulation`}>
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}