// Database functions using Supabase
import { supabase, handleSupabaseError } from "./supabase";
import type {
  Category,
  Product,
  Employee,
  Sale,
  Expense,
  EmployeePayment,
  DailyClosure,
  SystemConfig,
  DailyStats,
  MonthlyStats,
  ProductStats,
  LowStockProduct,
  SaleItem,
  MajorCashAccount,
  MajorCashSummary,
} from "./types";

// Helper functions
function generateId(): string {
  return crypto.randomUUID();
}

export function getTodayDate(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

// Categories
export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("order", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleSupabaseError(error, "Error al cargar categorías");
    return [];
  }
}

export async function saveCategory(
  category: Omit<Category, "id" | "createdAt" | "updatedAt">,
): Promise<Category> {
  try {
    const newCategory = {
      ...category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("categories")
      .insert(newCategory)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      color: data.color,
      order: data.order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al guardar categoría");
    throw error;
  }
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>,
): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      color: data.color,
      order: data.order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al actualizar categoría");
    return null;
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, "Error al eliminar categoría");
    return false;
  }
}

// Products
export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;
    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price),
      categoryId: p.category_id,
      stock: p.stock,
      minStock: p.min_stock,
      hasInventoryControl: p.has_inventory_control,
      isActive: p.is_active,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar productos");
    return [];
  }
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.categoryId === categoryId && p.isActive);
}

export async function saveProduct(
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
): Promise<Product> {
  try {
    const newProduct = {
      name: product.name,
      price: product.price,
      category_id: product.categoryId,
      stock: product.stock,
      min_stock: product.minStock,
      has_inventory_control: product.hasInventoryControl,
      is_active: product.isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("products")
      .insert(newProduct)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      price: parseFloat(data.price),
      categoryId: data.category_id,
      stock: data.stock,
      minStock: data.min_stock,
      hasInventoryControl: data.has_inventory_control,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al guardar producto");
    throw error;
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>,
): Promise<Product | null> {
  try {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.categoryId !== undefined)
      updateData.category_id = updates.categoryId;
    if (updates.stock !== undefined) updateData.stock = updates.stock;
    if (updates.minStock !== undefined) updateData.min_stock = updates.minStock;
    if (updates.hasInventoryControl !== undefined)
      updateData.has_inventory_control = updates.hasInventoryControl;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      price: parseFloat(data.price),
      categoryId: data.category_id,
      stock: data.stock,
      minStock: data.min_stock,
      hasInventoryControl: data.has_inventory_control,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al actualizar producto");
    return null;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, "Error al eliminar producto");
    return false;
  }
}

export async function updateProductStock(
  id: string,
  quantity: number,
): Promise<boolean> {
  try {
    // Primero obtenemos el producto actual
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("stock, has_inventory_control")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (product.has_inventory_control) {
      const newStock = Math.max(0, product.stock - quantity);

      const { error: updateError } = await supabase
        .from("products")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;
    }

    return true;
  } catch (error) {
    handleSupabaseError(error, "Error al actualizar stock");
    return false;
  }
}

