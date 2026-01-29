"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ShoppingCart,
  UtensilsCrossed,
  Users,
  Receipt,
  Calculator,
  BarChart3,
  Settings,
  Wallet,
} from "lucide-react"

const navigation = [
  { name: "Ventas", href: "/", icon: ShoppingCart },
  { name: "Menu", href: "/menu", icon: UtensilsCrossed },
  { name: "Empleados", href: "/empleados", icon: Users },
  { name: "Gastos", href: "/gastos", icon: Wallet },
  { name: "Cierre de Caja", href: "/cierre", icon: Calculator },
  { name: "Reportes", href: "/reportes", icon: BarChart3 },
  { name: "Configuracion", href: "/configuracion", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-20 lg:w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Receipt className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-lg">POS</h1>
            <p className="text-xs text-sidebar-foreground/70">Restaurante</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-12",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/50 text-center hidden lg:block">
          Sistema POS v1.0
        </div>
      </div>
    </aside>
  )
}
