"use client";

import { ReopenCashRegisterForm } from "@/components/ui/reopen-cash-register-form";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  getTodaySales,
  getTodayExpenses,
  getTodayEmployeePayments,
  getLowStockProducts,
  createDailyClosure,
  getDailyClosures,
  getConfig,
  hasDailyClosure,
} from "@/lib/database";
import type {
  Sale,
  Expense,
  EmployeePayment,
  DailyClosure,
  LowStockProduct,
} from "@/lib/types";
import {
  Calculator,
  Banknote,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  CheckCircle,
  Package,
  Wallet,
  DollarSign,
} from "lucide-react";

export default function CierrePage() {
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([]);
  const [todayPayments, setTodayPayments] = useState<EmployeePayment[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>(
    [],
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLowStockDialog, setShowLowStockDialog] = useState(false);
  const [todayClosure, setTodayClosure] = useState<DailyClosure | null>(null);
  const [config, setConfig] = useState<any>({ dailyBase: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        salesData,
        expensesData,
        paymentsData,
        lowStockData,
        closuresData,
        configData,
        closureExists,
      ] = await Promise.all([
        getTodaySales(),
        getTodayExpenses(),
        getTodayEmployeePayments(),
        getLowStockProducts(),
        getDailyClosures(),
        getConfig(),
        hasDailyClosure(),
      ]);

      setTodaySales(salesData);
      setTodayExpenses(expensesData);
      setTodayPayments(paymentsData);
      setLowStockProducts(lowStockData);
      setConfig(configData);

      const today = new Date().toISOString().split("T")[0];
      const existing = closuresData.find((c) => c.date === today);

      // Solo mostrar cierre si existe Y la caja está cerrada
      if (existing && closureExists) {
        setTodayClosure(existing);
      } else {
        setTodayClosure(null);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  // Calculate totals
  const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalCash = todaySales.reduce((sum, s) => sum + s.cashAmount, 0);
  const totalTransfer = todaySales.reduce(
    (sum, s) => sum + s.transferAmount,
    0,
  );
  const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPayments = todayPayments.reduce(
    (sum, p) => sum + p.finalAmount,
    0,
  );

  // Pagos que salieron de caja (nueva lógica)
  const paymentsFromCashRegister = todayPayments
    .filter((p) => p.paymentMethod === "cash" && p.fromCashRegister)
    .reduce((sum, p) => sum + p.finalAmount, 0);

  // Pagos que NO salieron de caja
  const paymentsNotFromCashRegister = todayPayments
    .filter((p) => !p.fromCashRegister)
    .reduce((sum, p) => sum + p.finalAmount, 0);

  const expensesFromCashRegister = todayExpenses
    .filter((e) => e.paymentMethod === "cash" && e.fromCashRegister)
    .reduce((sum, e) => sum + e.amount, 0);

  const expensesNotFromCashRegister = todayExpenses
    .filter(
      (e) =>
        e.paymentMethod === "transfer" ||
        (e.paymentMethod === "cash" && !e.fromCashRegister),
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const dailyBase = config.dailyBase || 0;

  // Dinero esperado en caja con nueva lógica
  const expectedCashInRegister =
    totalCash + dailyBase - paymentsFromCashRegister - expensesFromCashRegister;

  // Product summary
  const productSummary = todaySales.reduce(
    (acc, sale) => {
      sale.items.forEach((item) => {
        if (acc[item.productId]) {
          acc[item.productId].quantity += item.quantity;
          acc[item.productId].total += item.total;
        } else {
          acc[item.productId] = {
            name: item.productName,
            quantity: item.quantity,
            total: item.total,
          };
        }
      });
      return acc;
    },
    {} as Record<string, { name: string; quantity: number; total: number }>,
  );

  const handleCloseCash = async () => {
    try {
      const closure = await createDailyClosure();
      setTodayClosure(closure);
      setShowConfirmDialog(false);

      toast({
        title: "Cierre de caja completado",
        description: "El cierre se ha registrado correctamente",
      });

      if (lowStockProducts.length > 0) {
        setShowLowStockDialog(true);
      }
    } catch (error) {
      console.error("Error creating closure:", error);
      toast({
        title: "Error",
        description: "No se pudo completar el cierre de caja",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    const data = todayClosure || {
      date: new Date().toISOString().split("T")[0],
      sales: todaySales,
      totalSales,
      totalCash,
      totalTransfer,
      expenses: todayExpenses,
      totalExpenses,
      employeePayments: todayPayments,
      totalPayments,
      lowStockProducts,
      dailyBase,
    };

    // Create CSV content
    let csv = "CIERRE DE CAJA\n";
    csv += `Fecha:,${data.date}\n\n`;

    csv += "RESUMEN DE VENTAS\n";
    csv += "Producto,Cantidad,Total\n";
    Object.values(productSummary).forEach((p) => {
      csv += `${p.name},${p.quantity},$${p.total.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })}\n`;
    });
    csv += `\nTOTAL VENTAS,,$${totalSales.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}\n`;
    csv += `Efectivo,,$${totalCash.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}\n`;
    csv += `Transferencia,,$${totalTransfer.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}\n\n`;

    csv += "DINERO EN CAJA\n";
    csv += `Base diaria:,$${dailyBase.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}\n`;
    csv += `+ Ventas efectivo:,$${totalCash.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}\n`;
    csv += `- Pagos empleados (de caja):,$${paymentsFromCashRegister.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 0,
      },
    )}\n`;
    csv += `Total esperado en caja:,$${expectedCashInRegister.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 0,
      },
    )}\n\n`;

    csv += "GASTOS\n";
    csv += "Descripcion,Categoria,Monto\n";
    todayExpenses.forEach((e) => {
      csv += `${e.description},${e.category},$${e.amount.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 0,
        },
      )}\n`;
    });
    csv += `\nTOTAL GASTOS,,$${totalExpenses.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}\n\n`;

    csv += "PAGOS A EMPLEADOS\n";
    csv += "Empleado,Puesto,Monto,De Caja\n";
    todayPayments.forEach((p) => {
      csv += `${p.employeeName},${p.position},$${p.finalAmount.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 0,
        },
      )},${p.fromCashRegister ? "SÍ" : "NO"}\n`;
    });
    csv += `\nTOTAL PAGOS (de caja),,$${paymentsFromCashRegister.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 0,
      },
    )}\n`;
    csv += `TOTAL PAGOS (total),,$${totalPayments.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}\n\n`;

    // Download file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cierre_caja_${data.date}.csv`;
    link.click();

    toast({
      title: "Archivo exportado",
      description: "El reporte se ha descargado como CSV",
    });
  };

  const printReport = () => {
    const printWindow = window.open("", "_blank", "width=400,height=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cierre de Caja - ${new Date().toLocaleDateString("es-MX")}</title>
            <style>
              body { font-family: monospace; font-size: 11px; width: 280px; margin: 0 auto; padding: 10px; }
              .header { text-align: center; margin-bottom: 15px; }
            .business-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .business-info {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 3px;
              color: #555;
            }
            .business-nit {
              font-size: 14px;
              margin-bottom: 3px;
              color: #555;
              font-weight: bold;
            }
            .section { margin: 15px 0; }
            .section-title { 
              font-weight: bold; 
              border-bottom: 1px dashed #000; 
              padding-bottom: 3px;
              margin-bottom: 8px;
            }
            .item { display: flex; justify-content: space-between; margin: 3px 0; }
            .sub-item { display: flex; justify-content: space-between; margin: 1px 0 1px 15px; font-size: 10px; color: #555; }
            .total-line { 
              border-top: 1px dashed #000; 
              margin-top: 5px; 
              padding-top: 5px; 
              font-weight: bold; 
            }
            .cash-register-section {
              background: #f5f5f5;
              padding: 8px;
              border-radius: 4px;
              margin: 10px 0;
            }
            .cash-register-item {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .net-income { 
              font-size: 14px; 
              text-align: center; 
              margin-top: 15px; 
              padding: 10px; 
              border: 2px solid #000; 
            }
            .from-cash-badge {
              background: #fee2e2;
              color: #dc2626;
              font-size: 9px;
              padding: 1px 4px;
              border-radius: 3px;
              margin-left: 5px;
            }
            .not-from-cash-badge {
              background: #dbeafe;
              color: #1d4ed8;
              font-size: 9px;
              padding: 1px 4px;
              border-radius: 3px;
              margin-left: 5px;
            }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="business-name">${config.businessName || "RESTAURANTE"}</div>
            ${config.businessAddress ? `<div class="business-info">${config.businessAddress}</div>` : ""}
            ${config.businessPhone ? `<div class="business-info">Tel: ${config.businessPhone}</div>` : ""}
            ${config.businessNIT ? `<div class="business-nit">NIT: ${config.businessNIT}</div>` : ""}
            <div class="business-info">CIERRE DE CAJA</div>
            <div class="business-info">${new Date().toLocaleDateString("es-MX")}</div>
            </div>
            
            <div class="section">
              <div class="section-title">PRODUCTOS VENDIDOS</div>
              ${Object.values(productSummary)
                .map(
                  (p) => `
                <div class="item">
                  <span>${p.quantity}x ${p.name}</span>
                  <span>$${p.total.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}</span>
                </div>
              `,
                )
                .join("")}
              <div class="total-line">
                <div class="item"><span>TOTAL VENTAS</span><span>$${totalSales.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  },
                )}</span></div>
                <div class="item"><span>- Efectivo</span><span>$${totalCash.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  },
                )}</span></div>
                <div class="item"><span>- Transferencia</span><span>$${totalTransfer.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  },
                )}</span></div>
              </div>
            </div>

            <div class="cash-register-section">
              <div class="section-title">DINERO EN CAJA</div>
              <div class="cash-register-item">
                <span>Base diaria:</span>
                <span>$${dailyBase.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}</span>
              </div>
              <div class="cash-register-item">
                <span>+ Ventas efectivo:</span>
                <span>+$${totalCash.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}</span>
              </div>
              <div class="cash-register-item">
                <span>- Pagos empleados (de caja):</span>
                <span>-$${paymentsFromCashRegister.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}</span>
              </div>
              <div class="total-line">
                <div class="item"><span>TOTAL ESPERADO EN CAJA</span><span>$${expectedCashInRegister.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  },
                )}</span></div>
              </div>
              <div style="font-size: 9px; color: #666; margin-top: 5px;">
                Esta cantidad debe estar físicamente en caja
              </div>
            </div>

            <div class="section">
              <div class="section-title">GASTOS</div>
              ${
                todayExpenses
                  .map(
                    (e) => `
                <div class="item">
                  <span>${e.description}</span>
                  <span>-$${e.amount.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}</span>
                </div>
              `,
                  )
                  .join("") || "<div>Sin gastos registrados</div>"
              }
              <div class="total-line">
                <div class="item"><span>TOTAL GASTOS</span><span>-$${totalExpenses.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  },
                )}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">PAGOS EMPLEADOS</div>
              ${
                todayPayments
                  .map(
                    (p) => `
                <div class="item">
                  <span>${p.employeeName} ${p.fromCashRegister ? '<span class="from-cash-badge">DE CAJA</span>' : '<span class="not-from-cash-badge">FUERA CAJA</span>'}</span>
                  <span>-$${p.finalAmount.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}</span>
                </div>
              `,
                  )
                  .join("") || "<div>Sin pagos registrados</div>"
              }
              <div class="total-line">
                <div class="item"><span>PAGOS (de caja)</span><span>-$${paymentsFromCashRegister.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  },
                )}</span></div>
                <div class="item"><span>PAGOS (fuera de caja)</span><span>-$${paymentsNotFromCashRegister.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  },
                )}</span></div>
                <div class="item"><span>TOTAL PAGOS</span><span>-$${totalPayments.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  },
                )}</span></div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Cierre de Caja</h1>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {todayClosure ? (
            <Badge className="gap-2 py-2 px-4 text-base bg-success text-success-foreground">
              <CheckCircle className="h-5 w-5" />
              Cierre Completado
            </Badge>
          ) : (
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setShowConfirmDialog(true)}
            >
              <Calculator className="h-5 w-5" />
              Realizar Cierre
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Ventas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-success">
                    $
                    {totalSales.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {todaySales.length} transacciones
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-destructive">
                    -$
                    {totalExpenses.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <div className="flex justify-between">
                      <span>Efectivo de caja:</span>
                      <span className="text-destructive font-medium">
                        -$
                        {todayExpenses
                          .filter(
                            (e) =>
                              e.paymentMethod === "cash" && e.fromCashRegister,
                          )
                          .reduce((sum, e) => sum + e.amount, 0)
                          .toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efectivo fuera caja:</span>
                      <span>
                        -$
                        {todayExpenses
                          .filter(
                            (e) =>
                              e.paymentMethod === "cash" && !e.fromCashRegister,
                          )
                          .reduce((sum, e) => sum + e.amount, 0)
                          .toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transferencia:</span>
                      <span>
                        -$
                        {todayExpenses
                          .filter((e) => e.paymentMethod === "transfer")
                          .reduce((sum, e) => sum + e.amount, 0)
                          .toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Pagos Empleados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-destructive">
                      -$
                      {totalPayments.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Efectivo de caja:</span>
                        <span className="text-destructive font-medium">
                          -$
                          {todayPayments
                            .filter(
                              (p) =>
                                p.paymentMethod === "cash" &&
                                p.fromCashRegister,
                            )
                            .reduce((sum, p) => sum + p.finalAmount, 0)
                            .toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Efectivo fuera caja:</span>
                        <span>
                          -$
                          {todayPayments
                            .filter(
                              (p) =>
                                p.paymentMethod === "cash" &&
                                !p.fromCashRegister,
                            )
                            .reduce((sum, p) => sum + p.finalAmount, 0)
                            .toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transferencia:</span>
                        <span>
                          -$
                          {todayPayments
                            .filter((p) => p.paymentMethod === "transfer")
                            .reduce((sum, p) => sum + p.finalAmount, 0)
                            .toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-success">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Dinero en Caja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Base:
                      </span>
                      <span className="text-sm">
                        $
                        {dailyBase.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        + Ventas efectivo:
                      </span>
                      <span className="text-sm text-success">
                        $
                        {totalCash.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        - Pagos (de caja):
                      </span>
                      <span className="text-sm text-destructive">
                        -$
                        {paymentsFromCashRegister.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    {/* LÍNEA NUEVA - Gastos en efectivo de caja */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        - Gastos (de caja):
                      </span>
                      <span className="text-sm text-destructive">
                        -$
                        {expensesFromCashRegister.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total esperado:</span>
                      <span className="text-xl font-bold text-success">
                        $
                        {expectedCashInRegister.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Esta cantidad debe estar físicamente en caja al final del
                    día
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Desglose por Metodo de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                    <Banknote className="h-8 w-8 text-success" />
                    <div>
                      <p className="text-sm text-muted-foreground">Efectivo</p>
                      <p className="text-xl font-bold">
                        $
                        {totalCash.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                    <CreditCard className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Transferencia
                      </p>
                      <p className="text-xl font-bold">
                        $
                        {totalTransfer.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dinero en Caja Detallado */}
            <Card className="border-success">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <Wallet className="h-5 w-5" />
                  Control de Caja Detallado
                </CardTitle>
                <CardDescription>
                  Cálculo del dinero que debe estar físicamente en caja
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-success" />
                      <span>Base diaria inicial</span>
                    </div>
                    <span className="font-semibold">
                      $
                      {dailyBase.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span>+ Ventas en efectivo</span>
                    </div>
                    <span className="font-semibold text-success">
                      +$
                      {totalCash.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-destructive" />
                      <span>- Pagos empleados (de caja)</span>
                      <Badge
                        variant="outline"
                        className="text-xs bg-destructive/10"
                      >
                        {
                          todayPayments.filter(
                            (p) =>
                              p.paymentMethod === "cash" && p.fromCashRegister,
                          ).length
                        }{" "}
                        pagos
                      </Badge>
                    </div>
                    <span className="font-semibold text-destructive">
                      -$
                      {paymentsFromCashRegister.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  {/* LÍNEA NUEVA - Gastos en efectivo de caja */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span>- Gastos en efectivo (de caja)</span>
                      <Badge
                        variant="outline"
                        className="text-xs bg-destructive/10"
                      >
                        {
                          todayExpenses.filter(
                            (e) =>
                              e.paymentMethod === "cash" && e.fromCashRegister,
                          ).length
                        }{" "}
                        gastos
                      </Badge>
                    </div>
                    <span className="font-semibold text-destructive">
                      -$
                      {expensesFromCashRegister.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-4 rounded-lg bg-success/20 border border-success/30">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-success" />
                      <span className="font-bold text-lg">Total en caja</span>
                    </div>
                    <span className="text-2xl font-bold text-success">
                      $
                      {expectedCashInRegister.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>
                      💰 <strong>Nota importante:</strong> Este es el dinero que
                      debe estar físicamente en la caja registradora.
                    </p>
                    <p>
                      📝 Los pagos y gastos "fuera de caja" ($
                      {(
                        paymentsNotFromCashRegister +
                        expensesNotFromCashRegister
                      ).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                      ) no afectan este cálculo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Productos Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(productSummary).length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay ventas registradas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(productSummary)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([id, product]) => (
                        <div
                          key={id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {product.quantity}
                            </Badge>
                            <span>{product.name}</span>
                          </div>
                          <span className="font-semibold">
                            $
                            {product.total.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gastos del Dia</CardTitle>
              </CardHeader>
              <CardContent>
                {todayExpenses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay gastos registrados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {todayExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <span>{expense.description}</span>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {expense.category}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${expense.paymentMethod === "transfer" ? "bg-blue-100 text-blue-800 border-blue-200" : expense.fromCashRegister ? "bg-red-100 text-red-800 border-red-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}`}
                            >
                              {expense.paymentMethod === "transfer"
                                ? "Transferencia"
                                : expense.fromCashRegister
                                  ? "Efectivo (de caja)"
                                  : "Efectivo (fuera caja)"}
                            </Badge>
                          </div>
                        </div>
                        <span className="font-semibold text-destructive">
                          -$
                          {expense.amount.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pagos a Empleados</CardTitle>
              </CardHeader>
              <CardContent>
                {todayPayments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay pagos registrados
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todayPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {payment.employeeName}
                            </span>
                            <Badge
                              variant={
                                payment.fromCashRegister
                                  ? "destructive"
                                  : "outline"
                              }
                              className={
                                payment.fromCashRegister
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : ""
                              }
                            >
                              <div className="flex items-center gap-1">
                                {payment.fromCashRegister ? (
                                  <Wallet className="h-3 w-3" />
                                ) : null}
                                {payment.fromCashRegister
                                  ? "De caja"
                                  : "Fuera caja"}
                              </div>
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ({payment.position})
                            </span>
                          </div>
                          {payment.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Nota: {payment.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-destructive">
                            -$
                            {payment.finalAmount.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Base: $
                            {payment.baseAmount.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Resumen de pagos */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-3 w-3" />
                            <span>Total de caja:</span>
                          </div>
                        </div>
                        <span className="font-semibold text-destructive">
                          -$
                          {paymentsFromCashRegister.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3" />
                            <span>Total fuera caja:</span>
                          </div>
                        </div>
                        <span className="font-semibold">
                          -$
                          {paymentsNotFromCashRegister.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center font-bold">
                        <span>Total pagos:</span>
                        <span className="text-lg text-destructive">
                          -$
                          {totalPayments.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
              <Card className="border-warning">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-5 w-5" />
                    Productos con Stock Bajo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockProducts.map((product) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-warning" />
                          <span>{product.productName}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            Stock:{" "}
                            <span className="text-destructive font-semibold">
                              {product.currentStock}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              / Min: {product.minStock}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Sugerido ordenar: {product.suggestedOrder} unidades
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-4 pb-4">
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-transparent"
                onClick={exportToExcel}
              >
                <FileSpreadsheet className="h-5 w-5" />
                Exportar a Excel
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-transparent"
                onClick={printReport}
              >
                <Printer className="h-5 w-5" />
                Imprimir Reporte
              </Button>
            </div>

            {/* Reopen Cash Register Button */}
            {todayClosure && (
              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Reabrir Caja
                    </CardTitle>
                    <CardDescription>
                      Usa esta opción solo si necesitas registrar más
                      movimientos después del cierre
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReopenCashRegisterForm
                      onReopen={async () => {
                        setTodayClosure(null);
                        await loadData();
                        toast({
                          title: "Caja reabierta",
                          description:
                            "Ya puedes registrar ventas, gastos y pagos",
                        });
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Confirm Closure Dialog */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Cierre de Caja</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estas seguro de realizar el cierre de caja? Esta accion
                registrara todos los movimientos del dia.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Ventas:</span>
                  <span className="font-semibold text-success">
                    $
                    {totalSales.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo:</span>
                  <span className="font-semibold text-success">
                    $
                    {totalCash.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transferencia:</span>
                  <span className="font-semibold text-primary">
                    $
                    {totalTransfer.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos:</span>
                  <span className="font-semibold text-destructive">
                    -$
                    {totalExpenses.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pagos empleados (total):</span>
                  <span className="font-semibold text-destructive">
                    -$
                    {totalPayments.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pagos de caja:</span>
                  <span className="font-semibold text-destructive">
                    -$
                    {paymentsFromCashRegister.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Dinero esperado en caja:</span>
                  <span className="text-success">
                    $
                    {expectedCashInRegister.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseCash}>
                Confirmar Cierre
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Low Stock Dialog */}
        <Dialog open={showLowStockDialog} onOpenChange={setShowLowStockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Alerta de Stock Bajo
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                Los siguientes productos tienen stock bajo y necesitan ser
                reabastecidos:
              </p>
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20"
                  >
                    <span className="font-medium">{product.productName}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        Stock: {product.currentStock}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ordenar: {product.suggestedOrder} uds
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowLowStockDialog(false)}>
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
