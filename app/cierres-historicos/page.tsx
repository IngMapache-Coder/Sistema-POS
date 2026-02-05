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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  getDailyClosures,
  getConfig,
  getMonthlySales,
  getMonthlyExpenses,
  getMonthlyEmployeePayments,
} from "@/lib/database";
import type { DailyClosure, Sale, Expense, EmployeePayment } from "@/lib/types";
import {
  Calendar,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileSpreadsheet,
  Printer,
  FileText,
  CalendarDays,
  Banknote,
  CreditCard,
  Users,
  BarChart,
  Package,
} from "lucide-react";

export default function CierresHistoricosPage() {
  const [closures, setClosures] = useState<DailyClosure[]>([]);
  const [filteredClosures, setFilteredClosures] = useState<DailyClosure[]>([]);
  const [selectedClosure, setSelectedClosure] = useState<DailyClosure | null>(
    null,
  );
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showMonthlyReportDialog, setShowMonthlyReportDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [config, setConfig] = useState<any>({ dailyBase: 0 });
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7), // YYYY-MM actual
  );
  const [monthlyData, setMonthlyData] = useState<{
    sales: Sale[];
    expenses: Expense[];
    payments: EmployeePayment[];
  }>({
    sales: [],
    expenses: [],
    payments: [],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterClosures();
  }, [closures, searchTerm, filterMonth]);

  const loadData = async () => {
    try {
      const [closuresData, configData] = await Promise.all([
        getDailyClosures(),
        getConfig(),
      ]);

      const sortedClosures = closuresData.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setClosures(sortedClosures);
      setConfig(configData);
    } catch (error) {
      console.error("Error loading closures:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los cierres históricos",
        variant: "destructive",
      });
    }
  };

  const loadMonthlyData = async (month: string) => {
    try {
      const [sales, expenses, payments] = await Promise.all([
        getMonthlySales(month),
        getMonthlyExpenses(month),
        getMonthlyEmployeePayments(month),
      ]);

      setMonthlyData({ sales, expenses, payments });
    } catch (error) {
      console.error("Error loading monthly data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos mensuales",
        variant: "destructive",
      });
    }
  };

  // Calcular resumen mensual
  const calculateMonthlySummary = () => {
    const { sales, expenses, payments } = monthlyData;

    // Totales de ventas
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const salesCash = sales.reduce((sum, s) => sum + s.cashAmount, 0);
    const salesTransfer = sales.reduce((sum, s) => sum + s.transferAmount, 0);

    // Totales de gastos
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expensesCash = expenses
      .filter((e) => e.paymentMethod === "cash")
      .reduce((sum, e) => sum + e.amount, 0);
    const expensesTransfer = expenses
      .filter((e) => e.paymentMethod === "transfer")
      .reduce((sum, e) => sum + e.amount, 0);

    // Totales de pagos
    const totalPayments = payments.reduce((sum, p) => sum + p.finalAmount, 0);
    const paymentsCash = payments
      .filter((p) => p.paymentMethod === "cash")
      .reduce((sum, p) => sum + p.finalAmount, 0);
    const paymentsTransfer = payments
      .filter((p) => p.paymentMethod === "transfer")
      .reduce((sum, p) => sum + p.finalAmount, 0);

    // Totales netos
    const totalCash = salesCash - expensesCash - paymentsCash;
    const totalTransfer = salesTransfer - expensesTransfer - paymentsTransfer;
    const netIncome = totalSales - totalExpenses - totalPayments;

    return {
      totalSales,
      salesCash,
      salesTransfer,
      totalExpenses,
      expensesCash,
      expensesTransfer,
      totalPayments,
      paymentsCash,
      paymentsTransfer,
      totalCash,
      totalTransfer,
      netIncome,
      daysCount: new Set(sales.map((s) => s.createdAt.split("T")[0])).size,
      salesCount: sales.length,
      expensesCount: expenses.length,
      paymentsCount: payments.length,
    };
  };

  const handleMonthlyReport = async () => {
    await loadMonthlyData(selectedMonth);
    setShowMonthlyReportDialog(true);
  };

  const printMonthlyReport = () => {
    const printWindow = window.open("", "_blank", "width=400,height=800");
    if (!printWindow) return;

    const summary = calculateMonthlySummary();
    const monthName = new Date(
      `${selectedMonth}-01T00:00:00`,
    ).toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte Mensual - ${selectedMonth}</title>
          <style>
            body { font-family: monospace; font-size: 11px; width: 280px; margin: 0 auto; padding: 10px; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .business-name {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .business-info {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 3px;
              color: #555;
            }
            .month-title {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
              text-align: center;
              background: #f5f5f5;
              padding: 5px;
              border-radius: 4px;
            }
            .section { margin: 15px 0; }
            .section-title { 
              font-weight: bold; 
              border-bottom: 1px solid #000; 
              padding-bottom: 3px;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .item { display: flex; justify-content: space-between; margin: 3px 0; }
            .sub-item { 
              display: flex; 
              justify-content: space-between; 
              margin: 1px 0 1px 15px; 
              font-size: 10px; 
              color: #555; 
              padding: 1px 0;
            }
            .total-line { 
              border-top: 1px solid #000; 
              margin-top: 5px; 
              padding-top: 5px; 
              font-weight: bold; 
            }
            .summary-box {
              background: #f5f5f5;
              padding: 10px;
              border-radius: 4px;
              margin: 15px 0;
              border: 1px dashed #000;
            }
            .summary-title {
              font-weight: bold;
              text-align: center;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .net-result {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin-top: 15px;
              padding: 10px;
              border: 2px solid #000;
              background: ${summary.netIncome >= 0 ? "#d1fae5" : "#fee2e2"};
            }
            .cash-badge {
              background: #d1fae5;
              color: #065f46;
              font-size: 9px;
              padding: 1px 4px;
              border-radius: 3px;
              margin-left: 5px;
            }
            .transfer-badge {
              background: #dbeafe;
              color: #1d4ed8;
              font-size: 9px;
              padding: 1px 4px;
              border-radius: 3px;
              margin-left: 5px;
            }
            .stats {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
              margin: 10px 0;
              font-size: 9px;
              color: #666;
            }
            .positive { color: #059669; }
            .negative { color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">${config.businessName || "RESTAURANTE"}</div>
            ${config.businessAddress ? `<div class="business-info">${config.businessAddress}</div>` : ""}
            ${config.businessPhone ? `<div class="business-info">Tel: ${config.businessPhone}</div>` : ""}
            ${config.businessNIT ? `<div class="business-nit">NIT: ${config.businessNIT}</div>` : ""}
            <div class="business-info">REPORTE MENSUAL</div>
          </div>

          <div class="month-title">
            ${monthName}
          </div>

          <div class="stats">
            <div>Días con ventas: ${summary.daysCount}</div>
            <div>Total ventas: ${summary.salesCount}</div>
            <div>Total gastos: ${summary.expensesCount}</div>
            <div>Total pagos: ${summary.paymentsCount}</div>
          </div>

          <!-- VENTAS -->
          <div class="section">
            <div class="section-title">VENTAS MENSUALES</div>
            <div class="item">
              <span>Total Ventas:</span>
              <span class="positive">$${summary.totalSales.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>Efectivo:</span>
              <span>$${summary.salesCash.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>Transferencia:</span>
              <span>$${summary.salesTransfer.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <!-- GASTOS -->
          <div class="section">
            <div class="section-title">GASTOS MENSUALES</div>
            <div class="item">
              <span>Total Gastos:</span>
              <span class="negative">-$${summary.totalExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>Efectivo:</span>
              <span>-$${summary.expensesCash.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>Transferencia:</span>
              <span>-$${summary.expensesTransfer.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <!-- PAGOS EMPLEADOS -->
          <div class="section">
            <div class="section-title">PAGOS EMPLEADOS</div>
            <div class="item">
              <span>Total Pagos:</span>
              <span class="negative">-$${summary.totalPayments.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>Efectivo:</span>
              <span>-$${summary.paymentsCash.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>Transferencia:</span>
              <span>-$${summary.paymentsTransfer.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <!-- RESUMEN POR MÉTODO DE PAGO -->
          <div class="summary-box">
            <div class="summary-title">RESUMEN POR MÉTODO DE PAGO</div>
            
            <div class="item">
              <span>EFECTIVO NETO:</span>
              <span class="${summary.totalCash >= 0 ? "positive" : "negative"}">
                ${summary.totalCash >= 0 ? "+" : "-"}$${Math.abs(summary.totalCash).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div class="sub-item">
              <span>• Ventas efectivo:</span>
              <span class="positive">+$${summary.salesCash.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>• Gastos efectivo:</span>
              <span class="negative">-$${summary.expensesCash.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>• Pagos efectivo:</span>
              <span class="negative">-$${summary.paymentsCash.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>

            <div class="item" style="margin-top: 8px;">
              <span>TRANSFERENCIA NETA:</span>
              <span class="${summary.totalTransfer >= 0 ? "positive" : "negative"}">
                ${summary.totalTransfer >= 0 ? "+" : "-"}$${Math.abs(summary.totalTransfer).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div class="sub-item">
              <span>• Ventas transferencia:</span>
              <span class="positive">+$${summary.salesTransfer.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>• Gastos transferencia:</span>
              <span class="negative">-$${summary.expensesTransfer.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="sub-item">
              <span>• Pagos transferencia:</span>
              <span class="negative">-$${summary.paymentsTransfer.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <!-- RESULTADO FINAL -->
          <div class="net-result">
            RESULTADO NETO MENSUAL<br>
            <span style="font-size: 20px;">
              ${summary.netIncome >= 0 ? "GANANCIA:" : "PÉRDIDA:"}
              $${Math.abs(summary.netIncome).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #666;">
            Reporte generado el ${new Date().toLocaleString("es-MX")}<br>
            Sistema POS Restaurante
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printClosureReport = (closure: DailyClosure) => {
    const printWindow = window.open("", "_blank", "width=400,height=800");
    if (!printWindow) return;

    const productSummary = closure.sales.reduce(
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

    const paymentsFromCashRegister = closure.employeePayments
      .filter((p) => p.fromCashRegister)
      .reduce((sum, p) => sum + p.finalAmount, 0);

    const paymentsNotFromCashRegister = closure.employeePayments
      .filter((p) => !p.fromCashRegister)
      .reduce((sum, p) => sum + p.finalAmount, 0);

    printWindow.document.write(`
    <html>
      <head>
        <title>Cierre de Caja - ${closure.date}</title>
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
          .excess-transfer {
            background: #d1fae5;
            color: #065f46;
            font-size: 9px;
            padding: 3px 6px;
            border-radius: 4px;
            margin-top: 5px;
            text-align: center;
            font-weight: bold;
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
          <div class="business-info">${closure.date}</div>
          <div class="business-info">Hora: ${new Date(closure.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        
        <div class="section">
          <div class="section-title">PRODUCTOS VENDIDOS</div>
          ${
            Object.keys(productSummary).length === 0
              ? "<div>Sin ventas registradas</div>"
              : Object.values(productSummary)
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
                  .join("")
          }
          <div class="total-line">
            <div class="item"><span>TOTAL VENTAS</span><span>$${closure.totalSales.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 0,
              },
            )}</span></div>
            <div class="item"><span>- Efectivo</span><span>$${closure.totalCash.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 0,
              },
            )}</span></div>
            <div class="item"><span>- Transferencia</span><span>$${closure.totalTransfer.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 0,
              },
            )}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">GASTOS</div>
          ${
            closure.expenses.length === 0
              ? "<div>Sin gastos registrados</div>"
              : closure.expenses
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
                  .join("")
          }
          <div class="total-line">
            <div class="item"><span>TOTAL GASTOS</span><span>-$${closure.totalExpenses.toLocaleString(
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
            closure.employeePayments.length === 0
              ? "<div>Sin pagos registrados</div>"
              : closure.employeePayments
                  .map(
                    (p) => `
                  <div class="item">
                    <span>${p.employeeName} ${
                      p.fromCashRegister
                        ? '<span class="from-cash-badge">DE CAJA</span>'
                        : '<span class="not-from-cash-badge">FUERA CAJA</span>'
                    }</span>
                    <span>-$${p.finalAmount.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}</span>
                  </div>
                `,
                  )
                  .join("")
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
            <div class="item"><span>TOTAL PAGOS</span><span>-$${closure.totalPayments.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 0,
              },
            )}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">RESUMEN FINANCIERO</div>
          <div class="item">
            <span>Ingresos totales:</span>
            <span>+$${closure.totalSales.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}</span>
          </div>
          <div class="item">
            <span>Gastos totales:</span>
            <span>-$${closure.totalExpenses.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}</span>
          </div>
          <div class="item">
            <span>Pagos totales:</span>
            <span>-$${closure.totalPayments.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}</span>
          </div>
          <div class="total-line">
            <div class="item">
              <span>GANANCIA NETA:</span>
              <span>$${(
                closure.totalSales -
                closure.totalExpenses -
                closure.totalPayments
              ).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}</span>
            </div>
          </div>
        </div>

        ${
          closure.lowStockProducts && closure.lowStockProducts.length > 0
            ? `
          <div class="section">
            <div class="section-title">PRODUCTOS CON STOCK BAJO</div>
            ${closure.lowStockProducts
              .map(
                (product) => `
              <div class="item">
                <span>${product.productName}</span>
                <span>${product.currentStock}/${product.minStock}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }

        <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #666;">
          Reporte generado el ${new Date().toLocaleString("es-MX")}<br>
          Sistema POS Restaurante
        </div>
      </body>
    </html>
  `);
    printWindow.document.close();
    printWindow.print();
  };

  const filterClosures = () => {
    let filtered = [...closures];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (closure) =>
          closure.date.includes(term) ||
          closure.id.toLowerCase().includes(term),
      );
    }

    // Filtrar por mes
    if (filterMonth !== "all") {
      filtered = filtered.filter((closure) =>
        closure.date.startsWith(filterMonth),
      );
    }

    setFilteredClosures(filtered);
    setCurrentPage(1); // Resetear a primera página cuando se filtra
  };

  const getAvailableMonths = () => {
    if (closures.length === 0) return [];

    // Agrupar por mes y contar cierres
    const monthCounts = closures.reduce(
      (acc, closure) => {
        if (closure && closure.date) {
          const month = closure.date.substring(0, 7);
          acc[month] = (acc[month] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Solo retornar meses que tengan al menos 1 cierre
    return Object.keys(monthCounts)
      .filter((month) => monthCounts[month] > 0)
      .sort((a, b) => b.localeCompare(a));
  };

  const handleViewClosure = (closure: DailyClosure) => {
    setSelectedClosure(closure);
    setShowDetailDialog(true);
  };

  const exportToExcel = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cierres_caja_historico_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Archivo exportado",
      description: "El historial de cierres se ha descargado como CSV",
    });
  };

  const generateCSV = () => {
    let csv = "HISTORIAL DE CIERRES DE CAJA\n";
    csv += `Generado: ${new Date().toLocaleString("es-MX")}\n\n`;
    csv +=
      "Fecha,Ventas Totales,Efectivo,Transferencia,Gastos,Pagos Empleados,Base Diaria,Resultado Neto\n";

    closures.forEach((closure) => {
      const netIncome =
        closure.totalSales - closure.totalExpenses - closure.totalPayments;
      csv += `${closure.date},$${closure.totalSales.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })},$${closure.totalCash.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })},$${closure.totalTransfer.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })},$${closure.totalExpenses.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })},$${closure.totalPayments.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })},$${closure.dailyBase.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })},$${netIncome.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })}\n`;
    });

    return csv;
  };

  // Paginación
  const totalPages = Math.ceil(filteredClosures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClosures = filteredClosures.slice(startIndex, endIndex);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-MX", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateCashExpected = (closure: DailyClosure) => {
    const paymentsFromCash = closure.employeePayments
      .filter((p) => p.fromCashRegister)
      .reduce((sum, p) => sum + p.finalAmount, 0);

    return closure.dailyBase + closure.totalCash - paymentsFromCash;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Cierres Históricos de Caja</h1>
            <p className="text-muted-foreground">
              Consulta e imprime cierres de caja de días anteriores
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button className="gap-2" onClick={handleMonthlyReport}>
              <BarChart className="h-4 w-4" />
              Reporte Mensual
            </Button>
          </div>
        </div>

        {/* Nueva sección para Reporte Mensual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Generar Reporte Mensual
            </CardTitle>
            <CardDescription>
              Selecciona un mes para generar un reporte consolidado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Seleccionar Mes</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMonths().map((month) => {
                      const [year, monthNum] = month.split("-");
                      const monthName = new Date(
                        parseInt(year),
                        parseInt(monthNum) - 1,
                        1,
                      ).toLocaleDateString("es-MX", {
                        month: "long",
                        year: "numeric",
                      });
                      return (
                        <SelectItem key={month} value={month}>
                          {monthName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full gap-2" onClick={handleMonthlyReport}>
                  <FileText className="h-4 w-4" />
                  Ver Reporte Mensual
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros y búsqueda */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Buscar por fecha
                </label>
                <Input
                  placeholder="Ej: 2024-01-15"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrar por mes
                </label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {getAvailableMonths().map((month) => {
                      const [year, monthNum] = month.split("-");
                      const monthName = new Date(
                        parseInt(year),
                        parseInt(monthNum) - 1,
                        1,
                      ).toLocaleDateString("es-MX", {
                        month: "long",
                        year: "numeric",
                      });
                      return (
                        <SelectItem key={month} value={month}>
                          {monthName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estadísticas</label>
                <div className="text-sm text-muted-foreground">
                  Mostrando {filteredClosures.length} de {closures.length}{" "}
                  cierres
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de cierres */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Historial de Cierres</CardTitle>
            <CardDescription>
              {filterMonth === "all"
                ? "Todos los cierres registrados en el sistema"
                : `Cierres de ${new Intl.DateTimeFormat("es-MX", {
                    month: "long",
                    year: "numeric",
                  }).format(new Date(`${filterMonth}-01T00:00:00`))}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Efectivo</TableHead>
                    <TableHead>Transferencia</TableHead>
                    <TableHead>Gastos</TableHead>
                    <TableHead>Pagos</TableHead>
                    <TableHead>Dinero en Caja</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentClosures.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {closures.length === 0
                          ? "No hay cierres de caja registrados"
                          : "No se encontraron cierres con los filtros aplicados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentClosures.map((closure) => {
                      const netIncome =
                        closure.totalSales -
                        closure.totalExpenses -
                        closure.totalPayments;
                      const cashExpected = calculateCashExpected(closure);

                      return (
                        <TableRow key={closure.id}>
                          <TableCell>
                            <div className="font-medium">
                              {formatDate(closure.date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(closure.createdAt).toLocaleTimeString(
                                "es-MX",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-success">
                              $
                              {closure.totalSales.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {closure.sales.length} ventas
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-green-600" />$
                              {closure.totalCash.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Wallet className="h-3 w-3 text-blue-600" />$
                              {closure.totalTransfer.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-destructive">
                              -$
                              {closure.totalExpenses.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {closure.expenses.length} gastos
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-destructive">
                              -$
                              {closure.totalPayments.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {closure.employeePayments.length} pagos
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              $
                              {cashExpected.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </div>
                            <div className="text-xs">
                              Base: $
                              {closure.dailyBase.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewClosure(closure)}
                                className="h-8 gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => printClosureReport(closure)}
                                className="h-8 gap-1"
                              >
                                <Printer className="h-3 w-3" />
                                Imprimir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} -{" "}
              {Math.min(endIndex, filteredClosures.length)} de{" "}
              {filteredClosures.length} cierres
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Diálogo de detalle */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Detalle del Cierre de Caja</DialogTitle>
              <DialogDescription>
                {selectedClosure && formatDate(selectedClosure.date)}
              </DialogDescription>
            </DialogHeader>

            {selectedClosure && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Resumen general */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumen General</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Ventas Totales
                          </p>
                          <p className="text-2xl font-bold text-success">
                            $
                            {selectedClosure.totalSales.toLocaleString(
                              "en-US",
                              {
                                maximumFractionDigits: 0,
                              },
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedClosure.sales.length} transacciones
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Efectivo
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            $
                            {selectedClosure.totalCash.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Transferencia
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            $
                            {selectedClosure.totalTransfer.toLocaleString(
                              "en-US",
                              {
                                maximumFractionDigits: 0,
                              },
                            )}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Resultado Neto
                          </p>
                          <p
                            className={`text-2xl font-bold ${
                              selectedClosure.totalSales -
                                selectedClosure.totalExpenses -
                                selectedClosure.totalPayments >=
                              0
                                ? "text-success"
                                : "text-destructive"
                            }`}
                          >
                            $
                            {(
                              selectedClosure.totalSales -
                              selectedClosure.totalExpenses -
                              selectedClosure.totalPayments
                            ).toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dinero en caja */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Dinero en Caja</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                          <span>Base diaria</span>
                          <span className="font-semibold">
                            $
                            {selectedClosure.dailyBase.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-green-50">
                          <span className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />+
                            Ventas en efectivo
                          </span>
                          <span className="font-semibold text-green-600">
                            +$
                            {selectedClosure.totalCash.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-red-50">
                          <span className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-600" />-
                            Pagos empleados (de caja)
                          </span>
                          <span className="font-semibold text-red-600">
                            -$
                            {selectedClosure.employeePayments
                              .filter((p) => p.fromCashRegister)
                              .reduce((sum, p) => sum + p.finalAmount, 0)
                              .toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center p-4 rounded-lg bg-success/20 border border-success/30">
                          <span className="font-bold text-lg">
                            Total esperado en caja
                          </span>
                          <span className="text-2xl font-bold text-success">
                            $
                            {calculateCashExpected(
                              selectedClosure,
                            ).toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ventas del día */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Ventas del Día ({selectedClosure.sales.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-60">
                        <div className="space-y-2">
                          {selectedClosure.sales.map((sale) => (
                            <div
                              key={sale.id}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">
                                    #{sale.id.slice(-6)}
                                  </span>
                                  <Badge variant="outline">
                                    {sale.paymentMethod === "cash"
                                      ? "Efectivo"
                                      : sale.paymentMethod === "transfer"
                                        ? "Transferencia"
                                        : "Mixto"}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(sale.createdAt).toLocaleTimeString(
                                    "es-MX",
                                  )}
                                </div>
                                <div className="text-xs mt-1">
                                  {sale.items.slice(0, 2).map((item) => (
                                    <div key={item.productId}>
                                      {item.quantity}x {item.productName}
                                    </div>
                                  ))}
                                  {sale.items.length > 2 && (
                                    <div>
                                      ... y {sale.items.length - 2} productos
                                      más
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold">
                                  $
                                  {sale.total.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  Efectivo: $
                                  {sale.cashAmount.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Transfer: $
                                  {sale.transferAmount.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Gastos y pagos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Gastos ({selectedClosure.expenses.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedClosure.expenses.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            Sin gastos
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {selectedClosure.expenses.map((expense) => (
                              <div
                                key={expense.id}
                                className="flex justify-between items-center py-2 border-b last:border-0"
                              >
                                <div>
                                  <span>{expense.description}</span>
                                  <Badge
                                    variant="outline"
                                    className="ml-2 text-xs"
                                  >
                                    {expense.category}
                                  </Badge>
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

                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Pagos Empleados (
                          {selectedClosure.employeePayments.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedClosure.employeePayments.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            Sin pagos
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {selectedClosure.employeePayments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex justify-between items-center py-2 border-b last:border-0"
                              >
                                <div>
                                  <span>{payment.employeeName}</span>
                                  <Badge
                                    variant={
                                      payment.fromCashRegister
                                        ? "destructive"
                                        : "outline"
                                    }
                                    className="ml-2 text-xs"
                                  >
                                    {payment.fromCashRegister
                                      ? "De caja"
                                      : "Fuera caja"}
                                  </Badge>
                                </div>
                                <span className="font-semibold text-destructive">
                                  -$
                                  {payment.finalAmount.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Productos con stock bajo */}
                  {selectedClosure.lowStockProducts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Productos con Stock Bajo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedClosure.lowStockProducts.map((product) => (
                            <div
                              key={product.productId}
                              className="p-3 rounded-lg border border-warning/20 bg-warning/5"
                            >
                              <div className="font-medium">
                                {product.productName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Stock:{" "}
                                <span className="text-destructive font-semibold">
                                  {product.currentStock}
                                </span>{" "}
                                / Mín: {product.minStock}
                              </div>
                              <div className="text-xs text-warning mt-1">
                                Sugerido: {product.suggestedOrder} unidades
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end gap-2 pt-4">
              {selectedClosure && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailDialog(false)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => printClosureReport(selectedClosure)}
                    className="gap-1"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Reporte Mensual */}
        <Dialog
          open={showMonthlyReportDialog}
          onOpenChange={setShowMonthlyReportDialog}
        >
          <DialogContent
            className="
  w-[96vw]
  max-w-275
  h-[94vh]
  flex flex-col
  px-4
"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Reporte Mensual
              </DialogTitle>
              <DialogDescription>
                {new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString(
                  "es-MX",
                  {
                    month: "long",
                    year: "numeric",
                  },
                )}
              </DialogDescription>
            </DialogHeader>

            {monthlyData && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Ventas Mensuales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-success" />
                        Ventas Mensuales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <Banknote className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Efectivo</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                              $
                              {monthlyData.sales
                                .reduce((sum, s) => sum + s.cashAmount, 0)
                                .toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {
                                monthlyData.sales.filter(
                                  (s) => s.cashAmount > 0,
                                ).length
                              }{" "}
                              ventas en efectivo
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Transferencia</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">
                              $
                              {monthlyData.sales
                                .reduce((sum, s) => sum + s.transferAmount, 0)
                                .toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {
                                monthlyData.sales.filter(
                                  (s) => s.transferAmount > 0,
                                ).length
                              }{" "}
                              ventas por transferencia
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">
                              Ventas totales:
                            </span>
                            <span className="text-xl font-bold text-success">
                              $
                              {monthlyData.sales
                                .reduce((sum, s) => sum + s.total, 0)
                                .toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gastos Mensuales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-destructive" />
                        Gastos Mensuales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <Banknote className="h-4 w-4 text-red-600" />
                              <span className="font-medium">Efectivo</span>
                            </div>
                            <p className="text-2xl font-bold text-destructive">
                              $
                              {monthlyData.expenses
                                .filter((e) => e.paymentMethod === "cash")
                                .reduce((sum, e) => sum + e.amount, 0)
                                .toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {
                                monthlyData.expenses.filter(
                                  (e) => e.paymentMethod === "cash",
                                ).length
                              }{" "}
                              gastos en efectivo
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">Transferencia</span>
                            </div>
                            <p className="text-2xl font-bold text-purple-600">
                              $
                              {monthlyData.expenses
                                .filter((e) => e.paymentMethod === "transfer")
                                .reduce((sum, e) => sum + e.amount, 0)
                                .toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {
                                monthlyData.expenses.filter(
                                  (e) => e.paymentMethod === "transfer",
                                ).length
                              }{" "}
                              gastos por transferencia
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">
                              Gastos totales:
                            </span>
                            <span className="text-xl font-bold text-destructive">
                              $
                              {monthlyData.expenses
                                .reduce((sum, e) => sum + e.amount, 0)
                                .toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pagos a Empleados */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-amber-600" />
                        Pagos a Empleados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <Banknote className="h-4 w-4 text-amber-600" />
                              <span className="font-medium">Efectivo</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-600">
                              $
                              {monthlyData.payments
                                .filter((p) => p.paymentMethod === "cash")
                                .reduce((sum, p) => sum + p.finalAmount, 0)
                                .toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {
                                monthlyData.payments.filter(
                                  (p) => p.paymentMethod === "cash",
                                ).length
                              }{" "}
                              pagos en efectivo
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-4 w-4 text-indigo-600" />
                              <span className="font-medium">Transferencia</span>
                            </div>
                            <p className="text-2xl font-bold text-indigo-600">
                              $
                              {monthlyData.payments
                                .filter((p) => p.paymentMethod === "transfer")
                                .reduce((sum, p) => sum + p.finalAmount, 0)
                                .toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {
                                monthlyData.payments.filter(
                                  (p) => p.paymentMethod === "transfer",
                                ).length
                              }{" "}
                              pagos por transferencia
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">
                              Pagos totales:
                            </span>
                            <span className="text-xl font-bold text-amber-600">
                              $
                              {monthlyData.payments
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

                  {/* Resumen Final */}
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Resumen Financiero Mensual
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const summary = calculateMonthlySummary();
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">
                                    Efectivo neto:
                                  </span>
                                  <span
                                    className={`text-lg font-bold ${summary.totalCash >= 0 ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {summary.totalCash >= 0 ? "+" : ""}$
                                    {summary.totalCash.toLocaleString("en-US", {
                                      maximumFractionDigits: 0,
                                    })}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">
                                    Transferencia neta:
                                  </span>
                                  <span
                                    className={`text-lg font-bold ${summary.totalTransfer >= 0 ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {summary.totalTransfer >= 0 ? "+" : ""}$
                                    {summary.totalTransfer.toLocaleString(
                                      "en-US",
                                      {
                                        maximumFractionDigits: 0,
                                      },
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">
                                      Resultado neto mensual
                                    </p>
                                    <p
                                      className={`text-3xl font-bold mt-2 ${summary.netIncome >= 0 ? "text-success" : "text-destructive"}`}
                                    >
                                      {summary.netIncome >= 0 ? "+" : ""}$
                                      {summary.netIncome.toLocaleString(
                                        "en-US",
                                        {
                                          maximumFractionDigits: 0,
                                        },
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {summary.netIncome >= 0
                                        ? "GANANCIA"
                                        : "PÉRDIDA"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowMonthlyReportDialog(false)}
              >
                Cerrar
              </Button>
              <Button onClick={printMonthlyReport} className="gap-1">
                <Printer className="h-4 w-4" />
                Imprimir Reporte
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
