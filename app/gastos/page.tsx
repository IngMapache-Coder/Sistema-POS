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
  getExpenses,
  getTodayExpenses,
  saveExpense,
  deleteExpense,
  hasDailyClosure,
} from "@/lib/database";
import type { Expense } from "@/lib/types";
import {
  Plus,
  Trash2,
  Wallet,
  ShoppingBag,
  Receipt,
  TrendingDown,
  Banknote,
  CreditCard,
  Brush,
  Wrench,
  Server,
  Truck,
} from "lucide-react";

const EXPENSE_CATEGORIES = [
  "Surtido/Insumos",
  "Limpieza",
  "Mantenimiento",
  "Servicios",
  "Transporte",
  "Otros",
];

// Agrega estas funciones dentro del componente GastosPage, después de las otras funciones

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Surtido/Insumos":
      return <ShoppingBag className="h-4 w-4" />;
    case "Limpieza":
      return <Brush className="h-4 w-4" />;
    case "Mantenimiento":
      return <Wrench className="h-4 w-4" />;
    case "Servicios":
      return <Server className="h-4 w-4" />;
    case "Transporte":
      return <Truck className="h-4 w-4" />;
    default:
      return <Receipt className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Surtido/Insumos":
      return "bg-orange-500/10 text-orange-600 border-orange-200";
    case "Limpieza":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "Mantenimiento":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    case "Servicios":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "Transporte":
      return "bg-green-500/10 text-green-600 border-green-200";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-200";
  }
};

