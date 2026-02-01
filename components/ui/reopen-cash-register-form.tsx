"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { reopenCashRegister } from "@/lib/database";
import { Lock, Eye, EyeOff } from "lucide-react";

interface ReopenCashRegisterFormProps {
  onReopen: () => void;
}

export function ReopenCashRegisterForm({
  onReopen,
}: ReopenCashRegisterFormProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleReopen = () => {
    if (!password.trim()) {
      toast({
        title: "Contraseña requerida",
        description: "Ingresa la contraseña para reabrir la caja",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const success = reopenCashRegister(password);

      if (success) {
        toast({
          title: "Caja reabierta exitosamente",
          description:
            "Ya puedes registrar nuevas transacciones y volver a cerrar la caja",
        });
        setPassword("");
        onReopen();
      } else {
        toast({
          title: "Contraseña incorrecta",
          description: "La contraseña ingresada no es válida",
          variant: "destructive",
        });
      }

      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reopen-password">Contraseña de Reapertura</Label>
        <div className="relative">
          <Input
            id="reopen-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa la contraseña de configuración"
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Esta contraseña se configura en Configuración del Sistema
        </p>
      </div>

      <Button
        onClick={handleReopen}
        disabled={isLoading || !password.trim()}
        className="w-full gap-2 bg-warning text-warning-foreground hover:bg-warning/90"
      >
        <Lock className="h-4 w-4" />
        {isLoading ? "Verificando..." : "Reabrir Caja"}
      </Button>

      <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
        <p className="text-sm text-warning-foreground font-medium">
          ⚠️ Advertencia
        </p>
        <p className="text-xs text-warning-foreground/80 mt-1">
          Reabrir la caja después del cierre puede afectar los reportes del día.
          Usa esta función solo si es estrictamente necesario.
        </p>
      </div>
    </div>
  );
}
