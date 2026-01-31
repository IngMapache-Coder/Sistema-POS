"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getDailyStats,
  getMonthlyStats,
  getTopProducts,
  getBottomProducts,
  getConfig,
} from "@/lib/database"
import type { DailyStats, MonthlyStats, ProductStats } from "@/lib/types"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Award,
} from "lucide-react"

export default function ReportesPage() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [topProducts, setTopProducts] = useState<ProductStats[]>([])
  const [bottomProducts, setBottomProducts] = useState<ProductStats[]>([])
  const [topN, setTopN] = useState(10)
  const [period, setPeriod] = useState<string>("all")

  useEffect(() => {
    const config = getConfig()
    setTopN(config.topN)
    loadData(config.topN, "all")
  }, [])

  const loadData = (n: number, selectedPeriod: string) => {
    setDailyStats(getDailyStats(30))
    setMonthlyStats(getMonthlyStats(12))
    
    const periodFilter = selectedPeriod === "all" ? undefined : selectedPeriod
    setTopProducts(getTopProducts(n, periodFilter))
    setBottomProducts(getBottomProducts(n, periodFilter))
  }

  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    const periodFilter = value === "all" ? undefined : value
    setTopProducts(getTopProducts(topN, periodFilter))
    setBottomProducts(getBottomProducts(topN, periodFilter))
  }

  // Format data for charts
  const dailyChartData = dailyStats.map(stat => ({
    date: new Date(stat.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
    "Ingreso Neto": stat.netIncome,
    Ventas: stat.totalSales,
    Gastos: stat.totalExpenses + stat.totalPayments,
  }))

  const monthlyChartData = monthlyStats.map(stat => ({
    month: new Date(stat.month + "-01").toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
    "Ingreso Neto": stat.netIncome,
    Ventas: stat.totalSales,
    Gastos: stat.totalExpenses + stat.totalPayments,
  }))

  // Get available months for period filter
  const availableMonths = monthlyStats
    .filter(stat => stat.totalSales > 0)
    .map(stat => stat.month)

  // Calculate summary stats
  const totalNetIncome30Days = dailyStats.reduce((sum, s) => sum + s.netIncome, 0)
  const avgDailyIncome = totalNetIncome30Days / Math.max(dailyStats.filter(s => s.netIncome !== 0).length, 1)
  const bestDay = dailyStats.reduce((best, s) => s.netIncome > best.netIncome ? s : best, dailyStats[0] || { date: "", netIncome: 0 })
  const worstDay = dailyStats.reduce((worst, s) => s.netIncome < worst.netIncome ? s : worst, dailyStats[0] || { date: "", netIncome: 0 })

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Reportes y Estadisticas</h1>
            <p className="text-muted-foreground">Analiza el rendimiento del negocio</p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ingreso Neto (30 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${totalNetIncome30Days >= 0 ? "text-success" : "text-destructive"}`}>
                    ${totalNetIncome30Days.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Promedio Diario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${avgDailyIncome >= 0 ? "text-success" : "text-destructive"}`}>
                    ${avgDailyIncome.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Mejor Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-success">${bestDay?.netIncome?.toFixed(2) || "0.00"}</p>
                  <p className="text-xs text-muted-foreground">
                    {bestDay?.date ? new Date(bestDay.date).toLocaleDateString("es-MX") : "-"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    Peor Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-destructive">${worstDay?.netIncome?.toFixed(2) || "0.00"}</p>
                  <p className="text-xs text-muted-foreground">
                    {worstDay?.date ? new Date(worstDay.date).toLocaleDateString("es-MX") : "-"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="daily" className="w-full">
              <TabsList>
                <TabsTrigger value="daily" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Diario (30 dias)
                </TabsTrigger>
                <TabsTrigger value="monthly" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Mensual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ingreso Neto Diario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {dailyChartData.length > 0 && dailyChartData.some(d => d.Ventas > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" className="text-xs" tick={{ fill: 'currentColor' }} />
                            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} tickFormatter={(value) => `$${value}`} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="Ingreso Neto" 
                              stroke="hsl(var(--chart-1))" 
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="Ventas" 
                              stroke="hsl(var(--chart-2))" 
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No hay datos suficientes para mostrar la grafica
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="monthly" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ingreso Neto Mensual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {monthlyChartData.length > 0 && monthlyChartData.some(d => d.Ventas > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs" tick={{ fill: 'currentColor' }} />
                            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} tickFormatter={(value) => `$${value}`} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                            />
                            <Legend />
                            <Bar dataKey="Ventas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Gastos" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Ingreso Neto" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No hay datos suficientes para mostrar la grafica
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Products Analysis */}
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold">Analisis de Productos</h2>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-success" />
                    Top {topN} Mas Vendidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hay datos de ventas</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((product, index) => (
                        <div key={product.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={index < 3 ? "default" : "secondary"}
                              className={index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-amber-600" : ""}
                            >
                              #{index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-sm text-muted-foreground">{product.totalQuantity} vendidos</p>
                            </div>
                          </div>
                          <p className="font-semibold text-success">${product.totalRevenue.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bottom Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-destructive" />
                    Top {topN} Menos Vendidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bottomProducts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hay datos de productos</p>
                  ) : (
                    <div className="space-y-3">
                      {bottomProducts.map((product, index) => (
                        <div key={product.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <div>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.totalQuantity === 0 
                                  ? "Sin ventas" 
                                  : `${product.totalQuantity} vendidos`}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-muted-foreground">${product.totalRevenue.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