export default function GastosPage() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([]);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"today" | "all">("today");
  const { toast } = useToast();

  // Form state
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: 0,
    category: EXPENSE_CATEGORIES[0],
    paymentMethod: "cash" as "cash" | "transfer",
    fromCashRegister: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allData, todayData] = await Promise.all([
        getExpenses(),
        getTodayExpenses(),
      ]);

      const sortedAllData = allData.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setAllExpenses(sortedAllData);
      setTodayExpenses(todayData);
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive",
      });
    }
  };

  const displayedExpenses = viewMode === "today" ? todayExpenses : allExpenses;

  const openExpenseDialog = () => {
    setExpenseForm({
      description: "",
      amount: 0,
      category: EXPENSE_CATEGORIES[0],
      paymentMethod: "cash",
      fromCashRegister: true,
    });
    setShowExpenseDialog(true);
  };

  const handleSaveExpense = async () => {
    try {
      const isClosed = await hasDailyClosure();
      if (isClosed) {
        toast({
          title: "Cierre de caja realizado",
          description:
            "No se pueden registrar gastos después del cierre de caja",
          variant: "destructive",
        });
        return;
      }

      if (!expenseForm.description.trim()) {
        toast({
          title: "Error",
          description: "La descripcion del gasto es requerida",
          variant: "destructive",
        });
        return;
      }

      if (expenseForm.amount <= 0) {
        toast({
          title: "Error",
          description: "El monto debe ser mayor a 0",
          variant: "destructive",
        });
        return;
      }

      // Ajustar fromCashRegister si es transferencia
      const expenseData = {
        ...expenseForm,
        fromCashRegister:
          expenseForm.paymentMethod === "cash"
            ? expenseForm.fromCashRegister
            : false,
      };

      const savedExpense = await saveExpense(expenseData);

      if (savedExpense) {
        const methodText =
          expenseData.paymentMethod === "cash"
            ? expenseData.fromCashRegister
              ? "Efectivo (de caja)"
              : "Efectivo (fuera caja)"
            : "Transferencia";

        toast({
          title: "Gasto registrado",
          description: `Se registro un gasto de $${expenseForm.amount.toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 0,
            },
          )} para ${expenseForm.description} (${methodText})`,
        });

        setShowExpenseDialog(false);
        await loadData();
      } else {
        toast({
          title: "Error",
          description: "No se pudo registrar el gasto",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el gasto",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const success = await deleteExpense(deleteTargetId);
      if (success) {
        toast({ title: "Gasto eliminado" });
        setShowDeleteDialog(false);
        await loadData();
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar el gasto",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto",
        variant: "destructive",
      });
    }
  };

  // Calcular totales
  const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAll = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesFromCashRegister = todayExpenses
    .filter((e) => e.paymentMethod === "cash" && e.fromCashRegister)
    .reduce((sum, e) => sum + e.amount, 0);

  const getPaymentMethodBadge = (expense: Expense) => {
    if (expense.paymentMethod === "transfer") {
      return (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800 border-blue-200"
        >
          <CreditCard className="h-3 w-3 mr-1" />
          Transferencia
        </Badge>
      );
    } else {
      return expense.fromCashRegister ? (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 border-red-200"
        >
          <Banknote className="h-3 w-3 mr-1" />
          Efectivo (de caja)
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="bg-yellow-100 text-yellow-800 border-yellow-200"
        >
          <Wallet className="h-3 w-3 mr-1" />
          Efectivo (fuera caja)
        </Badge>
      );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Registro de Gastos</h1>
            <p className="text-muted-foreground">
              Registra compras de insumos y otros gastos
            </p>
          </div>
          <Button onClick={openExpenseDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Gasto
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gastos Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">
                  $
                  {totalToday.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {todayExpenses.length} gasto
                {todayExpenses.length !== 1 ? "s" : ""} registrado
                {todayExpenses.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Efectivo de Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold text-destructive">
                  $
                  {expensesFromCashRegister.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Gastos que salen de caja
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  $
                  {totalAll.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {allExpenses.length} gasto{allExpenses.length !== 1 ? "s" : ""}{" "}
                en total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Por Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Efectivo:</span>
                  <span>
                    {
                      todayExpenses.filter((e) => e.paymentMethod === "cash")
                        .length
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transferencia:</span>
                  <span>
                    {
                      todayExpenses.filter(
                        (e) => e.paymentMethod === "transfer",
                      ).length
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("today")}
          >
            Hoy
          </Button>
          <Button
            variant={viewMode === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("all")}
          >
            Todos
          </Button>
        </div>

        {/* Expenses List */}
        <ScrollArea className="flex-1">
          {displayedExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Wallet className="h-12 w-12 mb-2 opacity-50" />
              <p>
                No hay gastos {viewMode === "today" ? "registrados hoy" : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {displayedExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                          {getCategoryIcon(expense.category)}
                        </div>
                        <div>
                          <h3 className="font-medium">{expense.description}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={getCategoryColor(expense.category)}
                            >
                              {expense.category}
                            </Badge>
                            {getPaymentMethodBadge(expense)}
                            <span className="text-xs text-muted-foreground">
                              {new Date(expense.createdAt).toLocaleString(
                                "es-MX",
                                {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-destructive">
                          -$
                          {expense.amount.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(expense.id)}
                          title="Eliminar gasto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Expense Dialog */}
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogContent className="sm:max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Registrar Gasto</DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="expenseDescription">Descripción</Label>
                  <Input
                    id="expenseDescription"
                    value={expenseForm.description}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Ej: Compra de plátanos, limones, gaseosas..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expenseAmount">Monto</Label>
                    <InputNumber
                      id="expenseAmount"
                      value={expenseForm.amount}
                      onChange={(value) =>
                        setExpenseForm((prev) => ({ ...prev, amount: value }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expenseCategory">Categoría</Label>
                    <Select
                      value={expenseForm.category}
                      onValueChange={(value) =>
                        setExpenseForm((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={
                        expenseForm.paymentMethod === "cash"
                          ? "default"
                          : "outline"
                      }
                      className="h-10"
                      onClick={() =>
                        setExpenseForm((prev) => ({
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
                        expenseForm.paymentMethod === "transfer"
                          ? "default"
                          : "outline"
                      }
                      className="h-10"
                      onClick={() =>
                        setExpenseForm((prev) => ({
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
                {expenseForm.paymentMethod === "cash" && (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <Label>Salir de Caja</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {expenseForm.fromCashRegister
                          ? "Este gasto se restará del dinero en caja"
                          : "Este gasto se pagará por fuera de caja"}
                      </p>
                    </div>
                    <Switch
                      checked={expenseForm.fromCashRegister}
                      onCheckedChange={(checked) =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          fromCashRegister: checked,
                        }))
                      }
                    />
                  </div>
                )}

                {/* Resumen del gasto */}
                <div className="rounded-lg bg-primary/5 p-4 space-y-2">
                  <p className="text-sm font-medium">Resumen del Gasto</p>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Monto:
                    </span>
                    <span className="font-semibold">
                      $
                      {expenseForm.amount.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Método:
                    </span>
                    <span className="font-medium">
                      {expenseForm.paymentMethod === "cash"
                        ? "Efectivo"
                        : "Transferencia"}
                    </span>
                  </div>
                  {expenseForm.paymentMethod === "cash" && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Salir de caja:
                      </span>
                      <span
                        className={`font-medium ${expenseForm.fromCashRegister ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {expenseForm.fromCashRegister ? "SÍ" : "NO"}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {expenseForm.paymentMethod === "cash" &&
                    expenseForm.fromCashRegister
                      ? "⚠️ Este gasto se restará del dinero disponible en caja al final del día"
                      : expenseForm.paymentMethod === "cash" &&
                          !expenseForm.fromCashRegister
                        ? "✅ Este gasto no afectará el dinero en caja"
                        : "✅ Transferencia: no afecta el dinero en caja"}
                  </p>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowExpenseDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveExpense}>Registrar Gasto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de eliminar este gasto? Esta acción no se puede
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
