"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDailyStats,
  getMonthlyStats,
  getTopProducts,
  getBottomProducts,
  getConfig,
  getTodayDate,
} from "@/lib/database";
import type { DailyStats, MonthlyStats, ProductStats } from "@/lib/types";
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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Award,
} from "lucide-react";

export default function ReportesPage() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [bottomProducts, setBottomProducts] = useState<ProductStats[]>([]);
  const [topN, setTopN] = useState(10);
  const [period, setPeriod] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const formatChartDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Primero obtenemos la configuración
      const config = await getConfig();
      const currentTopN = config.topN;
      setTopN(currentTopN);

      // Luego cargamos todos los datos usando currentTopN
      const [dailyData, monthlyData, topData, bottomData] = await Promise.all([
        getDailyStats(30),
        getMonthlyStats(12),
        getTopProducts(currentTopN, undefined), // undefined = "all"
        getBottomProducts(currentTopN, undefined),
      ]);

      setDailyStats(dailyData);
      setMonthlyStats(monthlyData);
      setTopProducts(topData);
      setBottomProducts(bottomData);
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = async (value: string) => {
    setPeriod(value);
    try {
      const periodFilter = value === "all" ? undefined : value;
      const [topData, bottomData] = await Promise.all([
        getTopProducts(topN, periodFilter),
        getBottomProducts(topN, periodFilter),
      ]);
      setTopProducts(topData);
      setBottomProducts(bottomData);
    } catch (error) {
      console.error("Error changing period:", error);
    }
  };

  const dailyChartData = dailyStats.map((stat) => ({
    date: formatChartDate(stat.date),
    Ventas: Number(stat.totalSales),
    Gastos: Number(stat.totalExpenses),
    Pagos: Number(stat.totalPayments),
  }));

  const monthlyChartData = monthlyStats.map((stat) => {
    const [year, month] = stat.month.split("-").map(Number);

    return {
      month: new Date(year, month - 1, 15).toLocaleDateString("es-MX", {
        month: "short",
        year: "numeric",
      }),
      Ventas: Number(stat.totalSales),
      Gastos: Number(stat.totalExpenses),
      Pagos: Number(stat.totalPayments),
    };
  });

  // Get available months for period filter
  const availableMonths = monthlyStats
    .filter((stat) => stat.totalSales > 0)
    .map((stat) => stat.month);

  const totalSales30Days = dailyStats.reduce((sum, s) => sum + s.totalSales, 0);

  const avgDailySales =
    totalSales30Days /
    Math.max(dailyStats.filter((s) => s.totalSales > 0).length, 1);

  const daysWithSales = dailyStats.filter((s) => s.totalSales > 0);

  const bestSalesDay =
    daysWithSales.length > 0
      ? daysWithSales.reduce(
          (best, s) => (s.totalSales > best.totalSales ? s : best),
          daysWithSales[0],
        )
      : { date: "", totalSales: 0 };

  const worstSalesDay =
    daysWithSales.length > 0
      ? daysWithSales.reduce(
          (worst, s) => (s.totalSales < worst.totalSales ? s : worst),
          daysWithSales[0],
        )
      : { date: "", totalSales: 0 };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Cargando reportes...</p>
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
            <h1 className="text-2xl font-bold">Reportes y Estadisticas</h1>
            <p className="text-muted-foreground">
              Analiza el rendimiento del negocio
            </p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ventas (30 días)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-success">
                    $
                    {totalSales30Days.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Promedio diario de ventas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-success">
                    $
                    {avgDailySales.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Mejor día en ventas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-success">
                    $
                    {bestSalesDay.totalSales.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDisplayDate(bestSalesDay.date)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    Peor día en ventas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-destructive">
                    $
                    {worstSalesDay.totalSales.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDisplayDate(worstSalesDay.date)}
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
                    <CardTitle>Ventas, Gastos y Pagos Diarios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-75">
                      {dailyChartData.length > 0 &&
                      dailyChartData.some((d) => d.Ventas > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyChartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              className="stroke-muted"
                            />
                            <XAxis
                              dataKey="date"
                              className="text-xs"
                              tick={{ fill: "currentColor" }}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: "currentColor" }}
                              tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [
                                `$${value.toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}`,
                                undefined,
                              ]}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="Ventas"
                              stroke="#22c55e"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="Gastos"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="Pagos"
                              stroke="#f97316"
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
                    <CardTitle>Ventas, Gastos y Pagos Mensuales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-75">
                      {monthlyChartData.length > 0 &&
                      monthlyChartData.some((d) => d.Ventas > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyChartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              className="stroke-muted"
                            />
                            <XAxis
                              dataKey="month"
                              className="text-xs"
                              tick={{ fill: "currentColor" }}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: "currentColor" }}
                              tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [
                                `$${value.toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}`,
                                undefined,
                              ]}
                            />
                            <Legend />
                            <Bar
                              dataKey="Ventas"
                              fill="#22c55e"
                              radius={[4, 4, 0, 0]}
                            />{" "}
                            {/* verde */}
                            <Bar
                              dataKey="Gastos"
                              fill="#ef4444"
                              radius={[4, 4, 0, 0]}
                            />{" "}
                            {/* rojo */}
                            <Bar
                              dataKey="Pagos"
                              fill="#f97316"
                              radius={[4, 4, 0, 0]}
                            />{" "}
                            {/* naranja */}
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
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString("es-MX", {
                        month: "long",
                        year: "numeric",
                      })}
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
                    <p className="text-muted-foreground text-center py-4">
                      No hay datos de ventas
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((product, index) => (
                        <div
                          key={product.productId}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={index < 3 ? "default" : "secondary"}
                              className={
                                index === 0
                                  ? "bg-yellow-500"
                                  : index === 1
                                    ? "bg-gray-400"
                                    : index === 2
                                      ? "bg-amber-600"
                                      : ""
                              }
                            >
                              #{index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">
                                {product.productName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {product.totalQuantity} vendidos
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-success">
                            $
                            {product.totalRevenue.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
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
                    <p className="text-muted-foreground text-center py-4">
                      No hay datos de productos
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {bottomProducts.map((product, index) => (
                        <div
                          key={product.productId}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <div>
                              <p className="font-medium">
                                {product.productName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {product.totalQuantity === 0
                                  ? "Sin ventas"
                                  : `${product.totalQuantity} vendidos`}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-muted-foreground">
                            $
                            {product.totalRevenue.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
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
  );
}
