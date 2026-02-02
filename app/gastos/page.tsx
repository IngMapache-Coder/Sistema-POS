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
} from "lucide-react";

const EXPENSE_CATEGORIES = [
  "Surtido/Insumos",
  "Limpieza",
  "Mantenimiento",
  "Servicios",
  "Transporte",
  "Otros",
];

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
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allData, todayData] = await Promise.all([
        getExpenses(),
        getTodayExpenses()
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
    });
    setShowExpenseDialog(true);
  };

  const handleSaveExpense = async () => {
    try {
      const isClosed = await hasDailyClosure();
      if (isClosed) {
        toast({
          title: "Cierre de caja realizado",
          description: "No se pueden registrar gastos después del cierre de caja",
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

      const savedExpense = await saveExpense(expenseForm);
      
      if (savedExpense) {
        toast({
          title: "Gasto registrado",
          description: `Se registro un gasto de $${expenseForm.amount.toFixed(2)} para ${expenseForm.description}`,
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

  const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAll = allExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Surtido/Insumos":
        return <ShoppingBag className="h-4 w-4" />;
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  ${totalToday.toFixed(2)}
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
                Total Historico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  ${totalAll.toFixed(2)}
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
                Categoria Principal Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayExpenses.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {Object.entries(
                      todayExpenses.reduce(
                        (acc, e) => {
                          acc[e.category] = (acc[e.category] || 0) + e.amount;
                          return acc;
                        },
                        {} as Record<string, number>,
                      ),
                    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Categoria con mas gastos
                  </p>
                </>
              ) : (
                <div className="text-muted-foreground">Sin gastos hoy</div>
              )}
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
                          -${expense.amount.toFixed(2)}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Gasto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expenseDescription">Descripcion</Label>
                <Input
                  id="expenseDescription"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Ej: Compra de platanos, limones, gaseosas..."
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
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseCategory">Categoria</Label>
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
            </div>
            <DialogFooter>
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
              <AlertDialogTitle>Confirmar Eliminacion</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estas seguro de eliminar este gasto? Esta accion no se puede
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