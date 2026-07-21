"use client";

import { InputNumber } from "@/components/ui/input-number";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  getCategories,
  getProductsByCategory,
  getProducts,
  saveSale,
  getTodaySales,
  cancelSale,
  hasDailyClosure,
  getConfig,
  getCustomerByDocument,
  saveCustomer,
  deductItemsFromTableTicket,
} from "@/lib/database";
import type { Category, Product, CartItem, Sale, Customer, PendingTableMeta } from "@/lib/types";
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
  Search,
  UserCheck,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Value } from "@radix-ui/react-select";

interface PaymentState {
  method: "cash" | "transfer" | "mixed";
  cashAmount: number; // Parte en efectivo de la venta
  transferAmount: number; // Parte por transferencia
  cashReceived: number; // Efectivo recibido del cliente
  cashReturned: number; // Cambio a devolver
}

export function POSInterface() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [config, setConfig] = useState<any>({});
  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const [payment, setPayment] = useState<PaymentState>({
    method: "cash",
    cashAmount: cartTotal,
    transferAmount: 0,
    cashReceived: cartTotal,
    cashReturned: 0,
  });
  const [productsTimestamp, setProductsTimestamp] = useState(Date.now());
  const { toast } = useToast();

  const [isCompletingSale, setIsCompletingSale] = useState(false);
  const lastSaleSubmitRef = useRef<number>(0);
  const [pendingTableMeta, setPendingTableMeta] = useState<PendingTableMeta | null>(null);

  // --- Estados para el modal de facturación al imprimir ---
  const [showPrintCustomerDialog, setShowPrintCustomerDialog] = useState(false);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [printCustomerEnabled, setPrintCustomerEnabled] = useState(false);
  const [printDocType, setPrintDocType] = useState<"cc" | "nit">("cc");
  const [printDocNumber, setPrintDocNumber] = useState("");
  const [printCustomerName, setPrintCustomerName] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const resetPrintCustomerState = () => {
    setPrintCustomerEnabled(false);
    setPrintDocType("cc");
    setPrintDocNumber("");
    setPrintCustomerName("");
    setFoundCustomer(null);
    setIsSearchingCustomer(false);
  };

  const loadData = useCallback(async () => {
    try {
      const cats = await getCategories();
      setCategories(cats.sort((a, b) => a.order - b.order));
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
      }

      const configData = await getConfig();
      setConfig(configData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  }, [selectedCategory, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Detectar si hay un pago de mesa pendiente desde localStorage
  useEffect(() => {
    const raw = localStorage.getItem("pos_pending_table_items");
    const metaRaw = localStorage.getItem("pos_pending_table_meta");
    if (raw && metaRaw) {
      try {
        const items: CartItem[] = JSON.parse(raw);
        const meta: PendingTableMeta = JSON.parse(metaRaw);
        setCart(items);
        setPendingTableMeta(meta);
        localStorage.removeItem("pos_pending_table_items");
        // meta se limpia tras completar el cobro
      } catch {
        localStorage.removeItem("pos_pending_table_items");
        localStorage.removeItem("pos_pending_table_meta");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        if (selectedCategory) {
          const prods = await getProductsByCategory(selectedCategory);
          setProducts(prods);
        } else {
          const allProds = await getProducts();
          setProducts(allProds.filter((p) => p.isActive));
        }
      } catch (error) {
        console.error("Error loading products:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos",
          variant: "destructive",
        });
      }
    };

    loadProducts();
  }, [selectedCategory, productsTimestamp, toast]);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice,
              }
            : item,
        );
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
      ];
    });
  };

  const truncateText = (text: string, max: number) => {
    if (text.length <= max) return text;
    return text.slice(0, max) + "...";
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.productId !== productId),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrito vacio",
        description: "Agrega productos al carrito antes de cobrar",
        variant: "destructive",
      });
      return;
    }
    setPayment({
      method: "cash",
      cashAmount: cartTotal,
      transferAmount: 0,
      cashReceived: 0,
      cashReturned: 0,
    });
    setShowPaymentDialog(true);
  };

  const handlePaymentMethodChange = (method: "cash" | "transfer" | "mixed") => {
    if (method === "cash") {
      setPayment((prev) => ({
        ...prev,
        method,
        cashAmount: cartTotal,
        transferAmount: 0,
        cashReceived: 0,
        cashReturned: 0,
      }));
    } else if (method === "transfer") {
      setPayment((prev) => ({
        ...prev,
        method,
        cashAmount: 0,
        transferAmount: cartTotal,
        cashReceived: 0,
        cashReturned: 0,
      }));
    } else {
      setPayment((prev) => ({
        ...prev,
        method,
        cashAmount: 0,
        transferAmount: 0,
        cashReceived: 0,
        cashReturned: 0,
      }));
    }
  };

  const updateCashReceived = (value: number) => {
    setPayment((prev) => {
      const cashReceived = Math.max(0, value);
      const cashReturned =
        cashReceived > prev.cashAmount ? cashReceived - prev.cashAmount : 0;

      return {
        ...prev,
        cashReceived,
        cashReturned,
      };
    });
  };

  const handleCompleteSale = async () => {
    // Capa 2 — Throttle: descarta si el último envío fue hace menos de 2 segundos
    const now = Date.now();
    if (now - lastSaleSubmitRef.current < 2000) return;
    lastSaleSubmitRef.current = now;

    // Capa 1 — Estado: deshabilita el botón y evita re-entrada
    if (isCompletingSale) return;
    setIsCompletingSale(true);

    try {
      const isClosed = await hasDailyClosure();
      if (isClosed) {
        toast({
          title: "Cierre de caja realizado",
          description:
            "No se pueden registrar ventas después del cierre de caja",
          variant: "destructive",
        });
        return;
      }

      // Validaciones
      if (payment.method === "mixed") {
        const totalPayment = payment.cashAmount + payment.transferAmount;
        if (Math.abs(totalPayment - cartTotal) > 0.01) {
          toast({
            title: "Error en el pago",
            description: `El total del pago ($${totalPayment.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 0,
              },
            )}) no coincide con el total de la venta ($${cartTotal.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 0,
              },
            )})`,
            variant: "destructive",
          });
          return;
        }
      }

      if (
        payment.method === "cash" &&
        payment.cashReceived < payment.cashAmount
      ) {
        toast({
          title: "Monto insuficiente",
          description: `El monto recibido ($${payment.cashReceived.toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 0,
            },
          )}) es menor al monto en efectivo ($${payment.cashAmount.toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 0,
            },
          )})`,
          variant: "destructive",
        });
        return;
      }

      if (
        payment.method === "mixed" &&
        payment.cashReceived < payment.cashAmount
      ) {
        toast({
          title: "Monto en efectivo insuficiente",
          description: `El efectivo recibido ($${payment.cashReceived.toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 0,
            },
          )}) es menor a la parte en efectivo ($${payment.cashAmount.toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 0,
            },
          )})`,
          variant: "destructive",
        });
        return;
      }

      const sale = await saveSale({
        items: cart,
        subtotal: cartTotal,
        total: cartTotal,
        cashAmount: payment.cashAmount,
        transferAmount: payment.transferAmount,
        cashReceived: payment.cashReceived,
        cashReturned: payment.cashReturned,
        paymentMethod: payment.method,
      });

      if (sale) {
        toast({
          title: "Venta completada",
          description: `Venta #${sale.id.slice(-6).toUpperCase()} por $${cartTotal.toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 0,
            },
          )}`,
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo completar la venta",
          variant: "destructive",
        });
        return;
      }

      clearCart();
      setShowPaymentDialog(false);
      setProductsTimestamp(Date.now());

      // Si era un cobro de mesa, deducir los ítems del ticket
      if (pendingTableMeta) {
        try {
          await deductItemsFromTableTicket(pendingTableMeta.ticketId, pendingTableMeta.items);
          localStorage.removeItem("pos_pending_table_meta");
          setPendingTableMeta(null);
          toast({
            title: "Mesa actualizada",
            description: `Ticket de ${pendingTableMeta.tableNames.join(", ")} actualizado correctamente`,
          });
          // Regresar a la vista de mesas
          setTimeout(() => { window.location.href = "/mesas"; }, 800);
        } catch {
          toast({
            title: "Advertencia",
            description: "Venta registrada, pero no se pudo actualizar el ticket de mesa automáticamente",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la venta",
        variant: "destructive",
      });
    } finally {
      setIsCompletingSale(false);
    }
  };

  const openSalesDialog = async () => {
    try {
      const sales = await getTodaySales();
      setTodaySales(sales);
      setShowSalesDialog(true);
    } catch (error) {
      console.error("Error loading today's sales:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ventas del día",
        variant: "destructive",
      });
    }
  };

  const handleCancelSale = async (saleId: string) => {
    try {
      const isClosed = await hasDailyClosure();
      if (isClosed) {
        toast({
          title: "Caja cerrada",
          description: "No se pueden anular ventas con caja cerrada",
          variant: "destructive",
        });
        return;
      }

      const result = await cancelSale(saleId, "admin");
      if (result) {
        toast({
          title: "Venta anulada",
          description: `La venta #${saleId.slice(-6).toUpperCase()} ha sido anulada`,
        });
        const updatedSales = await getTodaySales();
        setTodaySales(updatedSales);
      }
    } catch (error) {
      console.error("Error cancelling sale:", error);
      toast({
        title: "Error",
        description: "No se pudo anular la venta",
        variant: "destructive",
      });
    }
  };

  // Abrir el modal de selección de cliente antes de imprimir
  const openPrintDialog = (sale: Sale) => {
    setSaleToPrint(sale);
    resetPrintCustomerState();
    setShowPrintCustomerDialog(true);
  };

  const handleSearchCustomer = async () => {
    if (!printDocNumber.trim()) return;
    setIsSearchingCustomer(true);
    setFoundCustomer(null);
    setPrintCustomerName("");
    try {
      const customer = await getCustomerByDocument(printDocType, printDocNumber.trim());
      if (customer) {
        setFoundCustomer(customer);
        setPrintCustomerName(customer.name);
      }
    } catch {
      // silencioso
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleConfirmPrintWithCustomer = async () => {
    if (!saleToPrint) return;
    if (!printDocNumber.trim() || !printCustomerName.trim()) {
      toast({ title: "Datos incompletos", description: "Ingresa el número de documento y el nombre del cliente", variant: "destructive" });
      return;
    }
    setIsSavingCustomer(true);
    try {
      // Guardar cliente si es nuevo
      if (!foundCustomer) {
        await saveCustomer({ name: printCustomerName.trim(), documentType: printDocType, documentNumber: printDocNumber.trim() });
      }
      const customerDetails = { name: printCustomerName.trim(), documentType: printDocType, documentNumber: printDocNumber.trim() };
      const saleSnapshot = saleToPrint; // captura antes de limpiar
      setShowPrintCustomerDialog(false);
      resetPrintCustomerState();
      setSaleToPrint(null);
      if (saleSnapshot) printTicket(saleSnapshot, customerDetails);
    } catch {
      toast({ title: "Error", description: "No se pudo guardar el cliente", variant: "destructive" });
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const printTicket = (sale: Sale, customer?: { name: string; documentType: "cc" | "nit"; documentNumber: string }) => {
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (printWindow) {
      printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Venta</title>
          <style>
            body { 
              font-family: monospace; 
              font-size: 12px; 
              width: 280px; 
              margin: 0 auto;
              padding: 5px;
            }
            .logo {
              max-width: 80px;
              margin: 0 auto 6px auto;
              display: block;
            }
            .header { 
              text-align: center; 
              margin-bottom: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
            }
            .business-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .owner-name {
              font-size: 18px;
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
            .line { 
              border-top: 1px dashed #000; 
              margin: 5px 0; 
            }
            .item { 
              display: flex; 
              justify-content: space-between;
              margin: 3px 0;
            }
            .item-name {
              flex: 1;
              margin-right: 10px;
            }
            .item-price {
              text-align: right;
              white-space: nowrap;
            }
            .total { 
              font-weight: bold; 
              font-size: 14px; 
            }
            .payment-details {
              margin-top: 10px;
              padding: 8px;
              background: #f5f5f5;
              border-radius: 4px;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 14px;
              font-weight: bold;
              color: #666;
              border-top: 1px dashed #000;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
          <img src="/images/logo.jpeg" class="logo" alt="Logo" onload="window.print()" />
            <div class="business-name">${config.businessName || "RESTAURANTE"}</div>
            <div class="owner-name">${"Elina Villegas"}</div>
            ${config.businessAddress ? `<div class="business-info">${config.businessAddress}</div>` : ""}
            ${config.businessPhone ? `<div class="business-info">Tel: ${config.businessPhone}</div>` : ""}
            ${config.businessNIT ? `<div class="business-nit">NIT: ${config.businessNIT}</div>` : ""}
            <div class="business-info">
              Ticket #${sale.id.slice(-6).toUpperCase()}
            </div>
            <div class="business-info">
              ${new Date(sale.createdAt).toLocaleString("es-MX",{
                timeZone: "UTC"
              })}
            </div>
          </div>
          ${customer ? `
          <div class="line"></div>
          <div style="margin-bottom:8px;">
            <div style="font-size:13px;font-weight:bold;text-align:center;color:#555;margin-bottom:2px;">FACTURA A NOMBRE DE:</div>
            <div style="font-size:15px;font-weight:bold;text-align:center;">${customer.name}</div>
            <div style="font-size:13px;font-weight:bold;text-align:center;color:#555;">${customer.documentType.toUpperCase()}: ${customer.documentNumber}</div>
          </div>
          ` : ""}
          
          <div class="line"></div>
          
          ${sale.items
            .map(
              (item) => `
            <div class="item">
              <div class="item-name">
                ${item.quantity}x ${item.productName}
              </div>
              <div class="item-price">
                $${item.total.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
          `,
            )
            .join("")}
          
          <div class="line"></div>
          
          <div class="item total">
            <span>TOTAL:</span>
            <span>$${sale.total.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}</span>
          </div>
          
          <div class="payment-details">
            <div class="payment-row">
              <span>Efectivo:</span>
              <span>$${sale.cashAmount.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}</span>
            </div>
            <div class="payment-row">
              <span>Transferencia:</span>
              <span>$${sale.transferAmount.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}</span>
            </div>
            ${
              sale.cashAmount > 0
                ? `
              <div class="payment-row">
                <span>Recibido:</span>
                <span>$${sale.cashReceived.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}</span>
              </div>
              <div class="payment-row">
                <span>Cambio:</span>
                <span>$${sale.cashReturned.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}</span>
              </div>
            `
                : ""
            }
            <div class="payment-row total">
              <span>Pagado:</span>
              <span>$${(sale.cashAmount + sale.transferAmount).toLocaleString(
                "en-US",
                {
                  maximumFractionDigits: 0,
                },
              )}</span>
            </div>
          </div>
          
          <div class="footer">
            Gracias por su compra<br>
            ¡Vuelva pronto!
          </div>
        </body>
      </html>
    `);
      printWindow.document.close();
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Categories - Scroll Horizontal */}
        <div className="relative">
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div className="flex gap-2 w-max pb-1">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? "default" : "outline"
                  }
                  className="pos-button px-6 py-3 text-base whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor:
                      selectedCategory === category.id
                        ? category.color
                        : undefined,
                    borderColor: category.color,
                    color:
                      selectedCategory === category.id
                        ? "#fff"
                        : category.color,
                  }}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pr-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="p-4 cursor-pointer hover:bg-accent/50 active:scale-95 transition-all min-h-12 shrink-0"
                onClick={() => addToCart(product)}
              >
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      $
                      {product.price.toLocaleString("es-MX", {
                        minimumFractionDigits: 0,
                      })}
                    </span>
                    {product.hasInventoryControl && (
                      <Badge
                        variant={
                          product.stock <= product.minStock
                            ? "destructive"
                            : "secondary"
                        }
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
      <Card className="w-fit max-w-[95vw] flex flex-col bg-card">
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

        <ScrollArea className="flex-1 p-4 overflow-x-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
              <p>Carrito vacio</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {truncateText(item.productName, 25)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      $
                      {item.unitPrice.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      c/u
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
                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>
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
                    <p className="font-semibold">
                      $
                      {item.total.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
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
            <span className="text-primary">
              $
              {cartTotal.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </span>
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
        <DialogContent className="sm:max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-6 py-2">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total a cobrar</p>
                <p className="text-4xl font-bold text-primary">
                  $
                  {cartTotal.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>

              <div className="space-y-3">
                <Label>Metodo de pago</Label>
                <RadioGroup
                  value={payment.method}
                  onValueChange={(v) =>
                    handlePaymentMethodChange(
                      v as "cash" | "transfer" | "mixed",
                    )
                  }
                  className="grid grid-cols-3 gap-2"
                >
                  <div>
                    <RadioGroupItem
                      value="cash"
                      id="cash"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="cash"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <Banknote className="h-5 w-5 mb-2" />
                      <span className="text-sm font-medium">Efectivo</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="transfer"
                      id="transfer"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="transfer"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <CreditCard className="h-5 w-5 mb-2" />
                      <span className="text-sm font-medium">Transfer</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="mixed"
                      id="mixed"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="mixed"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <div className="flex gap-1 mb-2">
                        <Banknote className="h-4 w-4" />
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Mixto</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Montos por método de pago */}
              {(payment.method === "mixed" || payment.method === "cash") && (
                <div className="space-y-4">
                  {payment.method === "mixed" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="cashAmount">Monto en Efectivo</Label>
                        <InputNumber
                          id="cashAmount"
                          value={payment.cashAmount}
                          onChange={(value) => {
                            const cashValue = Math.min(value, cartTotal);
                            setPayment((prev) => ({
                              ...prev,
                              cashAmount: cashValue,
                              transferAmount: Math.max(
                                0,
                                cartTotal - cashValue,
                              ),
                              cashReceived:
                                prev.cashReceived > cashValue
                                  ? cashValue
                                  : prev.cashReceived,
                              cashReturned:
                                prev.cashReceived > cashValue
                                  ? prev.cashReceived - cashValue
                                  : 0,
                            }));
                          }}
                          className="text-base"
                          placeholder="Ej: 50,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transferAmount">
                          Monto por Transferencia
                        </Label>
                        <InputNumber
                          id="transferAmount"
                          value={payment.transferAmount}
                          onChange={(value) => {
                            const transferValue = Math.min(value, cartTotal);
                            const newCashAmount = Math.max(
                              0,
                              cartTotal - transferValue,
                            );
                            setPayment((prev) => ({
                              ...prev,
                              transferAmount: transferValue,
                              cashAmount: newCashAmount,
                              cashReceived:
                                prev.cashReceived > newCashAmount
                                  ? newCashAmount
                                  : prev.cashReceived,
                              cashReturned:
                                prev.cashReceived > newCashAmount
                                  ? prev.cashReceived - newCashAmount
                                  : 0,
                            }));
                          }}
                          className="text-base"
                          placeholder="Ej: 50,000"
                        />
                      </div>
                    </>
                  )}

                  {/* Efectivo recibido y cambio */}
                  {payment.cashAmount > 0 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="cashReceived">Efectivo Recibido</Label>
                        <InputNumber
                          id="cashReceived"
                          value={payment.cashReceived}
                          onChange={updateCashReceived}
                          className="text-base"
                          placeholder="Ej: 10,000"
                        />
                      </div>

                      {payment.cashReceived > 0 && (
                        <div
                          className={`rounded-lg p-3 text-center ${
                            payment.cashReceived >= payment.cashAmount
                              ? "bg-success/10 border border-success/20"
                              : "bg-destructive/10 border border-destructive/20"
                          }`}
                        >
                          <p className="text-sm text-muted-foreground">
                            {payment.cashReceived >= payment.cashAmount
                              ? "Cambio a devolver:"
                              : "Falta recibir:"}
                          </p>
                          <p
                            className={`text-xl font-bold ${
                              payment.cashReceived >= payment.cashAmount
                                ? "text-success"
                                : "text-destructive"
                            }`}
                          >
                            {payment.cashReceived >= payment.cashAmount
                              ? `$${payment.cashReturned.toLocaleString(
                                  "en-US",
                                  {
                                    maximumFractionDigits: 0,
                                  },
                                )}`
                              : `$${(
                                  payment.cashAmount - payment.cashReceived
                                ).toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}`}
                          </p>
                          {payment.cashReceived < payment.cashAmount && (
                            <p className="text-xs text-destructive mt-1">
                              El monto recibido es menor a la parte en efectivo
                            </p>
                          )}
                        </div>
                      )}

                      {payment.cashReceived === payment.cashAmount && (
                        <div className="rounded-lg bg-secondary/30 p-3 text-center">
                          <p className="text-sm text-muted-foreground">
                            Pago exacto
                          </p>
                          <p className="font-semibold">Sin cambio</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {payment.method === "transfer" && (
                <div className="rounded-lg bg-primary/10 p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    Pago por transferencia
                  </p>
                  <p className="font-semibold">No requiere cambio</p>
                </div>
              )}

              {/* Resumen de pagos */}
              <div className="rounded-lg bg-secondary/30 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total venta:</span>
                  <span className="font-semibold">
                    $
                    {cartTotal.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Efectivo:</span>
                  <span>
                    $
                    {payment.cashAmount.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Transferencia:</span>
                  <span>
                    $
                    {payment.transferAmount.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                {payment.cashAmount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm">Recibido:</span>
                      <span>
                        $
                        {payment.cashReceived.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cambio:</span>
                      <span>
                        $
                        {payment.cashReturned.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button
              className="bg-success text-success-foreground hover:bg-success/90 px-6"
              onClick={handleCompleteSale}
              disabled={isCompletingSale}
            >
              {isCompletingSale ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando...</>
              ) : (
                "Completar Venta"
              )}
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
                {todaySales.map((sale) => (
                  <Card key={sale.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">
                            #{sale.id.slice(-6).toUpperCase()}
                          </span>
                          <Badge
                            variant={
                              sale.status === "completed"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {sale.status === "completed"
                              ? "Completada"
                              : "Anulada"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(sale.createdAt).toLocaleTimeString("es-MX",{
                            timeZone: "UTC",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="mt-2 text-sm">
                          {sale.items.map((item) => (
                            <p key={item.productId}>
                              {item.quantity}x {item.productName}
                            </p>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          <p>
                            Efectivo: $
                            {sale.cashAmount.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                          <p>
                            Transferencia: $
                            {sale.transferAmount.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                          {sale.cashAmount > 0 && (
                            <>
                              <p>
                                Recibido: $
                                {sale.cashReceived.toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                              <p>
                                Cambio: $
                                {sale.cashReturned.toLocaleString("en-US", {
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          $
                          {sale.total.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </p>
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
                              onClick={() => openPrintDialog(sale)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelSale(sale.id)}
                              title="Anular venta"
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
                $
                {todaySales
                  .filter((s) => s.status === "completed")
                  .reduce((sum, s) => sum + s.total, 0)
                  .toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Customer Dialog */}
      <Dialog
        open={showPrintCustomerDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowPrintCustomerDialog(false);
            resetPrintCustomerState();
            setSaleToPrint(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Imprimir Factura</DialogTitle>
          </DialogHeader>

          {!printCustomerEnabled ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground text-center">
                ¿Deseas imprimir la factura a nombre de un cliente?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPrintCustomerDialog(false);
                    if (saleToPrint) printTicket(saleToPrint);
                    setSaleToPrint(null);
                  }}
                >
                  Sin cliente
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setPrintCustomerEnabled(true)}
                >
                  Con cliente
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Tipo de documento */}
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <div className="flex gap-2">
                  <Button
                    variant={printDocType === "cc" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setPrintDocType("cc");
                      setPrintDocNumber("");
                      setPrintCustomerName("");
                      setFoundCustomer(null);
                    }}
                  >
                    CC - Persona Natural
                  </Button>
                  <Button
                    variant={printDocType === "nit" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setPrintDocType("nit");
                      setPrintDocNumber("");
                      setPrintCustomerName("");
                      setFoundCustomer(null);
                    }}
                  >
                    NIT - Empresa
                  </Button>
                </div>
              </div>

              {/* Número de documento */}
              <div className="space-y-2">
                <Label htmlFor="printDocNumber">
                  {printDocType === "cc" ? "Número de Cédula" : "Número de NIT"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="printDocNumber"
                    value={printDocNumber}
                    onChange={(e) => {
                      setPrintDocNumber(e.target.value);
                      setFoundCustomer(null);
                      setPrintCustomerName("");
                    }}
                    placeholder={printDocType === "cc" ? "Ej: 1234567890" : "Ej: 900123456-1"}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleSearchCustomer()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSearchCustomer}
                    disabled={isSearchingCustomer || !printDocNumber.trim()}
                    title="Buscar cliente"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Indicador de cliente encontrado / nuevo */}
              {foundCustomer && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                  <UserCheck className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm text-green-700 font-medium">Cliente registrado</span>
                </div>
              )}
              {!foundCustomer && printDocNumber.trim() && !isSearchingCustomer && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                  <UserPlus className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-700">Cliente nuevo — se registrará automáticamente</span>
                </div>
              )}

              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="printCustomerName">
                  {printDocType === "cc" ? "Nombre Completo" : "Razón Social / Nombre Empresa"}
                </Label>
                <Input
                  id="printCustomerName"
                  value={printCustomerName}
                  onChange={(e) => setPrintCustomerName(e.target.value)}
                  placeholder={printDocType === "cc" ? "Ej: Juan Pérez" : "Ej: Empresa S.A.S"}
                  readOnly={!!foundCustomer}
                  className={foundCustomer ? "bg-muted text-muted-foreground" : ""}
                />
              </div>

              {/* Botones confirmar */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPrintCustomerEnabled(false)}
                >
                  Atrás
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmPrintWithCustomer}
                  disabled={isSavingCustomer || !printDocNumber.trim() || !printCustomerName.trim()}
                >
                  {isSavingCustomer ? "Guardando..." : "Confirmar e Imprimir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
