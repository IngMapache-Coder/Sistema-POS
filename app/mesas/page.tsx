"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  getTables,
  saveTable,
  updateTable,
  deleteTable,
  createTableTicket,
  groupTablesUnderTicket,
  ungroupTables,
  getTableTicketItems,
  addItemToTableTicket,
  updateTableTicketItem,
  deleteTableTicketItem,
  getCategories,
  getProductsByCategory,
  getProducts,
} from "@/lib/database";
import { getCurrentUser, checkPermission } from "@/lib/database";
import type {
  Table,
  TableTicketItem,
  PendingTableMeta,
  CartItem,
} from "@/lib/types";
import type { Category, Product } from "@/lib/types";
import {
  Plus,
  Minus,
  Trash2,
  Pencil,
  UtensilsCrossed,
  Printer,
  ShoppingCart,
  CheckSquare,
  Link2,
  Link2Off,
  X,
  FileText,
  Search,
  Loader2,
} from "lucide-react";

// ─── Helper ──────────────────────────────────────────────────
function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ─── Print kitchen ticket ─────────────────────────────────────
function printKitchenTicket(tableNames: string[], items: TableTicketItem[]) {
  const win = window.open("", "_blank", "width=350,height=600");
  if (!win) return;
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:4px 6px;font-weight:600;">${i.quantity}x</td><td style="padding:4px 6px;">${i.productName}</td><td style="padding:4px 6px;color:#555;">${i.notes ? i.notes : ""}</td></tr>`,
    )
    .join("");
  win.document.write(`<!DOCTYPE html><html><head><title>Comanda</title>
  <style>
    body{font-family:monospace;font-size:13px;width:300px;margin:0 auto;padding:8px;}
    h2{text-align:center;margin:4px 0;}
    .sep{border-top:1px dashed #000;margin:6px 0;}
    table{width:100%;border-collapse:collapse;}
    th{text-align:left;font-size:11px;color:#666;padding:2px 6px;}
    td{vertical-align:top;}
  </style></head>
  <body>
    <h2>COMANDA</h2>
    <div class="sep"></div>
    <p style="text-align:center;font-weight:bold;font-size:15px;">MESA: ${tableNames.join(" + ")}</p>
    <p style="text-align:center;font-size:11px;color:#555;">${new Date().toLocaleString("es-CO")}</p>
    <div class="sep"></div>
    <table><thead><tr><th>CANT</th><th>PRODUCTO</th><th>NOTAS</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="sep"></div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ─── Main Component ───────────────────────────────────────────
export default function MesasPage() {
  const { toast } = useToast();
  const isAdmin = checkPermission(["admin"]);
  const isWaiter = checkPermission(["waiter"]);
  const canGroup = checkPermission(["admin", "waiter"]);
  const canCheckout = checkPermission(["admin", "cashier"]);

  // ── State ──────────────────────────────────────────────────
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  // Active ticket panel
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [groupedTables, setGroupedTables] = useState<Table[]>([]);
  const [ticketItems, setTicketItems] = useState<TableTicketItem[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [showTicketPanel, setShowTicketPanel] = useState(false);

  // Add product drawer
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Notes dialog
  const [editingItem, setEditingItem] = useState<TableTicketItem | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Table CRUD
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [tableNameInput, setTableNameInput] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [savingTable, setSavingTable] = useState(false);
  const lastTableSaveRef = useRef<number>(0);

  // Group tables
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const [grouping, setGrouping] = useState(false);

  // Checkout (admin only)
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, number>>({}); // itemId -> qty to pay

  // ── Loaders ────────────────────────────────────────────────
  const loadTables = useCallback(async () => {
    setLoading(true);
    const t = await getTables();
    setTables(t);
    setLoading(false);
  }, []);

  const loadCategories = useCallback(async () => {
    const cats = await getCategories();
    setCategories(cats.sort((a, b) => a.order - b.order));
    if (cats.length > 0) setSelectedCat(cats[0].id);
  }, []);

  useEffect(() => {
    loadTables();
    loadCategories();
  }, [loadTables, loadCategories]);

  useEffect(() => {
    if (!selectedCat) return;
    getProductsByCategory(selectedCat).then(setProducts);
  }, [selectedCat]);

  // ── Open ticket ────────────────────────────────────────────
  const openTable = async (table: Table) => {
    setSelectedTable(table);
    setShowTicketPanel(true);
    setTicketItems([]);

    // Find all tables that share the same ticket
    if (table.activeTicketId) {
      const siblings = tables.filter(
        (t) => t.activeTicketId === table.activeTicketId,
      );
      setGroupedTables(siblings);
      setTicketLoading(true);
      const items = await getTableTicketItems(table.activeTicketId);
      setTicketItems(items);
      setTicketLoading(false);
    } else {
      setGroupedTables([table]);
    }
  };

  const handleOpenTicket = async () => {
    if (!selectedTable) return;
    try {
      await createTableTicket([selectedTable.id]);
      await loadTables();
      // Reopen with refreshed data
      const updated = await getTables();
      setTables(updated);
      const t = updated.find((t) => t.id === selectedTable.id)!;
      setSelectedTable(t);
      setGroupedTables([t]);
      setTicketItems([]);
      toast({ title: "Comanda abierta", description: `Mesa ${t.name} marcada como ocupada` });
    } catch {
      toast({ title: "Error", description: "No se pudo abrir la comanda", variant: "destructive" });
    }
  };

  // ── Add item ───────────────────────────────────────────────
  const handleAddProduct = async (product: Product) => {
    if (!selectedTable?.activeTicketId) return;
    try {
      const item = await addItemToTableTicket(selectedTable.activeTicketId, product.id, 1, null);
      setTicketItems((prev) => {
        // If same product exists without notes, just increment quantity in state
        const existing = prev.find((i) => i.productId === product.id && !i.notes);
        if (existing) {
          // Update server-side
          updateTableTicketItem(existing.id, existing.quantity + 1, existing.notes);
          return prev.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        return [...prev, item];
      });
    } catch {
      toast({ title: "Error", description: "No se pudo agregar el ítem", variant: "destructive" });
    }
  };

  // ── Quantity controls ──────────────────────────────────────
  const handleQtyChange = async (item: TableTicketItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      // Delete
      try {
        await deleteTableTicketItem(item.id);
        setTicketItems((prev) => prev.filter((i) => i.id !== item.id));
      } catch {
        toast({ title: "Error", description: "No se pudo eliminar el ítem", variant: "destructive" });
      }
    } else {
      try {
        await updateTableTicketItem(item.id, newQty, item.notes);
        setTicketItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)),
        );
      } catch {
        toast({ title: "Error", description: "No se pudo actualizar el ítem", variant: "destructive" });
      }
    }
  };

  // ── Notes ──────────────────────────────────────────────────
  const openNotesDialog = (item: TableTicketItem) => {
    setEditingItem(item);
    setNotesDraft(item.notes ?? "");
    setShowNotesDialog(true);
  };

  const handleSaveNotes = async () => {
    if (!editingItem) return;
    setSavingNotes(true);
    try {
      await updateTableTicketItem(editingItem.id, editingItem.quantity, notesDraft || null);
      setTicketItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...i, notes: notesDraft || null } : i)),
      );
      setShowNotesDialog(false);
    } catch {
      toast({ title: "Error", description: "No se pudieron guardar las notas", variant: "destructive" });
    } finally {
      setSavingNotes(false);
    }
  };

  // ── Table CRUD ─────────────────────────────────────────────
  const handleSaveTable = async () => {
    const now = Date.now();
    if (now - lastTableSaveRef.current < 2000) return;
    lastTableSaveRef.current = now;
    if (savingTable) return;
    if (!tableNameInput.trim()) {
      toast({ title: "Error", description: "El nombre de la mesa es requerido", variant: "destructive" });
      return;
    }
    setSavingTable(true);
    try {
      if (editingTableId) {
        await updateTable(editingTableId, tableNameInput.trim());
      } else {
        await saveTable(tableNameInput.trim());
      }
      setTableNameInput("");
      setEditingTableId(null);
      await loadTables();
    } catch {
      toast({ title: "Error", description: "No se pudo guardar la mesa", variant: "destructive" });
    } finally {
      setSavingTable(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    try {
      await deleteTable(id);
      await loadTables();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar la mesa", variant: "destructive" });
    }
  };

  // ── Group tables ───────────────────────────────────────────
  const handleGroupTables = async () => {
    if (groupSelection.length < 2) {
      toast({ title: "Selecciona al menos 2 mesas", variant: "destructive" } as any);
      return;
    }
    setGrouping(true);
    try {
      const selectedTables = tables.filter((t) => groupSelection.includes(t.id));
      const busy = selectedTables.find((t) => t.activeTicketId);
      if (busy) {
        // Attach available tables to the existing ticket
        const free = selectedTables.filter((t) => !t.activeTicketId).map((t) => t.id);
        if (free.length > 0) await groupTablesUnderTicket(free, busy.activeTicketId!);
      } else {
        // All free — create new ticket
        await createTableTicket(groupSelection);
      }
      setGroupSelection([]);
      setShowGroupDialog(false);
      await loadTables();
      toast({ title: "Mesas unidas", description: "Las mesas comparten ahora la misma comanda" });
    } catch {
      toast({ title: "Error", description: "No se pudieron unir las mesas", variant: "destructive" });
    } finally {
      setGrouping(false);
    }
  };

  // ── Checkout ───────────────────────────────────────────────
  const openCheckout = () => {
    const initial: Record<string, number> = {};
    ticketItems.forEach((i) => { initial[i.id] = i.quantity; });
    setCheckedItems(initial);
    setShowCheckoutDialog(true);
  };

  const sendToPos = (itemsToSend: TableTicketItem[], quantities: Record<string, number>) => {
    const cartItems: CartItem[] = itemsToSend.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.productPrice,
      quantity: quantities[item.id],
      total: item.productPrice * quantities[item.id],
    }));

    const meta: PendingTableMeta = {
      ticketId: selectedTable!.activeTicketId!,
      tableNames: groupedTables.map((t) => t.name),
      items: itemsToSend.map((i) => ({ id: i.id, quantity: quantities[i.id] })),
    };

    localStorage.setItem("pos_pending_table_items", JSON.stringify(cartItems));
    localStorage.setItem("pos_pending_table_meta", JSON.stringify(meta));
    window.location.href = "/";
  };

  const handleCheckoutSelected = () => {
    const toSend = ticketItems.filter(
      (i) => checkedItems[i.id] && checkedItems[i.id] > 0,
    );
    if (toSend.length === 0) {
      toast({ title: "Selecciona al menos un ítem", variant: "destructive" } as any);
      return;
    }
    sendToPos(toSend, checkedItems);
  };

  const handleCheckoutAll = () => {
    const all: Record<string, number> = {};
    ticketItems.forEach((i) => { all[i.id] = i.quantity; });
    sendToPos(ticketItems, all);
  };

  // ── Separar y Cerrar Comandas ──────────────────────────────
  const handleUngroupTables = async () => {
    if (!selectedTable || !selectedTable.activeTicketId) return;
    try {
      await ungroupTables(selectedTable.activeTicketId, selectedTable.id);
      toast({
        title: "Mesas separadas",
        description: `Se separaron las mesas vinculadas de la Mesa ${selectedTable.name}`,
      });
      await loadTables();
      // Reabrir mesa seleccionada
      const updated = await getTables();
      setTables(updated);
      const t = updated.find((table) => table.id === selectedTable.id)!;
      setSelectedTable(t);
      setGroupedTables([t]);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron separar las mesas",
        variant: "destructive",
      });
    }
  };

  const handleCloseEmptyTicket = async () => {
    if (!selectedTable || !selectedTable.activeTicketId) return;
    try {
      // Liberar las mesas asociadas al ticket
      const { error: tableErr } = await supabase
        .from("tables")
        .update({ status: "available", active_ticket_id: null })
        .eq("active_ticket_id", selectedTable.activeTicketId);
      if (tableErr) throw tableErr;

      // Eliminar el ticket
      const { error: ticketErr } = await supabase
        .from("table_tickets")
        .delete()
        .eq("id", selectedTable.activeTicketId);
      if (ticketErr) throw ticketErr;

      toast({
        title: "Mesa liberada",
        description: "La comanda vacía se ha cerrado y las mesas están disponibles.",
      });
      await loadTables();
      setShowTicketPanel(false);
      setSelectedTable(null);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la comanda vacía",
        variant: "destructive",
      });
    }
  };

  // ── Filtered products ──────────────────────────────────────
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  // ── Total ──────────────────────────────────────────────────
  const ticketTotal = ticketItems.reduce(
    (sum, i) => sum + i.productPrice * i.quantity,
    0,
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 flex overflow-hidden">
        {/* ── Tables Grid ── */}
        <div
          className={`flex flex-col flex-1 p-6 overflow-auto transition-all ${showTicketPanel ? "lg:max-w-[55%]" : ""}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Mesas</h1>
              <p className="text-sm text-muted-foreground">
                {tables.filter((t) => t.status === "busy").length} de {tables.length} ocupadas
              </p>
            </div>
            <div className="flex gap-2">
              {canGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGroupDialog(true)}
                >
                  <Link2 className="h-4 w-4 mr-1" /> Unir Mesas
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTableId(null);
                    setTableNameInput("");
                    setShowManageDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Gestionar Mesas
                </Button>
              )}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
              <UtensilsCrossed className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay mesas registradas</p>
              {isAdmin && (
                <Button onClick={() => setShowManageDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Crear primera mesa
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tables.map((table) => {
                const busy = table.status === "busy";
                const active = selectedTable?.id === table.id;
                // Find group siblings
                const siblings = busy
                  ? tables.filter(
                      (t) => t.activeTicketId === table.activeTicketId && t.id !== table.id,
                    )
                  : [];
                return (
                  <Card
                    key={table.id}
                    onClick={() => openTable(table)}
                    className={`cursor-pointer p-5 flex flex-col items-center gap-3 transition-all select-none
                      ${active ? "ring-2 ring-primary" : "hover:shadow-md"}
                      ${busy ? "bg-orange-500/5 border-orange-400/40" : "hover:bg-accent/50"}`}
                  >
                    <div
                      className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl
                        ${busy ? "bg-orange-500/20 text-orange-600" : "bg-primary/10 text-primary"}`}
                    >
                      {table.name.replace(/\D/g, "") || table.name.slice(0, 2)}
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">{table.name}</p>
                      {siblings.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {siblings.map((s) => s.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <Badge variant={busy ? "destructive" : "outline"} className="text-xs">
                      {busy ? "Ocupada" : "Disponible"}
                    </Badge>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Ticket Panel ── */}
        {showTicketPanel && selectedTable && (
          <div className="w-full lg:w-[45%] border-l flex flex-col bg-card">
            {/* Panel header */}
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">
                  {groupedTables.map((t) => t.name).join(" + ")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedTable.status === "busy" ? "Comanda activa" : "Mesa disponible"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTicketPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* No ticket — open one */}
            {selectedTable.status === "available" ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <UtensilsCrossed className="h-12 w-12 opacity-20" />
                <p className="text-muted-foreground text-center">
                  Esta mesa está disponible.<br />Ábrela para empezar una comanda.
                </p>
                <Button onClick={handleOpenTicket} className="w-full max-w-xs">
                  <Plus className="h-4 w-4 mr-2" /> Abrir Comanda
                </Button>
              </div>
            ) : (
              <>
                {/* Items list */}
                <ScrollArea className="flex-1 px-5 py-3">
                  {ticketLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : ticketItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Sin ítems. Agrega productos abajo.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ticketItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.productName}</p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">
                                📝 {item.notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {fmt(item.productPrice)} × {item.quantity} = {fmt(item.productPrice * item.quantity)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openNotesDialog(item)}
                              title="Notas"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleQtyChange(item, -1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-5 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleQtyChange(item, 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleQtyChange(item, -item.quantity)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Total */}
                {ticketItems.length > 0 && (
                  <div className="px-5 py-2 border-t flex justify-between text-sm font-semibold">
                    <span>Total comanda</span>
                    <span className="text-primary text-base">{fmt(ticketTotal)}</span>
                  </div>
                )}

                {/* Add product toggle */}
                <div className="border-t px-5 py-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddProduct((v) => !v)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showAddProduct ? "Cerrar buscador" : "Agregar producto"}
                  </Button>
                  {showAddProduct && (
                    <div className="mt-3 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar producto…"
                          className="pl-9"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                      </div>
                      {/* Categories */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {categories.map((cat) => (
                          <Button
                            key={cat.id}
                            size="sm"
                            variant={selectedCat === cat.id ? "default" : "outline"}
                            className="shrink-0 text-xs h-7"
                            onClick={() => setSelectedCat(cat.id)}
                          >
                            {cat.name}
                          </Button>
                        ))}
                      </div>
                      <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleAddProduct(p)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent text-sm text-left"
                          >
                            <span>{p.name}</span>
                            <span className="text-muted-foreground text-xs">{fmt(p.price)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t flex flex-col gap-2">
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => printKitchenTicket(groupedTables.map((t) => t.name), ticketItems)}
                      disabled={ticketItems.length === 0}
                    >
                      <Printer className="h-4 w-4 mr-1" /> Comanda
                    </Button>
                    {canCheckout && (
                      <Button
                        className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                        onClick={openCheckout}
                        disabled={ticketItems.length === 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" /> Cobrar
                      </Button>
                    )}
                  </div>
                  {ticketItems.length === 0 && (
                    <Button
                      variant="destructive"
                      className="w-full text-xs h-9"
                      onClick={handleCloseEmptyTicket}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Cerrar Comanda Vacía
                    </Button>
                  )}
                  {canGroup && groupedTables.length > 1 && ticketItems.length === 0 && (
                    <Button
                      variant="outline"
                      className="w-full text-xs text-destructive hover:text-destructive h-9"
                      onClick={handleUngroupTables}
                    >
                      <Link2Off className="h-3.5 w-3.5 mr-1" /> Deshacer Unión de Mesas
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Notes Dialog ── */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Notas de preparación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{editingItem?.productName}</p>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Ej: uno sin arroz, sin picante, término medio…"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Notas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Tables Dialog (admin) ── */}
      {isAdmin && (
        <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gestionar Mesas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={tableNameInput}
                  onChange={(e) => setTableNameInput(e.target.value)}
                  placeholder="Nombre de la mesa (ej. Mesa 5)"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTable()}
                />
                <Button onClick={handleSaveTable} disabled={savingTable}>
                  {savingTable ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingTableId ? (
                    "Guardar"
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
                {editingTableId && (
                  <Button
                    variant="ghost"
                    onClick={() => { setEditingTableId(null); setTableNameInput(""); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {tables.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span className="font-medium text-sm">{t.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingTableId(t.id);
                            setTableNameInput(t.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTable(t.id)}
                          disabled={t.status === "busy"}
                          title={t.status === "busy" ? "No se puede eliminar una mesa ocupada" : ""}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Group Tables Dialog (admin/waiter) ── */}
      {canGroup && (
        <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Unir Mesas</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Selecciona las mesas que compartirán la misma comanda.
            </p>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {tables.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={groupSelection.includes(t.id)}
                      onCheckedChange={(checked) =>
                        setGroupSelection((prev) =>
                          checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                        )
                      }
                    />
                    <span className="flex-1 text-sm font-medium">{t.name}</span>
                    <Badge variant={t.status === "busy" ? "destructive" : "outline"} className="text-xs">
                      {t.status === "busy" ? "Ocupada" : "Libre"}
                    </Badge>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGroupTables} disabled={grouping || groupSelection.length < 2}>
                {grouping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                Unir {groupSelection.length > 0 ? `(${groupSelection.length})` : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Checkout Dialog (admin/cashier) ── */}
      {canCheckout && (
        <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cobrar Cuenta</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Selecciona los ítems a cobrar o pasa todo el ticket al POS.
            </p>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {ticketItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                    <Checkbox
                      checked={(checkedItems[item.id] ?? 0) > 0}
                      onCheckedChange={(checked) =>
                        setCheckedItems((prev) => ({
                          ...prev,
                          [item.id]: checked ? item.quantity : 0,
                        }))
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                      )}
                    </div>
                    {/* Partial quantity */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setCheckedItems((prev) => ({
                            ...prev,
                            [item.id]: Math.max(0, (prev[item.id] ?? item.quantity) - 1),
                          }))
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-sm">
                        {checkedItems[item.id] ?? item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setCheckedItems((prev) => ({
                            ...prev,
                            [item.id]: Math.min(item.quantity, (prev[item.id] ?? item.quantity) + 1),
                          }))
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground">/ {item.quantity}</span>
                    </div>
                    <span className="text-xs font-medium w-20 text-right">
                      {fmt(item.productPrice * (checkedItems[item.id] ?? item.quantity))}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCheckoutSelected}
              >
                <CheckSquare className="h-4 w-4 mr-1" /> Cobrar Seleccionados
              </Button>
              <Button
                className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                onClick={handleCheckoutAll}
              >
                <ShoppingCart className="h-4 w-4 mr-1" /> Cobrar Todo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
