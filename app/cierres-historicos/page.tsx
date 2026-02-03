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
import { getDailyClosures, getConfig } from "@/lib/database";
import type { DailyClosure } from "@/lib/types";
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
} from "lucide-react";

export default function CierresHistoricosPage() {
  const [closures, setClosures] = useState<DailyClosure[]>([]);
  const [filteredClosures, setFilteredClosures] = useState<DailyClosure[]>([]);
  const [selectedClosure, setSelectedClosure] = useState<DailyClosure | null>(
    null,
  );
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [config, setConfig] = useState<any>({ dailyBase: 0 });
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
  // Añade esta función dentro de tu componente CierresHistoricosPage
  const printClosureReport = (closure: DailyClosure) => {
    const printWindow = window.open("", "_blank", "width=400,height=800");
    if (!printWindow) return;

    const printDate = new Date(closure.date + "T00:00:00").toLocaleDateString(
      "es-MX",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    // Calcular resumen de productos vendidos
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

    // Calcular pagos de caja y fuera de caja
    const paymentsFromCashRegister = closure.employeePayments
      .filter((p) => p.fromCashRegister)
      .reduce((sum, p) => sum + p.finalAmount, 0);

    const paymentsNotFromCashRegister = closure.employeePayments
      .filter((p) => !p.fromCashRegister)
      .reduce((sum, p) => sum + p.finalAmount, 0);

    // Calcular dinero esperado en caja
    const expectedCashInRegister =
      closure.totalCash + closure.dailyBase - paymentsFromCashRegister;

    printWindow.document.write(`
    <html>
      <head>
        <title>Cierre de Caja - ${closure.date}</title>
        <style>
          body { 
            font-family: monospace; 
            font-size: 11px; 
            width: 280px; 
            margin: 0 auto; 
            padding: 10px; 
          }
          .header { 
            text-align: center; 
            margin-bottom: 15px; 
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
          }
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
          .section { 
            margin: 15px 0; 
          }
          .section-title { 
            font-weight: bold; 
            border-bottom: 1px dashed #000; 
            padding-bottom: 3px;
            margin-bottom: 8px;
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0; 
          }
          .sub-item { 
            display: flex; 
            justify-content: space-between; 
            margin: 1px 0 1px 15px; 
            font-size: 10px; 
            color: #555; 
          }
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
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 9px;
            color: #666;
            border-top: 1px dashed #000;
            padding-top: 8px;
          }
          .warning-text {
            color: #dc2626;
            font-size: 9px;
            font-style: italic;
            margin-top: 5px;
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
          <div class="business-info">${printDate}</div>
          <div class="business-info">Fecha: ${closure.date}</div>
          <div class="business-info">Hora: ${new Date(closure.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>

        <!-- Sección de productos vendidos -->
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
                    <span>$${p.total.toFixed(2)}</span>
                  </div>
                `,
                  )
                  .join("")
          }
          <div class="total-line">
            <div class="item"><span>TOTAL VENTAS</span><span>$${closure.totalSales.toFixed(2)}</span></div>
            <div class="item"><span>- Efectivo</span><span>$${closure.totalCash.toFixed(2)}</span></div>
            <div class="item"><span>- Transferencia</span><span>$${closure.totalTransfer.toFixed(2)}</span></div>
          </div>
        </div>

        <!-- Dinero en caja -->
        <div class="cash-register-section">
          <div class="section-title">DINERO EN CAJA</div>
          <div class="cash-register-item">
            <span>Base diaria:</span>
            <span>$${closure.dailyBase.toFixed(2)}</span>
          </div>
          <div class="cash-register-item">
            <span>+ Ventas efectivo:</span>
            <span>+$${closure.totalCash.toFixed(2)}</span>
          </div>
          <div class="cash-register-item">
            <span>- Pagos empleados (de caja):</span>
            <span>-$${paymentsFromCashRegister.toFixed(2)}</span>
          </div>
          <div class="total-line">
            <div class="item"><span>TOTAL ESPERADO EN CAJA</span><span>$${expectedCashInRegister.toFixed(2)}</span></div>
          </div>
          <div class="warning-text">
            Esta cantidad debe estar físicamente en caja
          </div>
        </div>

        <!-- Gastos -->
        <div class="section">
          <div class="section-title">GASTOS</div>
          ${
            closure.expenses.length === 0
              ? "<div>Sin gastos registrados</div>"
              : closure.expenses
                  .map(
                    (e) => `
                  <div class="item">
                    <span>${e.description} ${e.category ? `(${e.category})` : ""}</span>
                    <span>-$${e.amount.toFixed(2)}</span>
                  </div>
                `,
                  )
                  .join("")
          }
          <div class="total-line">
            <div class="item"><span>TOTAL GASTOS</span><span>-$${closure.totalExpenses.toFixed(2)}</span></div>
          </div>
        </div>

        <!-- Pagos a empleados -->
        <div class="section">
          <div class="section-title">PAGOS A EMPLEADOS</div>
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
                    <span>-$${p.finalAmount.toFixed(2)}</span>
                  </div>
                  ${p.notes ? `<div class="sub-item">Nota: ${p.notes}</div>` : ""}
                `,
                  )
                  .join("")
          }
          <div class="total-line">
            <div class="item"><span>PAGOS (de caja)</span><span>-$${paymentsFromCashRegister.toFixed(2)}</span></div>
            <div class="item"><span>PAGOS (fuera de caja)</span><span>-$${paymentsNotFromCashRegister.toFixed(2)}</span></div>
            <div class="item"><span>TOTAL PAGOS</span><span>-$${closure.totalPayments.toFixed(2)}</span></div>
          </div>
        </div>

        <!-- Productos con stock bajo -->
        ${
          closure.lowStockProducts.length > 0
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
              <div class="sub-item">
                <span>Sugerido ordenar:</span>
                <span>${product.suggestedOrder} unidades</span>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }

        <div class="footer">
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
    const months = new Set<string>();
    closures.forEach((closure) => {
      const month = closure.date.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    return Array.from(months).sort().reverse();
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
      csv += `${closure.date},$${closure.totalSales.toFixed(2)},$${closure.totalCash.toFixed(2)},$${closure.totalTransfer.toFixed(2)},$${closure.totalExpenses.toFixed(2)},$${closure.totalPayments.toFixed(2)},$${closure.dailyBase.toFixed(2)},$${netIncome.toFixed(2)}\n`;
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
          <Button variant="outline" className="gap-2" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>

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
                              ${closure.totalSales.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {closure.sales.length} ventas
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-green-600" />$
                              {closure.totalCash.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Wallet className="h-3 w-3 text-blue-600" />$
                              {closure.totalTransfer.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-destructive">
                              -${closure.totalExpenses.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {closure.expenses.length} gastos
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-destructive">
                              -${closure.totalPayments.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {closure.employeePayments.length} pagos
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              ${cashExpected.toFixed(2)}
                            </div>
                            <div className="text-xs">
                              Base: ${closure.dailyBase.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
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
                            ${selectedClosure.totalSales.toFixed(2)}
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
                            ${selectedClosure.totalCash.toFixed(2)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Transferencia
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            ${selectedClosure.totalTransfer.toFixed(2)}
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
                            ).toFixed(2)}
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
                            ${selectedClosure.dailyBase.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-green-50">
                          <span className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />+
                            Ventas en efectivo
                          </span>
                          <span className="font-semibold text-green-600">
                            +${selectedClosure.totalCash.toFixed(2)}
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
                              .toFixed(2)}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center p-4 rounded-lg bg-success/20 border border-success/30">
                          <span className="font-bold text-lg">
                            Total esperado en caja
                          </span>
                          <span className="text-2xl font-bold text-success">
                            ${calculateCashExpected(selectedClosure).toFixed(2)}
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
                                  ${sale.total.toFixed(2)}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  Efectivo: ${sale.cashAmount.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Transfer: ${sale.transferAmount.toFixed(2)}
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
                                  -${expense.amount.toFixed(2)}
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
                                  -${payment.finalAmount.toFixed(2)}
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
              <Button
                variant="outline"
                onClick={() => setShowDetailDialog(false)}
              >
                Cerrar
              </Button>
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
      </main>
    </div>
  );
}
