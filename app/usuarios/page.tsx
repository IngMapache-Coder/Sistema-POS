// app/usuarios/page.tsx
"use client";

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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, checkPermission } from "@/lib/database";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  UserPlus,
  Shield,
  Calendar,
} from "lucide-react";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "cashier", label: "Cajero" },
  { value: "employee", label: "Empleado" },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Form state
  const [userForm, setUserForm] = useState({
    username: "",
    name: "",
    role: "employee",
    password: "",
  });

  useEffect(() => {
    checkAuthorization();
    if (isAuthorized) {
      loadUsers();
    }
  }, [isAuthorized]);

  const checkAuthorization = () => {
    const hasPermission = checkPermission(["admin"]);
    setIsAuthorized(hasPermission);
    
    if (!hasPermission && isAuthorized === false) {
      toast({
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta sección",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    }
  };

  const openUserDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        name: user.name,
        role: user.role,
        password: "", // No mostrar contraseña actual por seguridad
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: "",
        name: "",
        role: "employee",
        password: "",
      });
    }
    setShowUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username.trim() || !userForm.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de usuario y nombre completo son requeridos",
        variant: "destructive",
      });
      return;
    }

    if (!editingUser && !userForm.password.trim()) {
      toast({
        title: "Error",
        description: "La contraseña es requerida para nuevos usuarios",
        variant: "destructive",
      });
      return;
    }

    try {
      const userData: any = {
        username: userForm.username,
        name: userForm.name,
        role: userForm.role,
        updated_at: new Date().toISOString(),
      };

      // Solo incluir password si se está creando un nuevo usuario o se cambió
      if (!editingUser || userForm.password.trim()) {
        userData.password_hash = userForm.password; // En producción, hash esta contraseña
      }

      if (editingUser) {
        const { error } = await supabase
          .from("users")
          .update(userData)
          .eq("id", editingUser.id);

        if (error) throw error;
        toast({ title: "Usuario actualizado" });
      } else {
        userData.is_active = true;
        const { error } = await supabase.from("users").insert(userData);
        if (error) throw error;
        toast({ title: "Usuario creado" });
      }

      setShowUserDialog(false);
      await loadUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      if (error.code === "23505") {
        toast({
          title: "Error",
          description: "El nombre de usuario ya existe",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo guardar el usuario",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      // En lugar de eliminar, desactivamos el usuario
      const { error } = await supabase
        .from("users")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", deleteUserId);

      if (error) throw error;

      toast({ title: "Usuario desactivado" });
      setShowDeleteDialog(false);
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "No se pudo desactivar el usuario",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-purple-100 text-purple-800 border-purple-200",
      cashier: "bg-blue-100 text-blue-800 border-blue-200",
      employee: "bg-green-100 text-green-800 border-green-200",
    };

    const labels: Record<string, string> = {
      admin: "Administrador",
      cashier: "Cajero",
      employee: "Empleado",
    };

    return (
      <Badge variant="outline" className={colors[role]}>
        {labels[role]}
      </Badge>
    );
  };

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Verificando permisos...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Acceso restringido</h2>
            <p className="text-muted-foreground mt-2">
              Solo los administradores pueden acceder a esta sección
            </p>
            <Button className="mt-4" onClick={() => (window.location.href = "/")}>
              Volver al inicio
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra los usuarios del sistema
            </p>
          </div>
          <Button onClick={() => openUserDialog()} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pr-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openUserDialog(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteUserId(user.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rol:</span>
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Último login:
                      </span>
                      <span className="text-sm">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString("es-MX")
                          : "Nunca"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Creado:
                      </span>
                      <span className="text-sm">
                        {new Date(user.created_at).toLocaleDateString("es-MX")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* User Dialog */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="ejemplo.usuario"
                  disabled={!!editingUser}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value) =>
                    setUserForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? "Nueva Contraseña (opcional)" : "Contraseña"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder={editingUser ? "Dejar en blanco para no cambiar" : "********"}
                />
                {editingUser && (
                  <p className="text-xs text-muted-foreground">
                    Solo completa este campo si deseas cambiar la contraseña
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUserDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveUser}>
                {editingUser ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Desactivación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de desactivar este usuario? 
                El usuario no podrá acceder al sistema pero sus datos se mantendrán.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desactivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}