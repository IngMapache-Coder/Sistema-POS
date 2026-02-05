"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  LogOut,
  UserCircle,
  Shield,
  Coins
} from "lucide-react"
import { PiCatDuotone } from "react-icons/pi";
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"

const navigation = [
  { name: "Ventas", href: "/", icon: ShoppingCart, roles: ["admin", "cashier", "employee"] },
  { name: "Menu", href: "/menu", icon: UtensilsCrossed, roles: ["admin"] },
  { name: "Empleados", href: "/empleados", icon: Users, roles: ["admin", "cashier"] },
  { name: "Usuarios", href: "/usuarios", icon: Shield, roles: ["admin"] },
  { name: "Gastos", href: "/gastos", icon: Wallet, roles: ["admin", "cashier"] },
  { name: "Cierre de Caja", href: "/cierre", icon: Calculator, roles: ["admin", "cashier"] },
  { name: "Cierre de caja historico", href: "/cierres-historicos", icon: Receipt, roles: ["admin"] },
  { name: "Reportes", href: "/reportes", icon: BarChart3, roles: ["admin"] },
  { name: "Cajas", href: "/cajas", icon: Coins, roles: ["admin"] },
  { name: "Configuracion", href: "/configuracion", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUserData = () => {
      if (typeof window === "undefined") return null
      const userData = localStorage.getItem("pos_user")
      return userData ? JSON.parse(userData) : null
    }
    setUser(getUserData())
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("pos_user")
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente",
    })
    router.push("/login")
  }

  // Filtrar navegación por rol
  const filteredNavigation = navigation.filter(item => {
    if (!user) return false
    return item.roles.includes(user.role)
  })

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Administrador",
      cashier: "Cajero",
      employee: "Empleado"
    }
    return roles[role] || role
  }

  return (
    <aside className="w-20 lg:w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border h-screen sticky top-0">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <PiCatDuotone className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div className="hidden lg:block flex-1">
            <h1 className="font-bold text-lg">Tabby POS</h1>
            <p className="text-xs text-sidebar-foreground/70">Sistema de Punto de Venta</p>
            {user && (
              <div className="mt-2 pt-2 border-t border-sidebar-border/50">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-3 w-3 text-sidebar-foreground/60" />
                  <div className="text-xs">
                    <div className="font-medium truncate">{user.name || user.username}</div>
                    <div className="text-sidebar-foreground/60">{getRoleName(user.role)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all min-h-12",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        {user && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block font-medium">Cerrar Sesión</span>
          </Button>
        )}
        <div className="text-xs text-sidebar-foreground/50 text-center hidden lg:block mt-2">
          v1.0 • {new Date().getFullYear()}
        </div>
      </div>
    </aside>
  )
}