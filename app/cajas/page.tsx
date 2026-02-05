"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { InputNumber } from "@/components/ui/input-number";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  getMajorCashAccounts,
  getMajorCashSummary,
  addMajorCashMovement,
  deleteMajorCashMovement,
  getTodaySales,
  getTodayExpenses,
  getTodayEmployeePayments,
  getConfig,
  getCurrentUser,
  checkPermission,
  getCurrentCashInRegister,
} from "@/lib/database";
import type { MajorCashAccount, MajorCashSummary } from "@/lib/types";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Banknote,
  CreditCard,
  Plus,
  Trash2,
  History,
  RefreshCw,
  Shield,
} from "lucide-react";

export default function CajasPage() {
  const [accounts, setAccounts] = useState<MajorCashAccount[]>([]);
  const [summary, setSummary] = useState<MajorCashSummary>({
    totalTransfers: 0,
    totalSavedCash: 0,
    totalMajorCash: 0,
    lastUpdate: new Date().toISOString(),
  });
  const [todaySales, setTodaySales] = useState<any[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<any[]>([]);
  const [todayPayments, setTodayPayments] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"all" | "transfer" | "saved_cash">("all");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cashInRegister, setCashInRegister] = useState<{
    dailyBase: number;
    cashSalesToday: number;
    cashExpensesToday: number;
    cashPaymentsToday: number;
    currentCash: number;
  }>({
    dailyBase: 0,
    cashSalesToday: 0,
    cashExpensesToday: 0,
    cashPaymentsToday: 0,
    currentCash: 0,
  });
  const { toast } = useToast();

  // Form state
  const [adjustForm, setAdjustForm] = useState({
    account: "transfer" as "transfer" | "saved_cash",
    type: "income" as "income" | "expense",
    amount: 0,
    description: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const loadData = async () => {
    try {
      const [
        accountsData,
        summaryData,
        salesData,
        expensesData,
        paymentsData,
        configData,
        cashInRegister,
      ] = await Promise.all([
        getMajorCashAccounts(),
        getMajorCashSummary(),
        getTodaySales(),
        getTodayExpenses(),
        getTodayEmployeePayments(),
        getConfig(),
        getCurrentCashInRegister(),
      ]);

      setAccounts(accountsData);
      setSummary(summaryData);
      setTodaySales(salesData);
      setTodayExpenses(expensesData);
      setTodayPayments(paymentsData);
      setConfig(configData);
      setCashInRegister(cashInRegister);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  const isAdmin = () => checkPermission(["admin"]);

  // Calcular totales automáticos de hoy
  const todayTransfersIncome = todaySales.reduce((sum, s) => sum + s.transferAmount, 0);
  const todayTransfersExpense = 
    todayExpenses.filter(e => e.paymentMethod === "transfer").reduce((sum, e) => sum + e.amount, 0) +
    todayPayments.filter(p => p.paymentMethod === "transfer").reduce((sum, p) => sum + p.finalAmount, 0);

  const todaySavedCashExpense = 
    todayExpenses.filter(e => e.paymentMethod === "cash" && !e.fromCashRegister).reduce((sum, e) => sum + e.amount, 0) +
    todayPayments.filter(p => p.paymentMethod === "cash" && !p.fromCashRegister).reduce((sum, p) => sum + p.finalAmount, 0);

  // Filtrar cuentas por tipo
  const filteredAccounts = viewType === "all" 
    ? accounts 
    : accounts.filter(a => a.type === viewType);

  const openAdjustDialog = () => {
    if (!isAdmin()) {
      toast({
        title: "Permiso denegado",
        description: "Solo los administradores pueden ajustar la caja mayor",
        variant: "destructive",
      });
      return;
    }

    setAdjustForm({
      account: "transfer",
      type: "income",
      amount: 0,
      description: "",
      notes: "",
    });
    setShowAdjustDialog(true);
  };

  const handleSaveAdjustment = async () => {
    if (!isAdmin()) return;

    if (!adjustForm.description.trim()) {
      toast({
        title: "Error",
        description: "La descripción es requerida",
        variant: "destructive",
      });
      return;
    }

    if (adjustForm.amount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const movement = await addMajorCashMovement({
        type: adjustForm.account,
        description: adjustForm.description,
        amount: adjustForm.amount,
        movementType: adjustForm.type,
        notes: adjustForm.notes,
        createdBy: currentUser?.name || "Admin",
      });

      if (movement) {
        const typeText = adjustForm.type === "income" ? "ingreso" : "egreso";
        const accountText = adjustForm.account === "transfer" ? "Transferencias" : "Efectivo Guardado";
        
        toast({
          title: "Ajuste registrado",
          description: `Se registró un ${typeText} de $${adjustForm.amount} en ${accountText}`,
        });

        setShowAdjustDialog(false);
        await loadData();
      }
    } catch (error) {
      console.error("Error saving adjustment:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el ajuste",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (id: string) => {
    if (!isAdmin()) return;
    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteMovement = async () => {
    if (!deleteTargetId || !isAdmin()) return;

    try {
      const success = await deleteMajorCashMovement(deleteTargetId);
      if (success) {
        toast({ title: "Movimiento eliminado" });
        setShowDeleteDialog(false);
        await loadData();
      }
    } catch (error) {
      console.error("Error deleting movement:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el movimiento",
        variant: "destructive",
      });
    }
  };

  const getMovementColor = (movementType: string) => {
    return movementType === "income" ? "text-success" : "text-destructive";
  };

  const getAccountLabel = (type: string) => {
    return type === "transfer" ? "Transferencias" : "Efectivo Guardado";
  };

  const getAccountIcon = (type: string) => {
    return type === "transfer" 
      ? <CreditCard className="h-4 w-4" />
      : <Banknote className="h-4 w-4" />;
  };

  // Si no es admin, mostrar mensaje de acceso denegado
  if (!isAdmin()) {
    return (
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto flex flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Acceso restringido</h2>
            <p className="text-muted-foreground mb-6">
              Solo los administradores pueden acceder a la gestión de cajas.
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
            <h1 className="text-2xl font-bold">Gestión de Cajas</h1>
            <p className="text-muted-foreground">
              Administra la caja mayor (transferencias y efectivo guardado)
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={loadData}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            <Button onClick={openAdjustDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajustar Caja
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Caja Menor */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Caja Menor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                $
                {cashInRegister.currentCash.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Dinero físico en caja
              </p>
            </CardContent>
          </Card>

          {/* Caja Mayor - Transferencias */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Transferencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.totalTransfers >= 0 ? "text-success" : "text-destructive"}`}>
                $
                {summary.totalTransfers.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </p>
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                <div className="flex justify-between">
                  <span>Hoy (+):</span>
                  <span className="text-success">$
                    {todayTransfersIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hoy (-):</span>
                  <span className="text-destructive">$
                    {todayTransfersExpense.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Caja Mayor - Efectivo Guardado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                Efectivo Guardado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.totalSavedCash >= 0 ? "text-success" : "text-destructive"}`}>
                $
                {summary.totalSavedCash.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </p>
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                <div className="flex justify-between">
                  <span>Hoy (-):</span>
                  <span className="text-destructive">$
                    {todaySavedCashExpense.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Caja Mayor:</span>
                  <span className="font-semibold">$
                    {summary.totalMajorCash.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para filtrar */}
        <Tabs defaultValue="all" className="mb-4">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setViewType("all")}>
              Todos los Movimientos
            </TabsTrigger>
            <TabsTrigger value="transfer" onClick={() => setViewType("transfer")}>
              <CreditCard className="h-4 w-4 mr-2" />
              Transferencias
            </TabsTrigger>
            <TabsTrigger value="saved_cash" onClick={() => setViewType("saved_cash")}>
              <Banknote className="h-4 w-4 mr-2" />
              Efectivo Guardado
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Lista de Movimientos */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
            <CardDescription>
              {filteredAccounts.length} movimientos registrados
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[calc(100vh-400px)]">
              {filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <History className="h-12 w-12 mb-2 opacity-50" />
                  <p>No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {filteredAccounts.map((account) => (
                    <Card key={account.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              account.movementType === "income" 
                                ? "bg-success/10" 
                                : "bg-destructive/10"
                            }`}>
                              {account.movementType === "income" 
                                ? <TrendingUp className="h-5 w-5 text-success" />
                                : <TrendingDown className="h-5 w-5 text-destructive" />
                              }
                            </div>
                            <div>
                              <h3 className="font-medium">{account.description}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="outline" 
                                  className="flex items-center gap-1"
                                >
                                  {getAccountIcon(account.type)}
                                  {getAccountLabel(account.type)}
                                </Badge>
                                <Badge 
                                  variant={account.movementType === "income" ? "default" : "destructive"}
                                >
                                  {account.movementType === "income" ? "INGRESO" : "EGRESO"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(account.createdAt).toLocaleString("es-MX")}
                                </span>
                              </div>
                              {account.notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Nota: {account.notes}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Registrado por: {account.createdBy}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xl font-bold ${getMovementColor(account.movementType)}`}>
                              {account.movementType === "income" ? "+" : "-"}$
                              {account.amount.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(account.id)}
                              title="Eliminar movimiento"
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
          </CardContent>
        </Card>

        {/* Ajust Dialog */}
        <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ajustar Caja Mayor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustAccount">Cuenta</Label>
                  <Select
                    value={adjustForm.account}
                    onValueChange={(value: "transfer" | "saved_cash") =>
                      setAdjustForm(prev => ({ ...prev, account: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Transferencias
                        </div>
                      </SelectItem>
                      <SelectItem value="saved_cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Efectivo Guardado
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustType">Tipo</Label>
                  <Select
                    value={adjustForm.type}
                    onValueChange={(value: "income" | "expense") =>
                      setAdjustForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">
                        <div className="flex items-center gap-2 text-success">
                          <TrendingUp className="h-4 w-4" />
                          Ingreso
                        </div>
                      </SelectItem>
                      <SelectItem value="expense">
                        <div className="flex items-center gap-2 text-destructive">
                          <TrendingDown className="h-4 w-4" />
                          Egreso
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustAmount">Monto</Label>
<InputNumber
  id="adjustAmount"
  value={adjustForm.amount}
  onChange={(value) =>
    setAdjustForm(prev => ({ 
      ...prev, 
      amount: value
    }))
  }
  allowDecimals={false}
  placeholder="0"
/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustDescription">Descripción</Label>
                <Input
                  id="adjustDescription"
                  value={adjustForm.description}
                  onChange={(e) =>
                    setAdjustForm(prev => ({ 
                      ...prev, 
                      description: e.target.value 
                    }))
                  }
                  placeholder="Ej: Depósito bancario, Retiro para compra, Ajuste manual..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustNotes">Notas (opcional)</Label>
                <Textarea
                  id="adjustNotes"
                  value={adjustForm.notes}
                  onChange={(e) =>
                    setAdjustForm(prev => ({ 
                      ...prev, 
                      notes: e.target.value 
                    }))
                  }
                  placeholder="Motivo del ajuste..."
                  rows={2}
                />
              </div>

              {/* Resumen */}
              <div className="rounded-lg bg-primary/5 p-4">
                <p className="text-sm font-medium mb-2">Resumen del Ajuste</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Cuenta:</span>
                    <span className="font-medium">
                      {adjustForm.account === "transfer" ? "Transferencias" : "Efectivo Guardado"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo:</span>
                    <span className={`font-medium ${adjustForm.type === "income" ? "text-success" : "text-destructive"}`}>
                      {adjustForm.type === "income" ? "Ingreso (+)" : "Egreso (-)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto:</span>
                    <span className={`font-bold ${adjustForm.type === "income" ? "text-success" : "text-destructive"}`}>
                      {adjustForm.type === "income" ? "+" : "-"}$
                      {adjustForm.amount.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAdjustDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveAdjustment}>
                Registrar Ajuste
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente este movimiento de la caja mayor.
                <br />
                <span className="text-destructive font-medium">
                  Esta acción no se puede deshacer.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMovement}
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
