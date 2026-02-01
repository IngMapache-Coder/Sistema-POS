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
  initializeSampleData,
  hasDailyClosure,
  deleteEmployeePayment,
} from "@/lib/database";
import type { Employee, EmployeePayment } from "@/lib/types";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  DollarSign,
  Briefcase,
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
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [payingEmployee, setPayingEmployee] = useState<Employee | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { toast } = useToast();
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deletePaymentEmployeeName, setDeletePaymentEmployeeName] =
    useState<string>("");

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    position: POSITIONS[0],
    dailyPayBase: 0,
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: "",
  });

  const openDeletePaymentDialog = (paymentId: string, employeeName: string) => {
    setDeletePaymentId(paymentId);
    setDeletePaymentEmployeeName(employeeName);
    setShowDeletePaymentDialog(true);
  };

  const handleDeletePayment = () => {
    if (!deletePaymentId) return;

    if (hasDailyClosure()) {
      toast({
        title: "Caja cerrada",
        description: "No se pueden eliminar pagos después del cierre de caja",
        variant: "destructive",
      });
      return;
    }

    const success = deleteEmployeePayment(deletePaymentId);

    if (success) {
      toast({
        title: "Pago eliminado",
        description: `El pago de ${deletePaymentEmployeeName} ha sido eliminado`,
      });
      setShowDeletePaymentDialog(false);
      loadData(); // Recargar datos
    } else {
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    initializeSampleData();
    loadData();
  }, []);

  const loadData = () => {
    setEmployees(getActiveEmployees());
    setTodayPayments(getTodayEmployeePayments());
  };

  const getPaymentForEmployee = (employeeId: string) => {
    return todayPayments.find((p) => p.employeeId === employeeId);
  };

  // Employee handlers
  const openEmployeeDialog = (employee?: Employee) => {
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

  const handleSaveEmployee = () => {
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

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, employeeForm);
      toast({ title: "Empleado actualizado" });
    } else {
      saveEmployee({ ...employeeForm, isActive: true });
      toast({ title: "Empleado registrado" });
    }

    setShowEmployeeDialog(false);
    loadData();
  };

  // Payment handlers
  const openPaymentDialog = (employee: Employee) => {
    const existingPayment = getPaymentForEmployee(employee.id);
    if (existingPayment) {
      toast({
        title: "Pago ya registrado",
        description: `Ya se registro un pago de $${existingPayment.finalAmount.toFixed(2)} para ${employee.name} hoy`,
        variant: "destructive",
      });
      return;
    }

    setPayingEmployee(employee);
    setPaymentForm({
      amount: employee.dailyPayBase,
      notes: "",
    });
    setShowPaymentDialog(true);
  };

  const handleSavePayment = () => {
    if (hasDailyClosure()) {
      toast({
        title: "Cierre de caja realizado",
        description: "No se pueden registrar pagos después del cierre de caja",
        variant: "destructive",
      });
      return;
    }
    if (!payingEmployee) return;

    if (paymentForm.amount < 0) {
      toast({
        title: "Error",
        description: "El monto del pago debe ser mayor o igual a 0",
        variant: "destructive",
      });
      return;
    }

    saveEmployeePayment({
      employeeId: payingEmployee.id,
      employeeName: payingEmployee.name,
      position: payingEmployee.position,
      baseAmount: payingEmployee.dailyPayBase,
      finalAmount: paymentForm.amount,
      notes: paymentForm.notes,
    });

    toast({
      title: "Pago registrado",
      description: `Se registro un pago de $${paymentForm.amount.toFixed(2)} para ${payingEmployee.name}`,
    });

    setShowPaymentDialog(false);
    loadData();
  };

  // Delete handlers
  const openDeleteDialog = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deleteEmployee(deleteTargetId);
    toast({ title: "Empleado eliminado" });
    setShowDeleteDialog(false);
    loadData();
  };

  const totalPaymentsToday = todayPayments.reduce(
    (sum, p) => sum + p.finalAmount,
    0,
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gestion de Empleados</h1>
            <p className="text-muted-foreground">
              Administra empleados y pagos
            </p>
          </div>
          <Button onClick={() => openEmployeeDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Empleado
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pagado Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  ${totalPaymentsToday.toFixed(2)}
                </span>
              </div>
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
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Pago base
                          </p>
                          <p className="font-semibold">
                            ${employee.dailyPayBase.toFixed(2)}
                          </p>
                        </div>
                        {payment ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-success border-success"
                            >
                              Pagado: ${payment.finalAmount.toFixed(2)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() =>
                                openDeletePaymentDialog(
                                  payment.id,
                                  employee.name,
                                )
                              }
                              title="Eliminar pago"
                              disabled={hasDailyClosure()} // NUEVO
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => openPaymentDialog(employee)}
                          >
                            <DollarSign className="h-4 w-4" />
                            Pagar
                          </Button>
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

        {/* Employee Dialog */}
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

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
            </DialogHeader>
            {payingEmployee && (
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {payingEmployee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{payingEmployee.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {payingEmployee.position}
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
                    placeholder="0.00"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Pago base: ${payingEmployee.dailyPayBase.toFixed(2)}
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
                        ).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

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
                    placeholder="Ej: Horas extra, bonificacion, descuento por llegada tarde..."
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
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

        {/* Delete Confirmation Dialog */}
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