// Employees
export async function getEmployees(): Promise<Employee[]> {
  try {
    const { data, error } = await supabase.from("employees").select("*");

    if (error) throw error;
    return (data || []).map((e) => ({
      id: e.id,
      name: e.name,
      position: e.position,
      dailyPayBase: parseFloat(e.daily_pay_base),
      isActive: e.is_active,
      createdAt: e.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar empleados");
    return [];
  }
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const employees = await getEmployees();
  return employees.filter((e) => e.isActive);
}

export async function saveEmployee(
  employee: Omit<Employee, "id" | "createdAt">,
): Promise<Employee> {
  try {
    const newEmployee = {
      name: employee.name,
      position: employee.position,
      daily_pay_base: employee.dailyPayBase,
      is_active: employee.isActive,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("employees")
      .insert(newEmployee)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      position: data.position,
      dailyPayBase: parseFloat(data.daily_pay_base),
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al guardar empleado");
    throw error;
  }
}

export async function updateEmployee(
  id: string,
  updates: Partial<Employee>,
): Promise<Employee | null> {
  try {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.dailyPayBase !== undefined)
      updateData.daily_pay_base = updates.dailyPayBase;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from("employees")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      position: data.position,
      dailyPayBase: parseFloat(data.daily_pay_base),
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al actualizar empleado");
    return null;
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("employees")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, "Error al eliminar empleado");
    return false;
  }
}

// Sales
export async function getSales(): Promise<Sale[]> {
  try {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((s) => ({
      id: s.id,
      items: s.items,
      subtotal: parseFloat(s.subtotal),
      total: parseFloat(s.total),
      cashAmount: parseFloat(s.cash_amount),
      transferAmount: parseFloat(s.transfer_amount),
      cashReceived: parseFloat(s.cash_received),
      cashReturned: parseFloat(s.cash_returned),
      paymentMethod: s.payment_method,
      status: s.status,
      createdAt: s.created_at,
      cancelledAt: s.cancelled_at,
      cancelledBy: s.cancelled_by,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar ventas");
    return [];
  }
}

export async function getTodaySales(): Promise<Sale[]> {
  try {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((s) => ({
      id: s.id,
      items: s.items,
      subtotal: parseFloat(s.subtotal),
      total: parseFloat(s.total),
      cashAmount: parseFloat(s.cash_amount),
      transferAmount: parseFloat(s.transfer_amount),
      cashReceived: parseFloat(s.cash_received),
      cashReturned: parseFloat(s.cash_returned),
      paymentMethod: s.payment_method,
      status: s.status,
      createdAt: s.created_at,
      cancelledAt: s.cancelled_at,
      cancelledBy: s.cancelled_by,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar ventas del día");
    return [];
  }
}

export async function saveSale(
  sale: Omit<Sale, "id" | "createdAt" | "status">,
): Promise<Sale | null> {
  try {
    // Check if daily closure exists
    if (await hasDailyClosure()) {
      return null;
    }

    // Calcular cambio devuelto si aplica
    const cashReturned =
      sale.cashReceived > sale.cashAmount
        ? sale.cashReceived - sale.cashAmount
        : 0;

    const newSale = {
      items: sale.items,
      subtotal: sale.subtotal,
      total: sale.total,
      cash_amount: sale.cashAmount,
      transfer_amount: sale.transferAmount,
      cash_received: sale.cashReceived,
      cash_returned: cashReturned,
      payment_method: sale.paymentMethod,
      status: "completed",
      // created_at -> lo pone la BD
    };

    const { data, error } = await supabase
      .from("sales")
      .insert(newSale)
      .select()
      .single();

    if (error) throw error;

    // Update stock for products with inventory control
    for (const item of sale.items) {
      await updateProductStock(item.productId, item.quantity);
    }

    // Registrar transferencia en caja mayor si existe
    if (sale.transferAmount > 0) {
      await registerTransferIncome(
        sale.transferAmount,
        `Venta #${data.id.slice(-6)}`,
        "system",
      );
    }

    return {
      id: data.id,
      items: data.items,
      subtotal: parseFloat(data.subtotal),
      total: parseFloat(data.total),
      cashAmount: parseFloat(data.cash_amount),
      transferAmount: parseFloat(data.transfer_amount),
      cashReceived: parseFloat(data.cash_received),
      cashReturned: parseFloat(data.cash_returned),
      paymentMethod: data.payment_method,
      status: data.status,
      createdAt: data.created_at, // ya viene correcto (-05:00)
    };
  } catch (error) {
    handleSupabaseError(error, "Error al guardar venta");
    return null;
  }
}

export async function cancelSale(
  id: string,
  cancelledBy: string,
): Promise<Sale | null> {
  try {
    // Primero obtenemos la venta
    const { data: sale, error: fetchError } = await supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Actualizamos la venta
    const { data, error } = await supabase
      .from("sales")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Restaurar stock para productos con control de inventario
    const products = await getProducts();
    const saleItems: SaleItem[] = sale.items;

    for (const item of saleItems) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.hasInventoryControl) {
        await updateProductStock(item.productId, -item.quantity); // Restar negativo = sumar
      }
    }

    // REVERTIR TRANSFERENCIA EN CAJA MAYOR si existía
    if (sale.transfer_amount > 0) {
      await registerTransferExpense(
        sale.transfer_amount,
        `ANULACIÓN Venta #${sale.id.slice(-6)}`,
        cancelledBy,
      );
    }

    return {
      id: data.id,
      items: data.items,
      subtotal: parseFloat(data.subtotal),
      total: parseFloat(data.total),
      cashAmount: parseFloat(data.cash_amount),
      transferAmount: parseFloat(data.transfer_amount),
      cashReceived: parseFloat(data.cash_received),
      cashReturned: parseFloat(data.cash_returned),
      paymentMethod: data.payment_method,
      status: data.status,
      createdAt: data.created_at,
      cancelledAt: data.cancelled_at,
      cancelledBy: data.cancelled_by,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al cancelar venta");
    return null;
  }
}

// Expenses
export async function getExpenses(): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((e) => ({
      id: e.id,
      description: e.description,
      amount: parseFloat(e.amount),
      category: e.category,
      paymentMethod: e.payment_method, // Nueva propiedad
      fromCashRegister: e.from_cash_register, // Nueva propiedad
      createdAt: e.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar gastos");
    return [];
  }
}

export async function getTodayExpenses(): Promise<Expense[]> {
  try {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((e) => ({
      id: e.id,
      description: e.description,
      amount: parseFloat(e.amount),
      category: e.category,
      paymentMethod: e.payment_method, // Nueva propiedad
      fromCashRegister: e.from_cash_register, // Nueva propiedad
      createdAt: e.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar gastos del día");
    return [];
  }
}

export async function saveExpense(
  expense: Omit<Expense, "id" | "createdAt">,
): Promise<Expense | null> {
  try {
    // Check if daily closure exists
    if (await hasDailyClosure()) {
      return null;
    }

    const newExpense = {
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      payment_method: expense.paymentMethod,
      from_cash_register: expense.fromCashRegister || false,
    };

    const { data, error } = await supabase
      .from("expenses")
      .insert(newExpense)
      .select()
      .single();

    if (error) throw error;

    // REGISTRAR EN CAJA MAYOR según método de pago
    if (expense.paymentMethod === "transfer") {
      // Gasto por transferencia → resta de Transferencias
      await registerTransferExpense(
        expense.amount,
        `Gasto: ${expense.description}`,
        "system",
      );
    } else if (expense.paymentMethod === "cash" && !expense.fromCashRegister) {
      // Gasto en efectivo fuera de caja → resta de Efectivo Guardado
      await registerSavedCashExpense(
        expense.amount,
        `Gasto externo: ${expense.description}`,
        "system",
      );
    }
    // Si es efectivo de caja, no se registra en caja mayor (solo afecta caja menor)

    return {
      id: data.id,
      description: data.description,
      amount: parseFloat(data.amount),
      category: data.category,
      paymentMethod: data.payment_method,
      fromCashRegister: data.from_cash_register,
      createdAt: data.created_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al guardar gasto");
    return null;
  }
}
export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, "Error al eliminar gasto");
    return false;
  }
}

// Employee Payments
export async function getEmployeePayments(): Promise<EmployeePayment[]> {
  try {
    const { data, error } = await supabase
      .from("employee_payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((p) => ({
      id: p.id,
      employeeId: p.employee_id,
      employeeName: p.employee_name,
      position: p.position,
      baseAmount: parseFloat(p.base_amount),
      finalAmount: parseFloat(p.final_amount),
      notes: p.notes,
      paymentMethod: p.payment_method, // Nueva propiedad
      fromCashRegister: p.from_cash_register,
      createdAt: p.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar pagos de empleados");
    return [];
  }
}

export async function getTodayEmployeePayments(): Promise<EmployeePayment[]> {
  try {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from("employee_payments")
      .select("*")
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((p) => ({
      id: p.id,
      employeeId: p.employee_id,
      employeeName: p.employee_name,
      position: p.position,
      baseAmount: parseFloat(p.base_amount),
      finalAmount: parseFloat(p.final_amount),
      notes: p.notes,
      paymentMethod: p.payment_method, // Nueva propiedad
      fromCashRegister: p.from_cash_register,
      createdAt: p.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar pagos del día");
    return [];
  }
}

export async function saveEmployeePayment(
  payment: Omit<EmployeePayment, "id" | "createdAt">,
): Promise<EmployeePayment | null> {
  try {
    // Check if daily closure exists
    if (await hasDailyClosure()) {
      return null;
    }

    const newPayment = {
      employee_id: payment.employeeId,
      employee_name: payment.employeeName,
      position: payment.position,
      base_amount: payment.baseAmount,
      final_amount: payment.finalAmount,
      notes: payment.notes,
      payment_method: payment.paymentMethod,
      from_cash_register: payment.fromCashRegister,
    };

    const { data, error } = await supabase
      .from("employee_payments")
      .insert(newPayment)
      .select()
      .single();

    if (error) throw error;

    // REGISTRAR EN CAJA MAYOR según método de pago
    if (payment.paymentMethod === "transfer") {
      // Pago por transferencia → resta de Transferencias
      await registerTransferExpense(
        payment.finalAmount,
        `Pago a ${payment.employeeName}`,
        "system",
      );
    } else if (payment.paymentMethod === "cash" && !payment.fromCashRegister) {
      // Pago en efectivo fuera de caja → resta de Efectivo Guardado
      await registerSavedCashExpense(
        payment.finalAmount,
        `Pago externo a ${payment.employeeName}`,
        "system",
      );
    }
    // Si es efectivo de caja, no se registra en caja mayor (solo afecta caja menor)

    return {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: data.employee_name,
      position: data.position,
      baseAmount: parseFloat(data.base_amount),
      finalAmount: parseFloat(data.final_amount),
      notes: data.notes,
      paymentMethod: data.payment_method,
      fromCashRegister: data.from_cash_register,
      createdAt: data.created_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al guardar pago de empleado");
    return null;
  }
}

export async function deleteEmployeePayment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("employee_payments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, "Error al eliminar pago de empleado");
    return false;
  }
}

// Daily Closures
export async function getDailyClosures(): Promise<DailyClosure[]> {
  try {
    const { data, error } = await supabase
      .from("daily_closures")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return (data || []).map((c) => ({
      id: c.id,
      date: c.date,
      sales: c.sales,
      totalSales: parseFloat(c.total_sales),
      totalCash: parseFloat(c.total_cash),
      totalTransfer: parseFloat(c.total_transfer),
      expenses: c.expenses,
      totalExpenses: parseFloat(c.total_expenses),
      employeePayments: c.employee_payments,
      totalPayments: parseFloat(c.total_payments),
      lowStockProducts: c.low_stock_products,
      dailyBase: parseFloat(c.daily_base),
      createdAt: c.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar cierres diarios");
    return [];
  }
}

export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  try {
    const products = await getProducts();
    return products
      .filter(
        (p) => p.isActive && p.hasInventoryControl && p.stock <= p.minStock,
      )
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        currentStock: p.stock,
        minStock: p.minStock,
        suggestedOrder: Math.max(p.minStock * 2 - p.stock, p.minStock),
      }));
  } catch (error) {
    console.error("Error al cargar productos con stock bajo:", error);
    return [];
  }
}

export async function createDailyClosure(): Promise<DailyClosure> {
  try {
    const today = getTodayDate();

    // Check if closure already exists for today
    const closures = await getDailyClosures();
    const existingClosure = closures.find((c) => c.date === today);
    if (existingClosure) {
      return existingClosure;
    }

    // Obtener datos del día
    const todaySales = await getTodaySales();
    const todayExpenses = await getTodayExpenses();
    const todayPayments = await getTodayEmployeePayments();
    const config = await getConfig();
    const lowStockProducts = await getLowStockProducts();

    // Cálculos básicos
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

    // Gastos en efectivo (de caja menor)
    const cashExpenses = todayExpenses
      .filter((e) => e.paymentMethod === "cash" && e.fromCashRegister)
      .reduce((sum, e) => sum + e.amount, 0);

    // Pagos en efectivo (de caja menor)
    const cashPayments = todayPayments
      .filter((p) => p.paymentMethod === "cash" && p.fromCashRegister)
      .reduce((sum, p) => sum + p.finalAmount, 0);

    // Calcular efectivo que debería haber en caja
    const cashBeforeClosure =
      config.dailyBase + // Base diaria
      totalCash - // Efectivo neto de ventas
      cashExpenses - // Gastos en efectivo
      cashPayments; // Pagos en efectivo

    // ===============================================
    // CORRECCIÓN: SOLO TRANSFERIR, NO REGISTRAR GASTO
    // ===============================================

    // Calcular excedente para transferir
    const excessCash = Math.max(0, cashBeforeClosure - config.dailyBase);

    // Si hay excedente, SOLO transferir a caja mayor
    if (excessCash > 0) {
      const transferDescription = `Cierre diario ${today} - Excedente a caja mayor`;

      await addMajorCashMovement({
        type: "saved_cash",
        description: transferDescription,
        amount: excessCash,
        movementType: "income",
        notes: `Transferencia automática de cierre. Base diaria: $${config.dailyBase}, Excedente: $${excessCash}`,
        createdBy: "system",
      });

      console.log(`Transferido $${excessCash} a Efectivo Guardado`);
    }
    // ===============================================

    // Crear objeto de cierre
    // En createDailyClosure(), modifica el objeto de cierre:
    const closure = {
      date: today,
      sales: todaySales,
      total_sales: totalSales,
      total_cash: totalCash,
      total_transfer: totalTransfer,
      expenses: todayExpenses,
      total_expenses: totalExpenses,
      employee_payments: todayPayments,
      total_payments: totalPayments,
      low_stock_products: lowStockProducts,
      daily_base: config.dailyBase,
      cash_excess_transferred: excessCash,
    };

    const { data, error } = await supabase
      .from("daily_closures")
      .insert(closure)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      date: data.date,
      sales: data.sales,
      totalSales: parseFloat(data.total_sales),
      totalCash: parseFloat(data.total_cash),
      totalTransfer: parseFloat(data.total_transfer),
      expenses: data.expenses,
      totalExpenses: parseFloat(data.total_expenses),
      employeePayments: data.employee_payments,
      totalPayments: parseFloat(data.total_payments),
      lowStockProducts: data.low_stock_products,
      dailyBase: parseFloat(data.daily_base),
      createdAt: data.created_at,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al crear cierre diario");
    throw error;
  }
}

export async function calculateDailyCashSummary(): Promise<{
  dailyBase: number;
  cashSales: number; // Efectivo NETO que entra a caja
  cashExpenses: number; // Efectivo que sale de caja
  cashPayments: number; // Efectivo que sale de caja
  expectedCash: number; // Efectivo que debería haber
  excessToTransfer: number; // Excedente sobre la base
  cashReceived: number; // Solo para información (dinero recibido de clientes)
  cashReturned: number; // Solo para información (cambio devuelto)
}> {
  const todaySales = await getTodaySales();
  const todayExpenses = await getTodayExpenses();
  const todayPayments = await getTodayEmployeePayments();
  const config = await getConfig();

  // Efectivo NETO que realmente entra a caja
  const cashSales = todaySales.reduce((sum, s) => sum + s.cashAmount, 0);

  // Solo para información (no usado en cálculos)
  const cashReceived = todaySales.reduce((sum, s) => sum + s.cashReceived, 0);
  const cashReturned = todaySales.reduce((sum, s) => sum + s.cashReturned, 0);

  const cashExpenses = todayExpenses
    .filter((e) => e.paymentMethod === "cash" && e.fromCashRegister)
    .reduce((sum, e) => sum + e.amount, 0);

  const cashPayments = todayPayments
    .filter((p) => p.paymentMethod === "cash" && p.fromCashRegister)
    .reduce((sum, p) => sum + p.finalAmount, 0);

  // Cálculo CORREGIDO: El cambio devuelto NO afecta
  const expectedCash =
    config.dailyBase + cashSales - cashExpenses - cashPayments;
  const excessToTransfer = Math.max(0, expectedCash - config.dailyBase);

  return {
    dailyBase: config.dailyBase,
    cashSales,
    cashExpenses,
    cashPayments,
    expectedCash,
    excessToTransfer,
    cashReceived, // Solo para mostrar
    cashReturned, // Solo para mostrar
  };
}

export async function getConfig(): Promise<SystemConfig> {
  try {
    const { data, error } = await supabase
      .from("system_config")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;

    return {
      topN: data.top_n,
      alertEmail: data.alert_email,
      businessName: data.business_name,
      businessAddress: data.business_address,
      businessPhone: data.business_phone,
      businessNIT: data.business_nit,
      dailyBase: parseFloat(data.daily_base),
      reopenPassword: data.reopen_password,
    };
  } catch (error) {
    console.error(
      "Error al cargar configuración, usando valores por defecto:",
      error,
    );
    return {
      topN: 10,
      alertEmail: "",
      businessName: "Mi Restaurante",
      businessAddress: "",
      businessPhone: "",
      businessNIT: "",
      dailyBase: 500,
      reopenPassword: "1234",
    };
  }
}

export async function updateConfig(
  updates: Partial<SystemConfig>,
): Promise<SystemConfig> {
  try {
    const updateData: any = {};

    if (updates.topN !== undefined) updateData.top_n = updates.topN;
    if (updates.alertEmail !== undefined)
      updateData.alert_email = updates.alertEmail;
    if (updates.businessName !== undefined)
      updateData.business_name = updates.businessName;
    if (updates.businessAddress !== undefined)
      updateData.business_address = updates.businessAddress;
    if (updates.businessPhone !== undefined)
      updateData.business_phone = updates.businessPhone;
    if (updates.businessNIT !== undefined)
      updateData.business_nit = updates.businessNIT;
    if (updates.dailyBase !== undefined)
      updateData.daily_base = updates.dailyBase;
    if (updates.reopenPassword !== undefined)
      updateData.reopen_password = updates.reopenPassword;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("system_config")
      .update(updateData)
      .eq("id", "11111111-1111-1111-1111-111111111111")
      .select()
      .single();

    if (error) throw error;

    return {
      topN: data.top_n,
      alertEmail: data.alert_email,
      businessName: data.business_name,
      businessAddress: data.business_address,
      businessPhone: data.business_phone,
      businessNIT: data.business_nit,
      dailyBase: parseFloat(data.daily_base),
      reopenPassword: data.reopen_password,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al actualizar configuración");
    throw error;
  }
}

export async function getDailyStats(days: number = 30): Promise<DailyStats[]> {
  try {
    const closures = await getDailyClosures();
    const today = getTodayDate();
    const stats: DailyStats[] = [];

    // Get today's data from memory (not yet in closures)
    const todaySales = await getTodaySales();
    const todayExpenses = await getTodayExpenses();
    const todayPayments = await getTodayEmployeePayments();

    const todayTotalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayTotalExpenses = todayExpenses.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    const todayTotalPayments = todayPayments.reduce(
      (sum, p) => sum + p.finalAmount,
      0,
    );

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      if (dateStr === today) {
        // Use today's data from memory
        stats.push({
          date: dateStr,
          totalSales: todayTotalSales,
          totalExpenses: todayTotalExpenses,
          totalPayments: todayTotalPayments,
        });
      } else {
        // Use data from closures
        const closure = closures.find((c) => c.date === dateStr);
        stats.push({
          date: dateStr,
          totalSales: closure?.totalSales || 0,
          totalExpenses: closure?.totalExpenses || 0,
          totalPayments: closure?.totalPayments || 0,
        });
      }
    }

    return stats;
  } catch (error) {
    console.error("Error al cargar estadísticas diarias:", error);
    return [];
  }
}

export async function getMonthlyStats(
  months: number = 12,
): Promise<MonthlyStats[]> {
  try {
    const closures = await getDailyClosures();
    const today = getTodayDate();
    const currentMonth = today.slice(0, 7); // "YYYY-MM"
    const stats: MonthlyStats[] = [];

    // Get today's data from memory
    const todaySales = await getTodaySales();
    const todayExpenses = await getTodayExpenses();
    const todayPayments = await getTodayEmployeePayments();

    const todayTotalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayTotalExpenses = todayExpenses.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    const todayTotalPayments = todayPayments.reduce(
      (sum, p) => sum + p.finalAmount,
      0,
    );

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);

      // Filter closures for this month, excluding today if it's current month
      const monthClosures = closures.filter(
        (c) =>
          c.date.startsWith(monthStr) &&
          (monthStr !== currentMonth || c.date !== today),
      );

      let monthSales = monthClosures.reduce((sum, c) => sum + c.totalSales, 0);
      let monthExpenses = monthClosures.reduce(
        (sum, c) => sum + c.totalExpenses,
        0,
      );
      let monthPayments = monthClosures.reduce(
        (sum, c) => sum + c.totalPayments,
        0,
      );

      // Add today's data if it's the current month
      if (monthStr === currentMonth) {
        monthSales += todayTotalSales;
        monthExpenses += todayTotalExpenses;
        monthPayments += todayTotalPayments;
      }

      stats.push({
        month: monthStr,
        totalSales: monthSales,
        totalExpenses: monthExpenses,
        totalPayments: monthPayments,
      });
    }

    return stats;
  } catch (error) {
    console.error("Error al cargar estadísticas mensuales:", error);
    return [];
  }
}

export async function getTopProducts(
  n: number,
  period?: string,
): Promise<ProductStats[]> {
  try {
    const closures = await getDailyClosures();
    const filteredClosures = period
      ? closures.filter((c) => c.date.startsWith(period))
      : closures;

    const productMap = new Map<string, ProductStats>();

    filteredClosures.forEach((closure) => {
      closure.sales.forEach((sale) => {
        sale.items.forEach((item: SaleItem) => {
          const existing = productMap.get(item.productId) || {
            productId: item.productId,
            productName: item.productName,
            totalQuantity: 0,
            totalRevenue: 0,
          };
          existing.totalQuantity += item.quantity;
          existing.totalRevenue += item.total;
          productMap.set(item.productId, existing);
        });
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, n);
  } catch (error) {
    console.error("Error al cargar productos más vendidos:", error);
    return [];
  }
}

export async function getBottomProducts(
  n: number,
  period?: string,
): Promise<ProductStats[]> {
  try {
    const closures = await getDailyClosures();
    const filteredClosures = period
      ? closures.filter((c) => c.date.startsWith(period))
      : closures;

    const productMap = new Map<string, ProductStats>();
    const products = await getProducts();

    // Initialize all active products with zero sales
    products.forEach((p) => {
      productMap.set(p.id, {
        productId: p.id,
        productName: p.name,
        totalQuantity: 0,
        totalRevenue: 0,
      });
    });

    // Add actual sales data
    filteredClosures.forEach((closure) => {
      closure.sales.forEach((sale) => {
        sale.items.forEach((item: SaleItem) => {
          const existing = productMap.get(item.productId);
          if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalRevenue += item.total;
          }
        });
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => a.totalQuantity - b.totalQuantity)
      .slice(0, n);
  } catch (error) {
    console.error("Error al cargar productos menos vendidos:", error);
    return [];
  }
}

export async function hasDailyClosure(): Promise<boolean> {
  try {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from("daily_closures")
      .select("id")
      .eq("date", today)
      .single();

    // Si no hay error y hay data, existe el cierre
    return !error && data !== null;
  } catch (error) {
    // Si hay error (como ningún registro encontrado), no existe el cierre
    return false;
  }
}

export async function getCashRegisterStatus(): Promise<"open" | "closed"> {
  return (await hasDailyClosure()) ? "closed" : "open";
}

export async function reopenCashRegister(password: string): Promise<{
  success: boolean;
  message: string;
  revertedAmount?: number;
}> {
  try {
    const config = await getConfig();
    const today = getTodayDate();
    
    // Verificar contraseña
    if (password !== config.reopenPassword) {
      return {
        success: false,
        message: "Contraseña incorrecta"
      };
    }

    // Buscar el cierre del día actual
    const { data: closure, error: fetchError } = await supabase
      .from("daily_closures")
      .select("*, cash_excess_transferred")
      .eq("date", today)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error al buscar cierre:", fetchError);
      return {
        success: false,
        message: "Error al verificar cierre"
      };
    }

    let revertedAmount = 0;
    
    // Si hay cierre con transferencia, revertirla
    if (closure && closure.cash_excess_transferred > 0) {
      revertedAmount = closure.cash_excess_transferred;
      
      // Revertir transferencia en caja mayor (EGRESO en "Efectivo Guardado")
      const revertResult = await addMajorCashMovement({
        type: "saved_cash",
        description: `REAPERTURA - Reversión cierre ${today}`,
        amount: revertedAmount,
        movementType: "expense",
        notes: `Reversión por reapertura de caja. Monto original: $${revertedAmount}`,
        createdBy: "system",
      });
      
      if (!revertResult) {
        return {
          success: false,
          message: "Error al revertir transferencia de caja mayor"
        };
      }
      
      console.log(`Revertido $${revertedAmount} de Efectivo Guardado`);
    }

    // Eliminar el cierre diario
    const { error: deleteError } = await supabase
      .from("daily_closures")
      .delete()
      .eq("date", today);

    if (deleteError) {
      console.error("Error al eliminar cierre:", deleteError);
      return {
        success: false,
        message: "Error al eliminar registro de cierre"
      };
    }

    // Mensaje de éxito
    const message = revertedAmount > 0
      ? `✅ Caja reabierta. Se restó $${revertedAmount} de Efectivo Guardado`
      : "✅ Caja reabierta exitosamente";
    
    return {
      success: true,
      message,
      revertedAmount
    };
    
  } catch (error) {
    console.error("Error al reabrir caja:", error);
    return {
      success: false,
      message: "❌ Error interno al reabrir caja"
    };
  }
}

export async function verifyLogin(
  username: string,
  password: string,
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc("verify_user_password", {
      username_text: username,
      password_text: password,
    });

    if (error) {
      throw new Error(error.message || "Error en verificación de usuario");
    }

    if (data && data.length > 0) {
      return {
        id: data[0].id,
        username: data[0].username,
        name: data[0].name,
        role: data[0].role,
      };
    }

    const { data: users, error: queryError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (queryError) {
      throw new Error(queryError.message || "Error consultando usuario");
    }

    const validPasswords: Record<string, string> = {
      admin: "admin123",
      caja: "caja123",
      empleado: "empleado123",
    };

    if (users && validPasswords[username] === password) {
      return {
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
      };
    }

    return null;
  } catch (error) {
    console.error("Error en verifyLogin:", error instanceof Error ? error.message : error);
    return null;
  }
}


export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await supabase
      .from("users")
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch (error) {
    console.error("Error al actualizar último login:", error);
  }
}

export async function getUserById(userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, name, role, last_login")
      .eq("id", userId)
      .eq("is_active", true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return null;
  }
}

export async function createUser(userData: {
  username: string;
  name: string;
  role: string;
  password: string;
}): Promise<any> {
  try {
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: userData.username,
        name: userData.name,
        role: userData.role,
        password_hash: userData.password, // En producción, hash esta contraseña
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return null;
  }
}

export function checkPermission(requiredRoles: string[]): boolean {
  if (typeof window === "undefined") return false;

  const userData = localStorage.getItem("pos_user");
  if (!userData) return false;

  try {
    const user = JSON.parse(userData);
    return requiredRoles.includes(user.role);
  } catch {
    return false;
  }
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;

  const userData = localStorage.getItem("pos_user");
  if (!userData) return null;

  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("pos_user");
}

// Agregar estas funciones después de las demás

// Caja Mayor - Cuentas
export async function getMajorCashAccounts(): Promise<MajorCashAccount[]> {
  try {
    const { data, error } = await supabase
      .from("major_cash_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      amount: parseFloat(a.amount),
      movementType: a.movement_type,
      notes: a.notes,
      createdAt: a.created_at,
      createdBy: a.created_by,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar cuentas de caja mayor");
    return [];
  }
}

export async function getMajorCashSummary(): Promise<MajorCashSummary> {
  try {
    const accounts = await getMajorCashAccounts();

    const totalTransfers = accounts
      .filter((a) => a.type === "transfer")
      .reduce(
        (sum, a) =>
          a.movementType === "income" ? sum + a.amount : sum - a.amount,
        0,
      );

    const totalSavedCash = accounts
      .filter((a) => a.type === "saved_cash")
      .reduce(
        (sum, a) =>
          a.movementType === "income" ? sum + a.amount : sum - a.amount,
        0,
      );

    return {
      totalTransfers,
      totalSavedCash,
      totalMajorCash: totalTransfers + totalSavedCash,
      lastUpdate:
        accounts.length > 0 ? accounts[0].createdAt : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error al calcular resumen de caja mayor:", error);
    return {
      totalTransfers: 0,
      totalSavedCash: 0,
      totalMajorCash: 0,
      lastUpdate: new Date().toISOString(),
    };
  }
}

export async function addMajorCashMovement(
  movement: Omit<MajorCashAccount, "id" | "createdAt">,
): Promise<MajorCashAccount | null> {
  try {
    const newMovement = {
      type: movement.type,
      description: movement.description,
      amount: movement.amount,
      movement_type: movement.movementType,
      notes: movement.notes,
      created_by: movement.createdBy,
    };

    const { data, error } = await supabase
      .from("major_cash_accounts")
      .insert(newMovement)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      type: data.type,
      description: data.description,
      amount: parseFloat(data.amount),
      movementType: data.movement_type,
      notes: data.notes,
      createdAt: data.created_at,
      createdBy: data.created_by,
    };
  } catch (error) {
    handleSupabaseError(error, "Error al agregar movimiento de caja mayor");
    return null;
  }
}

export async function registerTransferIncome(
  amount: number,
  description: string,
  user: string,
) {
  return addMajorCashMovement({
    type: "transfer",
    description,
    amount,
    movementType: "income",
    notes: "Transferencia de venta",
    createdBy: user,
  });
}

export async function registerTransferExpense(
  amount: number,
  description: string,
  user: string,
) {
  return addMajorCashMovement({
    type: "transfer",
    description,
    amount,
    movementType: "expense",
    notes: description,
    createdBy: user,
  });
}

export async function registerSavedCashIncome(
  amount: number,
  description: string,
  user: string,
) {
  return addMajorCashMovement({
    type: "saved_cash",
    description,
    amount,
    movementType: "income",
    notes: description,
    createdBy: user,
  });
}

export async function registerSavedCashExpense(
  amount: number,
  description: string,
  user: string,
) {
  return addMajorCashMovement({
    type: "saved_cash",
    description,
    amount,
    movementType: "expense",
    notes: description,
    createdBy: user,
  });
}

export async function deleteMajorCashMovement(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("major_cash_accounts")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, "Error al eliminar movimiento");
    return false;
  }
}

// Agrega esta función al final de database.ts
export async function getCurrentCashInRegister(): Promise<{
  dailyBase: number;
  cashSalesToday: number;
  cashExpensesToday: number;
  cashPaymentsToday: number;
  currentCash: number;
  isClosed: boolean;
  excessTransferred?: number; // NUEVO: para mostrar el excedente transferido
}> {
  try {
    const config = await getConfig();
    const todaySales = await getTodaySales();
    const todayExpenses = await getTodayExpenses();
    const todayPayments = await getTodayEmployeePayments();

    // Verificar si ya se hizo cierre hoy
    const hasClosure = await hasDailyClosure();

    // Calcular efectivo neto de ventas de hoy
    const cashSalesToday = todaySales.reduce((sum, s) => sum + s.cashAmount, 0);

    // Gastos en efectivo de caja menor hoy
    const cashExpensesToday = todayExpenses
      .filter((e) => e.paymentMethod === "cash" && e.fromCashRegister)
      .reduce((sum, e) => sum + e.amount, 0);

    // Pagos en efectivo de caja menor hoy
    const cashPaymentsToday = todayPayments
      .filter((p) => p.paymentMethod === "cash" && p.fromCashRegister)
      .reduce((sum, p) => sum + p.finalAmount, 0);

    // Calcular efectivo actual en caja
    let currentCash;
    let excessTransferred = 0;

    if (hasClosure) {
      // Si ya se hizo cierre:
      // 1. Primero calculamos cuánto había antes del cierre
      const cashBeforeClosure =
        config.dailyBase +
        cashSalesToday -
        cashExpensesToday -
        cashPaymentsToday;

      // 2. Calculamos el excedente que se transfirió
      excessTransferred = Math.max(0, cashBeforeClosure - config.dailyBase);

      // 3. Después del cierre, solo queda la base diaria
      currentCash = config.dailyBase;
    } else {
      // Si NO se hizo cierre, calcular normalmente
      currentCash =
        config.dailyBase +
        cashSalesToday -
        cashExpensesToday -
        cashPaymentsToday;
    }

    return {
      dailyBase: config.dailyBase,
      cashSalesToday,
      cashExpensesToday,
      cashPaymentsToday,
      currentCash,
      isClosed: hasClosure,
      excessTransferred: hasClosure ? excessTransferred : 0,
    };
  } catch (error) {
    console.error("Error al calcular efectivo en caja:", error);
    return {
      dailyBase: 0,
      cashSalesToday: 0,
      cashExpensesToday: 0,
      cashPaymentsToday: 0,
      currentCash: 0,
      isClosed: false,
      excessTransferred: 0,
    };
  }
}

// Agrega estas funciones en database.ts

// Obtener ventas por mes
export async function getMonthlySales(yearMonth: string): Promise<Sale[]> {
  try {
    const [year, month] = yearMonth.split('-');
    const startDate = `${yearMonth}-01T00:00:00Z`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString();
    
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .eq('status', 'completed');

    if (error) throw error;
    
    return (data || []).map((s) => ({
      id: s.id,
      items: s.items,
      subtotal: parseFloat(s.subtotal),
      total: parseFloat(s.total),
      cashAmount: parseFloat(s.cash_amount),
      transferAmount: parseFloat(s.transfer_amount),
      cashReceived: parseFloat(s.cash_received),
      cashReturned: parseFloat(s.cash_returned),
      paymentMethod: s.payment_method,
      status: s.status,
      createdAt: s.created_at,
      cancelledAt: s.cancelled_at,
      cancelledBy: s.cancelled_by,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar ventas mensuales");
    return [];
  }
}

// Obtener gastos por mes
export async function getMonthlyExpenses(yearMonth: string): Promise<Expense[]> {
  try {
    const [year, month] = yearMonth.split('-');
    const startDate = `${yearMonth}-01T00:00:00Z`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString();
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('created_at', startDate)
      .lt('created_at', endDate);

    if (error) throw error;
    
    return (data || []).map((e) => ({
      id: e.id,
      description: e.description,
      amount: parseFloat(e.amount),
      category: e.category,
      paymentMethod: e.payment_method,
      fromCashRegister: e.from_cash_register,
      createdAt: e.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar gastos mensuales");
    return [];
  }
}

// Obtener pagos de empleados por mes
export async function getMonthlyEmployeePayments(yearMonth: string): Promise<EmployeePayment[]> {
  try {
    const [year, month] = yearMonth.split('-');
    const startDate = `${yearMonth}-01T00:00:00Z`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString();
    
    const { data, error } = await supabase
      .from('employee_payments')
      .select('*')
      .gte('created_at', startDate)
      .lt('created_at', endDate);

    if (error) throw error;
    
    return (data || []).map((p) => ({
      id: p.id,
      employeeId: p.employee_id,
      employeeName: p.employee_name,
      position: p.position,
      baseAmount: parseFloat(p.base_amount),
      finalAmount: parseFloat(p.final_amount),
      notes: p.notes,
      paymentMethod: p.payment_method,
      fromCashRegister: p.from_cash_register,
      createdAt: p.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, "Error al cargar pagos mensuales");
    return [];
  }
}

// Obtener cierres por mes (para verificar si ya existen)
export async function getMonthlyClosures(yearMonth: string): Promise<DailyClosure[]> {
  try {
    const closures = await getDailyClosures();
    return closures.filter(c => c.date.startsWith(yearMonth));
  } catch (error) {
    console.error("Error al obtener cierres mensuales:", error);
    return [];
  }
}