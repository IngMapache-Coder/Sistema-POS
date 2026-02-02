"use client";

import { InputNumber } from "@/components/ui/input-number";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getConfig, updateConfig } from "@/lib/database";
import type { SystemConfig } from "@/lib/types";
import { Settings, Building2, Save, RotateCcw } from "lucide-react";

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<SystemConfig>({
    topN: 10,
    alertEmail: "",
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessNIT: "",
    dailyBase: 0,
    reopenPassword: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await getConfig();
      setConfig(savedConfig);
    } catch (error) {
      console.error("Error loading config:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive",
      });
    }
  };

  const handleChange = (key: keyof SystemConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateConfig(config);
      setHasChanges(false);
      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };

  const handleReset = async () => {
    try {
      const savedConfig = await getConfig();
      setConfig(savedConfig);
      setHasChanges(false);
    } catch (error) {
      console.error("Error resetting config:", error);
      toast({
        title: "Error",
        description: "No se pudo restaurar la configuración",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
            <p className="text-muted-foreground">
              Personaliza la información de tu negocio
            </p>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2 bg-transparent"
              >
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
            {/* Business Info - Única sección */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información del Negocio
                </CardTitle>
                <CardDescription>
                  Esta información aparecerá en los tickets y reportes impresos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del Negocio</Label>
                  <Input
                    id="businessName"
                    value={config.businessName}
                    onChange={(e) =>
                      handleChange("businessName", e.target.value)
                    }
                    placeholder="Mi Restaurante"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Dirección</Label>
                  <Input
                    id="businessAddress"
                    value={config.businessAddress}
                    onChange={(e) =>
                      handleChange("businessAddress", e.target.value)
                    }
                    placeholder="Calle Principal #123, Ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Teléfono</Label>
                  <Input
                    id="businessPhone"
                    value={config.businessPhone}
                    onChange={(e) =>
                      handleChange("businessPhone", e.target.value)
                    }
                    placeholder="(123) 456-7890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessNIT">NIT</Label>
                  <Input
                    id="businessNIT"
                    value={config.businessNIT}
                    onChange={(e) =>
                      handleChange("businessNIT", e.target.value)
                    }
                    placeholder="Ej: 123456789-0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de identificación tributaria
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyBase">Base Diaria de Caja</Label>{" "}
                  <InputNumber
                    id="dailyBase"
                    value={config.dailyBase}
                    onChange={(value) => handleChange("dailyBase", value)}
                    placeholder="500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cantidad de dinero con la que inicia la caja cada día
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reopenPassword">
                    Contraseña para Reabrir Caja
                  </Label>
                  <Input
                    id="reopenPassword"
                    type="password"
                    value={config.reopenPassword}
                    onChange={(e) =>
                      handleChange("reopenPassword", e.target.value)
                    }
                    placeholder="Ej: 1234"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contraseña para reabrir la caja después del cierre
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reports Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración de Reportes
                </CardTitle>
                <CardDescription>
                  Personaliza cómo se muestran los reportes estadísticos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topN">Número de productos en Top N</Label>
                  <InputNumber
                    id="topN"
                    value={config.topN}
                    onChange={(value) =>
                      handleChange("topN", Math.max(1, Math.min(50, value)))
                    }
                    min={1}
                    max={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Define cuántos productos mostrar en las listas de más/menos
                    vendidos (1-50)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}