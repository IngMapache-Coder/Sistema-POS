// components/layout/auth-guard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoginForm } from "@/components/ui/login-form";
import { Building2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      setIsChecking(true);
      const userData = localStorage.getItem("pos_user");
      
      if (!userData) {
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }
      
      try {
        const user = JSON.parse(userData);
        
        // Verificar que no haya expirado (8 horas)
        const loginTime = new Date(user.timestamp).getTime();
        const currentTime = new Date().getTime();
        const hoursDiff = (currentTime - loginTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 8) {
          localStorage.removeItem("pos_user");
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch {
        localStorage.removeItem("pos_user");
        setIsAuthenticated(false);
      }
      
      setIsChecking(false);
    };

    checkAuth();
    
    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pathname]);

  // Mostrar loading mientras verifica
  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <Building2 className="h-8 w-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-lg font-medium text-gray-700">Verificando sesión</p>
          <p className="mt-2 text-sm text-gray-500">Cargando sistema POS...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado y no está en login, mostrar login
  if (!isAuthenticated && pathname !== "/login") {
    return <LoginForm />;
  }

  // Si está en login y ya está autenticado, redirigir a home
  if (isAuthenticated && pathname === "/login") {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}