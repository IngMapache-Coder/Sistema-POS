"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  getTodaySales,
  getTodayExpenses,
  getTodayEmployeePayments,
  getLowStockProducts,
  createDailyClosure,
  getDailyClosures,
} from "@/lib/database"
import type { Sale, Expense, EmployeePayment, DailyClosure, LowStockProduct } from "@/lib/types"
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
} from "lucide-react"

export default function CierrePage() {
  const [todaySales, setTodaySales] = useState<Sale[]>([])
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([])
  const [todayPayments, setTodayPayments] = useState<EmployeePayment[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showLowStockDialog, setShowLowStockDialog] = useState(false)
  const [todayClosure, setTodayClosure] = useState<DailyClosure | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setTodaySales(getTodaySales())
    setTodayExpenses(getTodayExpenses())
    setTodayPayments(getTodayEmployeePayments())
    setLowStockProducts(getLowStockProducts())

    // Check if today's closure already exists
    const closures = getDailyClosures()
    const today = new Date().toISOString().split("T")[0]
    const existing = closures.find(c => c.date === today)
    if (existing) {
      setTodayClosure(existing)
    }
  }

  // Calculate totals
  const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0)
  const totalCash = todaySales.reduce((sum, s) => sum + s.cashAmount, 0)
  const totalTransfer = todaySales.reduce((sum, s) => sum + s.transferAmount, 0)
  const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalPayments = todayPayments.reduce((sum, p) => sum + p.finalAmount, 0)
  const netIncome = totalSales - totalExpenses - totalPayments

  // Product summary
  const productSummary = todaySales.reduce((acc, sale) => {
    sale.items.forEach(item => {
      if (acc[item.productId]) {
        acc[item.productId].quantity += item.quantity
        acc[item.productId].total += item.total
      } else {
        acc[item.productId] = {
          name: item.productName,
          quantity: item.quantity,
          total: item.total,
        }
      }
    })
    return acc
  }, {} as Record<string, { name: string; quantity: number; total: number }>)

  const handleCloseCash = () => {
    const closure = createDailyClosure()
    setTodayClosure(closure)
    setShowConfirmDialog(false)

    toast({
      title: "Cierre de caja completado",
      description: `Ingreso neto del dia: $${closure.netIncome.toFixed(2)}`,
    })

    if (lowStockProducts.length > 0) {
      setShowLowStockDialog(true)
    }
  }

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
      netIncome,
      lowStockProducts,
    }

    // Create CSV content
    let csv = "CIERRE DE CAJA\n"
    csv += `Fecha:,${data.date}\n\n`

    csv += "RESUMEN DE VENTAS\n"
    csv += "Producto,Cantidad,Total\n"
    Object.values(productSummary).forEach(p => {
      csv += `${p.name},${p.quantity},$${p.total.toFixed(2)}\n`
    })
    csv += `\nTOTAL VENTAS,,$${totalSales.toFixed(2)}\n`
    csv += `Efectivo,,$${totalCash.toFixed(2)}\n`
    csv += `Transferencia,,$${totalTransfer.toFixed(2)}\n\n`

    csv += "GASTOS\n"
    csv += "Descripcion,Categoria,Monto\n"
    todayExpenses.forEach(e => {
      csv += `${e.description},${e.category},$${e.amount.toFixed(2)}\n`
    })
    csv += `\nTOTAL GASTOS,,$${totalExpenses.toFixed(2)}\n\n`

    csv += "PAGOS A EMPLEADOS\n"
    csv += "Empleado,Puesto,Monto\n"
    todayPayments.forEach(p => {
      csv += `${p.employeeName},${p.position},$${p.finalAmount.toFixed(2)}\n`
    })
    csv += `\nTOTAL PAGOS,,$${totalPayments.toFixed(2)}\n\n`

    csv += `INGRESO NETO,,$${netIncome.toFixed(2)}\n`

    // Download file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `cierre_caja_${data.date}.csv`
    link.click()

    toast({ title: "Archivo exportado", description: "El reporte se ha descargado como CSV" })
  }

  const printReport = () => {
    const printWindow = window.open("", "_blank", "width=400,height=800")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cierre de Caja - ${new Date().toLocaleDateString("es-MX")}</title>
            <style>
              body { font-family: monospace; font-size: 11px; width: 280px; margin: 0 auto; padding: 10px; }
              .header { text-align: center; margin-bottom: 15px; }
              .section { margin: 15px 0; }
              .section-title { font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 3px; }
              .item { display: flex; justify-content: space-between; margin: 3px 0; }
              .total-line { border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px; font-weight: bold; }
              .net-income { font-size: 14px; text-align: center; margin-top: 15px; padding: 10px; border: 2px solid #000; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>CIERRE DE CAJA</h2>
              <p>${new Date().toLocaleDateString("es-MX")}</p>
            </div>
            
            <div class="section">
              <div class="section-title">PRODUCTOS VENDIDOS</div>
              ${Object.values(productSummary).map(p => `
                <div class="item">
                  <span>${p.quantity}x ${p.name}</span>
                  <span>$${p.total.toFixed(2)}</span>
                </div>
              `).join("")}
              <div class="total-line">
                <div class="item"><span>TOTAL VENTAS</span><span>$${totalSales.toFixed(2)}</span></div>
                <div class="item"><span>- Efectivo</span><span>$${totalCash.toFixed(2)}</span></div>
                <div class="item"><span>- Transferencia</span><span>$${totalTransfer.toFixed(2)}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">GASTOS</div>
              ${todayExpenses.map(e => `
                <div class="item">
                  <span>${e.description}</span>
                  <span>-$${e.amount.toFixed(2)}</span>
                </div>
              `).join("") || "<div>Sin gastos registrados</div>"}
              <div class="total-line">
                <div class="item"><span>TOTAL GASTOS</span><span>-$${totalExpenses.toFixed(2)}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">PAGOS EMPLEADOS</div>
              ${todayPayments.map(p => `
                <div class="item">
                  <span>${p.employeeName}</span>
                  <span>-$${p.finalAmount.toFixed(2)}</span>
                </div>
              `).join("") || "<div>Sin pagos registrados</div>"}
              <div class="total-line">
                <div class="item"><span>TOTAL PAGOS</span><span>-$${totalPayments.toFixed(2)}</span></div>
              </div>
            </div>

            <div class="net-income">
              <strong>INGRESO NETO</strong><br>
              <span style="font-size: 18px;">$${netIncome.toFixed(2)}</span>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

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
                day: "numeric" 
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
                  <p className="text-2xl font-bold text-success">${totalSales.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{todaySales.length} transacciones</p>
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
                  <p className="text-2xl font-bold text-destructive">-${totalExpenses.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{todayExpenses.length} gastos</p>
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
                  <p className="text-2xl font-bold text-destructive">-${totalPayments.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{todayPayments.length} pagos</p>
                </CardContent>
              </Card>

              <Card className={netIncome >= 0 ? "border-success" : "border-destructive"}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Ingreso Neto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-success" : "text-destructive"}`}>
                    ${netIncome.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Ventas - Gastos - Pagos</p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Desglose por Metodo de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                    <Banknote className="h-8 w-8 text-success" />
                    <div>
                      <p className="text-sm text-muted-foreground">Efectivo</p>
                      <p className="text-xl font-bold">${totalCash.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                    <CreditCard className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Transferencia</p>
                      <p className="text-xl font-bold">${totalTransfer.toFixed(2)}</p>
                    </div>
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
                  <p className="text-muted-foreground text-center py-4">No hay ventas registradas</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(productSummary)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([id, product]) => (
                        <div key={id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{product.quantity}</Badge>
                            <span>{product.name}</span>
                          </div>
                          <span className="font-semibold">${product.total.toFixed(2)}</span>
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
                  <p className="text-muted-foreground text-center py-4">No hay gastos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {todayExpenses.map(expense => (
                      <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span>{expense.description}</span>
                          <Badge variant="outline" className="ml-2">{expense.category}</Badge>
                        </div>
                        <span className="font-semibold text-destructive">-${expense.amount.toFixed(2)}</span>
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
                  <p className="text-muted-foreground text-center py-4">No hay pagos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {todayPayments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium">{payment.employeeName}</span>
                          <span className="text-sm text-muted-foreground ml-2">({payment.position})</span>
                          {payment.notes && (
                            <p className="text-xs text-muted-foreground">{payment.notes}</p>
                          )}
                        </div>
                        <span className="font-semibold text-destructive">-${payment.finalAmount.toFixed(2)}</span>
                      </div>
                    ))}
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
                    {lowStockProducts.map(product => (
                      <div key={product.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-warning" />
                          <span>{product.productName}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            Stock: <span className="text-destructive font-semibold">{product.currentStock}</span>
                            <span className="text-muted-foreground"> / Min: {product.minStock}</span>
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
              <Button variant="outline" className="flex-1 gap-2 bg-transparent" onClick={exportToExcel}>
                <FileSpreadsheet className="h-5 w-5" />
                Exportar a Excel
              </Button>
              <Button variant="outline" className="flex-1 gap-2 bg-transparent" onClick={printReport}>
                <Printer className="h-5 w-5" />
                Imprimir Reporte
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Confirm Closure Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Cierre de Caja</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estas seguro de realizar el cierre de caja? Esta accion registrara todos los movimientos del dia.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Ventas:</span>
                  <span className="font-semibold text-success">${totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos:</span>
                  <span className="font-semibold text-destructive">-${totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagos:</span>
                  <span className="font-semibold text-destructive">-${totalPayments.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Ingreso Neto:</span>
                  <span className={`font-bold ${netIncome >= 0 ? "text-success" : "text-destructive"}`}>
                    ${netIncome.toFixed(2)}
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
                Los siguientes productos tienen stock bajo y necesitan ser reabastecidos:
              </p>
              <div className="space-y-3">
                {lowStockProducts.map(product => (
                  <div key={product.productId} className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
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
  )
}
