"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InputNumber } from "@/components/ui/input-number";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  getCategories,
  saveCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  saveProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/database";
import type { Category, Product } from "@/lib/types";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";

const CATEGORY_COLORS = [
  "#0ea5e9", // sky-500
  "#f97316", // orange-500
  "#22c55e", // green-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f59e0b", // amber-500
  "#6366f1", // indigo-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#ef4444", // red-500
  "#10b981", // emerald-500
  "#a855f7", // purple-500
  "#eab308", // yellow-500
  "#64748b", // slate-500
  "#0f766e", // teal-700
];

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all",
  );
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "product";
    id: string;
  } | null>(null);
  const { toast } = useToast();

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    color: CATEGORY_COLORS[0],
    order: 1,
  });
  const [productForm, setProductForm] = useState({
    name: "",
    price: 0,
    categoryId: "",
    stock: 0,
    minStock: 0,
    hasInventoryControl: false,
  });

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      await loadData();
    } catch (error) {
      console.error("Error initializing data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    }
  };

  const loadData = async () => {
    try {
      const [categoriesData, productsData] = await Promise.all([
        getCategories(),
        getProducts(),
      ]);

      const sortedCategories = categoriesData.sort((a, b) => a.order - b.order);
      const activeProducts = productsData.filter((p) => p.isActive);

      setCategories(sortedCategories);
      setProducts(activeProducts);

      // Set default category if none selected
      if (sortedCategories.length > 0 && !productForm.categoryId) {
        setProductForm((prev) => ({
          ...prev,
          categoryId: sortedCategories[0].id,
        }));
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

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.categoryId === selectedCategory);

  // Category handlers
  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        color: category.color,
        order: category.order,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: "",
        color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
        order: categories.length + 1,
      });
    }
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoria es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast({ title: "Categoria actualizada" });
      } else {
        await saveCategory(categoryForm);
        toast({ title: "Categoria creada" });
      }

      setShowCategoryDialog(false);
      await loadData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la categoría",
        variant: "destructive",
      });
    }
  };

  // Product handlers
  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price,
        categoryId: product.categoryId,
        stock: product.stock,
        minStock: product.minStock,
        hasInventoryControl: product.hasInventoryControl,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: "",
        price: 0,
        categoryId: categories[0]?.id || "",
        stock: 0,
        minStock: 0,
        hasInventoryControl: false,
      });
    }
    setShowProductDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del producto es requerido",
        variant: "destructive",
      });
      return;
    }

    if (productForm.price <= 0) {
      toast({
        title: "Error",
        description: "El precio debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if (!productForm.categoryId) {
      toast({
        title: "Error",
        description: "Selecciona una categoria",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productForm);
        toast({ title: "Producto actualizado" });
      } else {
        await saveProduct({ ...productForm, isActive: true });
        toast({ title: "Producto creado" });
      }

      setShowProductDialog(false);
      await loadData();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el producto",
        variant: "destructive",
      });
    }
  };

  // Delete handlers
  const openDeleteDialog = (type: "category" | "product", id: string) => {
    setDeleteTarget({ type, id });
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "category") {
        const categoryProducts = products.filter(
          (p) => p.categoryId === deleteTarget.id,
        );
        if (categoryProducts.length > 0) {
          toast({
            title: "Error",
            description:
              "No puedes eliminar una categoria con productos. Elimina o mueve los productos primero.",
            variant: "destructive",
          });
          setShowDeleteDialog(false);
          return;
        }
        await deleteCategory(deleteTarget.id);
        toast({ title: "Categoria eliminada" });
      } else {
        await deleteProduct(deleteTarget.id);
        toast({ title: "Producto eliminado" });
      }

      setShowDeleteDialog(false);
      await loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar",
        variant: "destructive",
      });
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Sin categoria";
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.color || "#6b7280";
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gestion del Menu</h1>
            <p className="text-muted-foreground">
              Administra categorias y productos
            </p>
          </div>
        </div>

        <Tabs defaultValue="products" className="flex-1 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Categorias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 flex flex-col mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 overflow-x-auto">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                >
                  Todos
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={
                      selectedCategory === cat.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      backgroundColor:
                        selectedCategory === cat.id ? cat.color : undefined,
                      borderColor: cat.color,
                      color: selectedCategory === cat.id ? "#fff" : cat.color,
                    }}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
              <Button onClick={() => openProductDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Producto
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pr-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{product.name}</h3>
                          <Badge
                            variant="outline"
                            className="mt-1"
                            style={{
                              borderColor: getCategoryColor(product.categoryId),
                              color: getCategoryColor(product.categoryId),
                            }}
                          >
                            {getCategoryName(product.categoryId)}
                          </Badge>
                        </div>
                        <p className="text-xl font-bold text-primary">
                          $
                          {product.price.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {product.hasInventoryControl ? (
                            <div className="flex items-center gap-1">
                              Stock:
                              <span
                                className={
                                  product.stock <= product.minStock
                                    ? "text-destructive font-medium"
                                    : ""
                                }
                              >
                                {product.stock}
                              </span>
                              {product.stock <= product.minStock && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          ) : (
                            <span>Sin control de inventario</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openProductDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              openDeleteDialog("product", product.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="categories" className="flex-1 flex flex-col mt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openCategoryDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Categoria
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pr-4">
                {categories.map((category) => {
                  const productCount = products.filter(
                    (p) => p.categoryId === category.id,
                  ).length;
                  return (
                    <Card key={category.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: category.color }}
                            >
                              <FolderOpen className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {category.name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {productCount} producto
                                {productCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openCategoryDialog(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                openDeleteDialog("category", category.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Category Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nueva Categoria"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Nombre</Label>
                <Input
                  id="categoryName"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Ej: Pescados"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-10 w-10 rounded-lg transition-transform ${
                        categoryForm.color === color
                          ? "ring-2 ring-offset-2 ring-primary scale-110"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setCategoryForm((prev) => ({ ...prev, color }))
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryOrder">Orden</Label>
                <Input
                  id="categoryOrder"
                  type="number"
                  value={categoryForm.order}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      order: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCategoryDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveCategory}>
                {editingCategory ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Dialog */}
        <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Nombre</Label>
                <Input
                  id="productName"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Ej: Filete de Pescado"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productPrice">Precio</Label>
                  <InputNumber
                    id="productPrice"
                    value={productForm.price}
                    onChange={(value) =>
                      setProductForm((prev) => ({ ...prev, price: value }))
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productCategory">Categoria</Label>
                  <Select
                    value={productForm.categoryId}
                    onValueChange={(value) =>
                      setProductForm((prev) => ({ ...prev, categoryId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Control de Inventario</Label>
                  <p className="text-sm text-muted-foreground">
                    Activar para descontar stock en cada venta
                  </p>
                </div>
                <Switch
                  checked={productForm.hasInventoryControl}
                  onCheckedChange={(checked) =>
                    setProductForm((prev) => ({
                      ...prev,
                      hasInventoryControl: checked,
                    }))
                  }
                />
              </div>
              {productForm.hasInventoryControl && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productStock">Stock Actual</Label>
                    <InputNumber
                      id="productStock"
                      value={productForm.stock}
                      onChange={(value) =>
                        setProductForm((prev) => ({ ...prev, stock: value }))
                      }
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productMinStock">Stock Minimo</Label>
                    <InputNumber
                      id="productMinStock"
                      value={productForm.minStock}
                      onChange={(value) =>
                        setProductForm((prev) => ({ ...prev, minStock: value }))
                      }
                      min={0}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowProductDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveProduct}>
                {editingProduct ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Eliminacion</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.type === "category"
                  ? "¿Estas seguro de eliminar esta categoria? Esta accion no se puede deshacer."
                  : "¿Estas seguro de eliminar este producto? Esta accion no se puede deshacer."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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
