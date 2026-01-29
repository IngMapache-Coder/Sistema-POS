"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import {
  getCategories,
  getProductsByCategory,
  getProducts,
  saveSale,
  getTodaySales,
  cancelSale,
  initializeSampleData,
} from "@/lib/database"
import type { Category, Product, CartItem, Sale } from "@/lib/types"
import {
  Minus,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  ShoppingCart,
  X,
  Printer,
  Ban,
} from "lucide-react"

interface PaymentState {
  method: "cash" | "transfer" | "mixed"
  cashAmount: number
  transferAmount: number
}

export function POSInterface() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showSalesDialog, setShowSalesDialog] = useState(false)
  const [todaySales, setTodaySales] = useState<Sale[]>([])
  const [payment, setPayment] = useState<PaymentState>({
    method: "cash",
    cashAmount: 0,
    transferAmount: 0,
  })
  const { toast } = useToast()

  const loadData = useCallback(() => {
    initializeSampleData()
    const cats = getCategories()
    setCategories(cats.sort((a, b) => a.order - b.order))
    if (cats.length > 0 && !selectedCategory) {
      setSelectedCategory(cats[0].id)
    }
  }, [selectedCategory])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedCategory) {
      setProducts(getProductsByCategory(selectedCategory))
    } else {
      setProducts(getProducts().filter(p => p.isActive))
    }
  }, [selectedCategory])

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0)

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.productId === product.id)
      if (existing) {
        return prevCart.map(item =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice,
              }
            : item
        )
      }
      return [
        ...prevCart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          total: product.price,
        },
      ]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta
            if (newQty <= 0) return null
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice,
            }
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrito vacio",
        description: "Agrega productos al carrito antes de cobrar",
        variant: "destructive",
      })
      return
    }
    setPayment({
      method: "cash",
      cashAmount: cartTotal,
      transferAmount: 0,
    })
    setShowPaymentDialog(true)
  }

  const handlePaymentMethodChange = (method: "cash" | "transfer" | "mixed") => {
    setPayment(prev => ({
      ...prev,
      method,
      cashAmount: method === "transfer" ? 0 : method === "cash" ? cartTotal : prev.cashAmount,
      transferAmount: method === "cash" ? 0 : method === "transfer" ? cartTotal : prev.transferAmount,
    }))
  }

  const handleCompleteSale = () => {
    if (payment.method === "mixed") {
      const total = payment.cashAmount + payment.transferAmount
      if (Math.abs(total - cartTotal) > 0.01) {
        toast({
          title: "Error en el pago",
          description: `El total del pago ($${total.toFixed(2)}) no coincide con el total de la venta ($${cartTotal.toFixed(2)})`,
          variant: "destructive",
        })
        return
      }
    }

    const sale = saveSale({
      items: cart,
      subtotal: cartTotal,
      total: cartTotal,
      cashAmount: payment.method === "transfer" ? 0 : payment.method === "cash" ? cartTotal : payment.cashAmount,
      transferAmount: payment.method === "cash" ? 0 : payment.method === "transfer" ? cartTotal : payment.transferAmount,
      paymentMethod: payment.method,
    })

    toast({
      title: "Venta completada",
      description: `Venta #${sale.id.slice(-6).toUpperCase()} por $${cartTotal.toFixed(2)}`,
    })

    clearCart()
    setShowPaymentDialog(false)
  }

  const openSalesDialog = () => {
    setTodaySales(getTodaySales())
    setShowSalesDialog(true)
  }

  const handleCancelSale = (saleId: string) => {
    const result = cancelSale(saleId, "admin")
    if (result) {
      toast({
        title: "Venta anulada",
        description: `La venta #${saleId.slice(-6).toUpperCase()} ha sido anulada`,
      })
      setTodaySales(getTodaySales())
    }
  }

  const printTicket = (sale: Sale) => {
    const printWindow = window.open("", "_blank", "width=300,height=600")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket de Venta</title>
            <style>
              body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 10px; }
              .line { border-top: 1px dashed #000; margin: 5px 0; }
              .item { display: flex; justify-content: space-between; }
              .total { font-weight: bold; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h3>RESTAURANTE</h3>
              <p>Ticket #${sale.id.slice(-6).toUpperCase()}</p>
              <p>${new Date(sale.createdAt).toLocaleString("es-MX")}</p>
            </div>
            <div class="line"></div>
            ${sale.items.map(item => `
              <div class="item">
                <span>${item.quantity}x ${item.productName}</span>
                <span>$${item.total.toFixed(2)}</span>
              </div>
            `).join("")}
            <div class="line"></div>
            <div class="item total">
              <span>TOTAL:</span>
              <span>$${sale.total.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Efectivo:</span>
              <span>$${sale.cashAmount.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Transferencia:</span>
              <span>$${sale.transferAmount.toFixed(2)}</span>
            </div>
            <div class="line"></div>
            <p style="text-align: center;">Gracias por su compra</p>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="flex h-full gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              className="pos-button px-6 py-3 text-base whitespace-nowrap"
              style={{
                backgroundColor: selectedCategory === category.id ? category.color : undefined,
                borderColor: category.color,
                color: selectedCategory === category.id ? "#fff" : category.color,
              }}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pr-4">
            {products.map(product => (
                <Card
                key={product.id}
                className="p-4 cursor-pointer hover:bg-accent/50 active:scale-95 transition-all min-h-12"
                onClick={() => addToCart(product)}
              >
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.hasInventoryControl && (
                      <Badge
                        variant={product.stock <= product.minStock ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {product.stock}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Section */}
      <Card className="w-80 lg:w-96 flex flex-col bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="font-semibold">Ticket</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={openSalesDialog}
            className="text-muted-foreground"
          >
            Ver Ventas
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
              <p>Carrito vacio</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      ${item.unitPrice.toFixed(2)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => updateQuantity(item.productId, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => updateQuantity(item.productId, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-20 text-right">
                    <p className="font-semibold">${item.total.toFixed(2)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t space-y-4">
          <div className="flex items-center justify-between text-xl font-bold">
            <span>Total:</span>
            <span className="text-primary">${cartTotal.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="pos-button bg-transparent"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              <X className="h-5 w-5 mr-2" />
              Limpiar
            </Button>
            <Button
              className="pos-button bg-success text-success-foreground hover:bg-success/90"
              onClick={openPaymentDialog}
              disabled={cart.length === 0}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Cobrar
            </Button>
          </div>
        </div>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total a cobrar</p>
              <p className="text-4xl font-bold text-primary">${cartTotal.toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <Label>Metodo de pago</Label>
              <RadioGroup
                value={payment.method}
                onValueChange={(v) => handlePaymentMethodChange(v as "cash" | "transfer" | "mixed")}
                className="grid grid-cols-3 gap-2"
              >
                <div>
                  <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                  <Label
                    htmlFor="cash"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <Banknote className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Efectivo</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="transfer" id="transfer" className="peer sr-only" />
                  <Label
                    htmlFor="transfer"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <CreditCard className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Transfer</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="mixed" id="mixed" className="peer sr-only" />
                  <Label
                    htmlFor="mixed"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <div className="flex gap-1 mb-2">
                      <Banknote className="h-5 w-5" />
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">Mixto</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {payment.method === "mixed" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cashAmount">Efectivo</Label>
                  <Input
                    id="cashAmount"
                    type="number"
                    value={payment.cashAmount}
                    onChange={(e) => {
                      const cash = Number(e.target.value) || 0
                      setPayment(prev => ({
                        ...prev,
                        cashAmount: cash,
                        transferAmount: Math.max(0, cartTotal - cash),
                      }))
                    }}
                    className="text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferAmount">Transferencia</Label>
                  <Input
                    id="transferAmount"
                    type="number"
                    value={payment.transferAmount}
                    onChange={(e) => {
                      const transfer = Number(e.target.value) || 0
                      setPayment(prev => ({
                        ...prev,
                        transferAmount: transfer,
                        cashAmount: Math.max(0, cartTotal - transfer),
                      }))
                    }}
                    className="text-lg"
                  />
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  Suma: ${(payment.cashAmount + payment.transferAmount).toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={handleCompleteSale}
            >
              Completar Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Today's Sales Dialog */}
      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Ventas del Dia</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {todaySales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay ventas registradas hoy
              </div>
            ) : (
              <div className="space-y-3">
                {todaySales.map(sale => (
                  <Card key={sale.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">
                            #{sale.id.slice(-6).toUpperCase()}
                          </span>
                          <Badge variant={sale.status === "completed" ? "default" : "destructive"}>
                            {sale.status === "completed" ? "Completada" : "Anulada"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(sale.createdAt).toLocaleTimeString("es-MX")}
                        </p>
                        <div className="mt-2 text-sm">
                          {sale.items.map(item => (
                            <p key={item.productId}>
                              {item.quantity}x {item.productName}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">${sale.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.paymentMethod === "cash"
                            ? "Efectivo"
                            : sale.paymentMethod === "transfer"
                            ? "Transferencia"
                            : "Mixto"}
                        </p>
                        {sale.status === "completed" && (
                          <div className="flex gap-1 mt-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => printTicket(sale)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelSale(sale.id)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t pt-4">
            <div className="flex justify-between font-semibold">
              <span>Total del dia:</span>
              <span className="text-primary">
                ${todaySales.filter(s => s.status === "completed").reduce((sum, s) => sum + s.total, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
