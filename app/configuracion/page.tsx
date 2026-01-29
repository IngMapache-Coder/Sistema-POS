"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { getConfig, updateConfig } from "@/lib/database"
import type { SystemConfig } from "@/lib/types"
import {
  Settings,
  Building2,
  Mail,
  Hash,
  Save,
  RotateCcw,
} from "lucide-react"

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<SystemConfig>({
    topN: 10,
    alertEmail: "",
    businessName: "",
    businessAddress: "",
    businessPhone: "",
  })
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const savedConfig = getConfig()
    setConfig(savedConfig)
  }, [])

  const handleChange = (key: keyof SystemConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateConfig(config)
    setHasChanges(false)
    toast({
      title: "Configuracion guardada",
      description: "Los cambios se han guardado correctamente",
    })
  }

  const handleReset = () => {
    const savedConfig = getConfig()
    setConfig(savedConfig)
    setHasChanges(false)
  }

  const handleClearAllData = () => {
    if (window.confirm("¿Estas seguro de eliminar TODOS los datos? Esta accion no se puede deshacer.")) {
      if (window.confirm("Esta es tu ultima oportunidad. ¿Realmente quieres eliminar todos los datos del sistema?")) {
        localStorage.clear()
        window.location.reload()
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Configuracion del Sistema</h1>
            <p className="text-muted-foreground">Personaliza el comportamiento del POS</p>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="gap-2 bg-transparent">
                <RotateCcw className="h-4 w-4" />
                Descartar
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Guardar Cambios
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4 max-w-2xl">
            {/* Business Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informacion del Negocio
                </CardTitle>
                <CardDescription>
                  Esta informacion aparecera en los tickets y reportes impresos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del Negocio</Label>
                  <Input
                    id="businessName"
                    value={config.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                    placeholder="Mi Restaurante"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Direccion</Label>
                  <Input
                    id="businessAddress"
                    value={config.businessAddress}
                    onChange={(e) => handleChange("businessAddress", e.target.value)}
                    placeholder="Calle Principal #123, Ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Telefono</Label>
                  <Input
                    id="businessPhone"
                    value={config.businessPhone}
                    onChange={(e) => handleChange("businessPhone", e.target.value)}
                    placeholder="(123) 456-7890"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Alerts Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Configuracion de Alertas
                </CardTitle>
                <CardDescription>
                  Recibe notificaciones cuando el inventario este bajo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="alertEmail">Correo Electronico para Alertas</Label>
                  <Input
                    id="alertEmail"
                    type="email"
                    value={config.alertEmail}
                    onChange={(e) => handleChange("alertEmail", e.target.value)}
                    placeholder="admin@mirestaurante.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nota: La funcionalidad de envio de correo requiere configuracion de servidor. 
                    Por ahora, las alertas se mostraran en pantalla al hacer el cierre de caja.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reports Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Configuracion de Reportes
                </CardTitle>
                <CardDescription>
                  Personaliza como se muestran los reportes estadisticos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topN">Numero de productos en Top N</Label>
                  <Input
                    id="topN"
                    type="number"
                    min="1"
                    max="50"
                    value={config.topN}
                    onChange={(e) => handleChange("topN", Math.max(1, Math.min(50, Number(e.target.value))))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Define cuantos productos mostrar en las listas de mas/menos vendidos (1-50)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* System Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Informacion del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Almacenamiento</p>
                    <p className="font-medium">Local (Offline)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ultima actualizacion</p>
                    <p className="font-medium">{new Date().toLocaleDateString("es-MX")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Navegador</p>
                    <p className="font-medium truncate">
                      {typeof window !== "undefined" ? navigator.userAgent.split(" ").slice(-1)[0] : "-"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Espacio de almacenamiento usado</p>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ 
                        width: `${Math.min(100, (JSON.stringify(localStorage).length / (5 * 1024 * 1024)) * 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB de ~5 MB disponibles
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                <CardDescription>
                  Estas acciones son irreversibles. Procede con precaucion.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div>
                    <p className="font-medium">Eliminar todos los datos</p>
                    <p className="text-sm text-muted-foreground">
                      Borra todas las ventas, productos, empleados y configuraciones
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleClearAllData}
                  >
                    Eliminar Todo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
