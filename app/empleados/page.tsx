"use client";

import { InputNumber } from "@/components/ui/input-number";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  getActiveEmployees,
  saveEmployee,
  updateEmployee,
  deleteEmployee,
  getTodayEmployeePayments,
  saveEmployeePayment,
  hasDailyClosure,
  deleteEmployeePayment,
  getCurrentUser,
  checkPermission,
} from "@/lib/database";
import type { Employee, EmployeePayment } from "@/lib/types";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  DollarSign,
  Briefcase,
  Wallet,
  ShieldAlert,
  Banknote,
  CreditCard,
} from "lucide-react";

const POSITIONS = [
  "Mesero",
  "Cocinero",
  "Bar",
  "Cajero",
  "Administrador",
  "Limpieza",
  "Ayudante de Cocina",
];

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayPayments, setTodayPayments] = useState<EmployeePayment[]>([]);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [payingEmployee, setPayingEmployee] = useState<Employee | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deletePaymentEmployeeName, setDeletePaymentEmployeeName] =
    useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    position: POSITIONS[0],
    dailyPayBase: 0,
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: "",
    paymentMethod: "cash" as "cash" | "transfer",
    fromCashRegister: true,
  });

  useEffect(() => {
    initializeData();
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const initializeData = async () => {
    try {
      await loadData();
    } catch (error) {
      console.error("Error initializing data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  const loadData = async () => {
    try {
      const [employeesData, paymentsData] = await Promise.all([
        getActiveEmployees(),
        getTodayEmployeePayments(),
      ]);
      setEmployees(employeesData);
      setTodayPayments(paymentsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  const getPaymentForEmployee = (employeeId: string) => {
    return todayPayments.find((p) => p.employeeId === employeeId);
  };

  // Helper functions for permissions
  const isAdmin = () => checkPermission(["admin"]);
  const canManageEmployees = () => checkPermission(["admin"]);
  const canRegisterPayments = () => checkPermission(["admin", "cashier"]);
  const canDeletePayments = () => checkPermission(["admin"]);

  // Employee handlers
  const openEmployeeDialog = (employee?: Employee) => {
    if (!canManageEmployees()) {
      toast({
        title: "Permiso denegado",
        description: "Solo los administradores pueden gestionar empleados",
        variant: "destructive",
      });
      return;
    }

    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        name: employee.name,
        position: employee.position,
        dailyPayBase: employee.dailyPayBase,
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({
        name: "",
        position: POSITIONS[0],
        dailyPayBase: 300,
      });
    }
    setShowEmployeeDialog(true);
  };

  const handleSaveEmployee = async () => {
    if (!canManageEmployees()) {
      toast({
        title: "Permiso denegado",
        description: "Solo los administradores pueden gestionar empleados",
        variant: "destructive",
      });
      return;
    }

    if (!employeeForm.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del empleado es requerido",
        variant: "destructive",
      });
      return;
    }

    if (employeeForm.dailyPayBase < 0) {
      toast({
        title: "Error",
        description: "El pago base debe ser mayor o igual a 0",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeForm);
        toast({ title: "Empleado actualizado" });
      } else {
        await saveEmployee({ ...employeeForm, isActive: true });
        toast({ title: "Empleado registrado" });
      }

      setShowEmployeeDialog(false);
      await loadData();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el empleado",
        variant: "destructive",
      });
    }
  };

  // Payment handlers
  const openPaymentDialog = (employee: Employee) => {
    if (!canRegisterPayments()) {
      toast({
        title: "Permiso denegado",
        description: "No tienes permisos para registrar pagos",
        variant: "destructive",
      });
      return;
    }

    const existingPayment = getPaymentForEmployee(employee.id);
    if (existingPayment) {
      toast({
        title: "Pago ya registrado",
        description: `Ya se registro un pago de $${existingPayment.finalAmount.toLocaleString(
          "en-US",
          {
            maximumFractionDigits: 0,
          },
        )} para ${employee.name} hoy`,
        variant: "destructive",
      });
      return;
    }

    setPayingEmployee(employee);
    setPaymentForm({
      amount: employee.dailyPayBase,
      notes: "",
      paymentMethod: "cash",
      fromCashRegister: true,
    });
    setShowPaymentDialog(true);
  };

  const handleSavePayment = async () => {
    if (!payingEmployee || !canRegisterPayments()) return;

    try {
      const isClosed = await hasDailyClosure();
      if (isClosed) {
        toast({
          title: "Cierre de caja realizado",
          description:
            "No se pueden registrar pagos después del cierre de caja",
          variant: "destructive",
        });
        return;
      }

      if (paymentForm.amount < 0) {
        toast({
          title: "Error",
          description: "El monto del pago debe ser mayor o igual a 0",
          variant: "destructive",
        });
        return;
      }

      await saveEmployeePayment({
        employeeId: payingEmployee.id,
        employeeName: payingEmployee.name,
        position: payingEmployee.position,
        baseAmount: payingEmployee.dailyPayBase,
        finalAmount: paymentForm.amount,
        notes: paymentForm.notes,
        paymentMethod: paymentForm.paymentMethod, // Nueva propiedad
        fromCashRegister:
          paymentForm.paymentMethod === "cash"
            ? paymentForm.fromCashRegister
            : false, // Transferencia nunca sale de caja
      });

      toast({
        title: "Pago registrado",
        description: `Se registro un pago de $${paymentForm.amount.toLocaleString(
          "en-US",
          {
            maximumFractionDigits: 0,
          },
        )} para ${payingEmployee.name} ${paymentForm.fromCashRegister ? "(salió de caja)" : "(no salió de caja)"}`,
      });

      setShowPaymentDialog(false);
      await loadData();
    } catch (error) {
      console.error("Error saving payment:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      });
    }
  };

  // Delete handlers
  const openDeleteDialog = (id: string) => {
    if (!canManageEmployees()) {
      toast({
        title: "Permiso denegado",
        description: "Solo los administradores pueden eliminar empleados",
        variant: "destructive",
      });
      return;
    }

    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId || !canManageEmployees()) return;

    try {
      await deleteEmployee(deleteTargetId);
      toast({ title: "Empleado eliminado" });
      setShowDeleteDialog(false);
      await loadData();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el empleado",
        variant: "destructive",
      });
    }
  };

  const openDeletePaymentDialog = (paymentId: string, employeeName: string) => {
    if (!canDeletePayments()) {
      toast({
        title: "Permiso denegado",
        description: "Solo los administradores pueden eliminar pagos",
        variant: "destructive",
      });
      return;
    }

    setDeletePaymentId(paymentId);
    setDeletePaymentEmployeeName(employeeName);
    setShowDeletePaymentDialog(true);
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId || !canDeletePayments()) return;

    try {
      const isClosed = await hasDailyClosure();
      if (isClosed) {
        toast({
          title: "Caja cerrada",
          description: "No se pueden eliminar pagos después del cierre de caja",
          variant: "destructive",
        });
        return;
      }

      const success = await deleteEmployeePayment(deletePaymentId);

      if (success) {
        toast({
          title: "Pago eliminado",
          description: `El pago de ${deletePaymentEmployeeName} ha sido eliminado`,
        });
        setShowDeletePaymentDialog(false);
        await loadData();
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar el pago",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago",
        variant: "destructive",
      });
    }
  };

  // Calcular totales
  const totalPaymentsToday = todayPayments.reduce(
    (sum, p) => sum + p.finalAmount,
    0,
  );
  const paymentsFromCashRegister = todayPayments
    .filter((p) => p.fromCashRegister)
    .reduce((sum, p) => sum + p.finalAmount, 0);
  const paymentsNotFromCashRegister = todayPayments
    .filter((p) => !p.fromCashRegister)
    .reduce((sum, p) => sum + p.finalAmount, 0);

  // Si el usuario es empleado (sin acceso), mostrar mensaje
  if (currentUser?.role === "employee") {
    return (
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto flex flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Acceso restringido</h2>
            <p className="text-muted-foreground mb-6">
              Los empleados no tienen acceso a la gestión de empleados y pagos.
            </p>
            <Button onClick={() => (window.location.href = "/")}>
              Volver a Ventas
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
            <h1 className="text-2xl font-bold">Gestión de Empleados</h1>
            <p className="text-muted-foreground">
              {currentUser?.role === "cashier"
                ? "Registra pagos a empleados (Cajero)"
                : "Administra empleados y pagos (Administrador)"}
            </p>
          </div>

          {canManageEmployees() && (
            <Button onClick={() => openEmployeeDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Empleado
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Empleados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{employees.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pagos Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">
                  {todayPayments.length}
                </span>
                <span className="text-muted-foreground">
                  de {employees.length}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Wallet className="h-4 w-4 text-destructive" />
                De Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-destructive">
                  $
                  {paymentsFromCashRegister.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {todayPayments.filter((p) => p.fromCashRegister).length} pagos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pagado Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  $
                  {totalPaymentsToday.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                De caja: $
                {paymentsFromCashRegister.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Employees List */}
        <ScrollArea className="flex-1">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pr-4">
            {employees.map((employee) => {
              const payment = getPaymentForEmployee(employee.id);
              return (
                <Card key={employee.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{employee.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {employee.position}
                            </span>
                          </div>
                        </div>
                      </div>

                      {canManageEmployees() && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEmployeeDialog(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Pago base
                          </p>
                          <p className="font-semibold">
                            $
                            {employee.dailyPayBase.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        {payment ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className={`${payment.fromCashRegister ? "text-destructive border-destructive" : "text-muted-foreground border-muted-foreground"}`}
                            >
                              <div className="flex items-center gap-1">
                                {payment.fromCashRegister ? (
                                  <Wallet className="h-3 w-3" />
                                ) : (
                                  <DollarSign className="h-3 w-3" />
                                )}
                                <span>
                                  $
                                  {payment.finalAmount.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                            </Badge>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {payment.fromCashRegister
                                  ? "De caja"
                                  : "Fuera caja"}
                              </span>
                              {canDeletePayments() && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    openDeletePaymentDialog(
                                      payment.id,
                                      employee.name,
                                    )
                                  }
                                  title="Eliminar pago"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          canRegisterPayments() && (
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => openPaymentDialog(employee)}
                            >
                              <DollarSign className="h-4 w-4" />
                              Pagar
                            </Button>
                          )
                        )}
                      </div>
                      {payment?.notes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Nota: {payment.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Delete Payment Dialog */}
        <AlertDialog
          open={showDeletePaymentDialog}
          onOpenChange={setShowDeletePaymentDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el pago registrado para{" "}
                <span className="font-semibold">
                  {deletePaymentEmployeeName}
                </span>
                .
                <br />
                <span className="text-destructive font-medium">
                  Esta acción no se puede deshacer.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePayment}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar Pago
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Employee Dialog - Solo para admin */}
        <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="employeeName">Nombre Completo</Label>
                <Input
                  id="employeeName"
                  value={employeeForm.name}
                  onChange={(e) =>
                    setEmployeeForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Ej: Juan Perez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeePosition">Puesto</Label>
                <Select
                  value={employeeForm.position}
                  onValueChange={(value) =>
                    setEmployeeForm((prev) => ({ ...prev, position: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeePay">Pago Base</Label>
                <InputNumber
                  id="employeePay"
                  value={employeeForm.dailyPayBase}
                  onChange={(value) =>
                    setEmployeeForm((prev) => ({
                      ...prev,
                      dailyPayBase: value,
                    }))
                  }
                  placeholder="300"
                />
                <p className="text-xs text-muted-foreground">
                  Este es el monto base que se pagará. Se puede ajustar al
                  momento del pago.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEmployeeDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEmployee}>
                {editingEmployee ? "Guardar" : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog - Para admin y cajero */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 py-2">
                {payingEmployee && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-secondary/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">
                            {payingEmployee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {payingEmployee.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {payingEmployee.position}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Pago base: $
                            {payingEmployee.dailyPayBase.toLocaleString(
                              "en-US",
                              {
                                maximumFractionDigits: 0,
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentAmount">Monto a Pagar</Label>
                      <InputNumber
                        id="paymentAmount"
                        value={paymentForm.amount}
                        onChange={(value) =>
                          setPaymentForm((prev) => ({ ...prev, amount: value }))
                        }
                        className="text-lg"
                        placeholder="0"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Pago base: $
                          {payingEmployee.dailyPayBase.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        {paymentForm.amount !== payingEmployee.dailyPayBase && (
                          <span
                            className={
                              paymentForm.amount > payingEmployee.dailyPayBase
                                ? "text-success"
                                : "text-destructive"
                            }
                          >
                            {paymentForm.amount > payingEmployee.dailyPayBase
                              ? "+"
                              : ""}
                            $
                            {(
                              paymentForm.amount - payingEmployee.dailyPayBase
                            ).toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="space-y-2">
                      <Label>Método de Pago</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={
                            paymentForm.paymentMethod === "cash"
                              ? "default"
                              : "outline"
                          }
                          className="h-10"
                          onClick={() =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              paymentMethod: "cash",
                              fromCashRegister:
                                prev.paymentMethod === "cash"
                                  ? prev.fromCashRegister
                                  : true,
                            }))
                          }
                        >
                          <Banknote className="h-4 w-4 mr-2" />
                          Efectivo
                        </Button>
                        <Button
                          type="button"
                          variant={
                            paymentForm.paymentMethod === "transfer"
                              ? "default"
                              : "outline"
                          }
                          className="h-10"
                          onClick={() =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              paymentMethod: "transfer",
                              fromCashRegister: false,
                            }))
                          }
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Transferencia
                        </Button>
                      </div>
                    </div>

                    {/* Opción "Salir de Caja" solo para efectivo */}
                    {paymentForm.paymentMethod === "cash" && (
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            <Label>Salir de Caja</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {paymentForm.fromCashRegister
                              ? "Este pago se restará del dinero en caja"
                              : "Este pago se pagará por fuera de caja"}
                          </p>
                        </div>
                        <Switch
                          checked={paymentForm.fromCashRegister}
                          onCheckedChange={(checked) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              fromCashRegister: checked,
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Notas */}
                    <div className="space-y-2">
                      <Label htmlFor="paymentNotes">Notas (opcional)</Label>
                      <Textarea
                        id="paymentNotes"
                        value={paymentForm.notes}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Ej: Horas extra, bonificación, descuento por llegada tarde..."
                        rows={3}
                      />
                    </div>

                    {/* Resumen del Pago */}
                    <div className="rounded-lg bg-primary/5 p-4 space-y-2">
                      <p className="text-sm font-medium">Resumen del Pago</p>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Monto:
                        </span>
                        <span className="font-semibold">
                          $
                          {paymentForm.amount.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Método:
                        </span>
                        <span className="font-medium">
                          {paymentForm.paymentMethod === "cash"
                            ? "Efectivo"
                            : "Transferencia"}
                        </span>
                      </div>

                      {paymentForm.paymentMethod === "cash" && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Salir de caja:
                          </span>
                          <span
                            className={`font-medium ${paymentForm.fromCashRegister ? "text-destructive" : "text-success"}`}
                          >
                            {paymentForm.fromCashRegister ? "SÍ" : "NO"}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        {paymentForm.paymentMethod === "cash" &&
                        paymentForm.fromCashRegister
                          ? "⚠️ Este pago se restará del dinero disponible en caja al final del día"
                          : paymentForm.paymentMethod === "cash" &&
                              !paymentForm.fromCashRegister
                            ? "✅ Este pago no afectará el dinero en caja (pago externo)"
                            : "✅ Transferencia: no afecta el dinero en caja"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePayment}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                Registrar Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog - Solo para admin */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Eliminacion</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estas seguro de eliminar este empleado? Esta accion no se puede
                deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
