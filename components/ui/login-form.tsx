// components/ui/login-form.tsx (actualizado)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { verifyLogin, updateLastLogin } from "@/lib/database";
import { Lock, User, AlertCircle, Building2, Eye, EyeOff } from "lucide-react";
import { PiCatDuotone } from "react-icons/pi";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa usuario y contraseña",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Verificar credenciales con Supabase
      const user = await verifyLogin(username, password);
      
      if (user) {
        // Actualizar último login en la base de datos
        await updateLastLogin(user.id);
        
        // Guardar en localStorage
        localStorage.setItem("pos_user", JSON.stringify({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          loggedIn: true,
          timestamp: new Date().toISOString()
        }));
        
        toast({
          title: "¡Bienvenido!",
          description: `Hola ${user.name}, has iniciado sesión correctamente`,
        });
        
        // Redirigir a la página principal
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      } else {
        toast({
          title: "Credenciales incorrectas",
          description: "El usuario o contraseña no son válidos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error del sistema",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-4">
          <PiCatDuotone className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Tabby POS</h1>
        <p className="text-gray-600 mt-2">Sistema de Punto de Venta para Restaurantes</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-gray-200">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl text-center font-bold text-gray-800">
            Iniciar Sesión
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="username" className="text-gray-700">Usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="nombre.usuario"
                  className="pl-11 h-12 text-base border-gray-300 focus:border-primary"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-11 pr-11 h-12 text-base border-gray-300 focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verificando credenciales...
                </>
              ) : (
                "Acceder al sistema"
              )}
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Autenticación segura con Supabase
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Tabby POS. Base de datos: Supabase
        </p>
      </div>
    </div>
  );
}
