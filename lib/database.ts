// Database functions using Supabase
import { supabase, handleSupabaseError } from './supabase';
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
} from './types';

// Helper functions
function generateId(): string {
  return crypto.randomUUID();
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Categories
export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    handleSupabaseError(error, 'Error al cargar categorías');
    return [];
  }
}

export async function saveCategory(
  category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Category> {
  try {
    const newCategory = {
      ...category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('categories')
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
    handleSupabaseError(error, 'Error al guardar categoría');
    throw error;
  }
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
    handleSupabaseError(error, 'Error al actualizar categoría');
    return null;
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'Error al eliminar categoría');
    return false;
  }
}

// Products
export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    return (data || []).map(p => ({
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
    handleSupabaseError(error, 'Error al cargar productos');
    return [];
  }
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.categoryId === categoryId && p.isActive);
}

export async function saveProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
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
      .from('products')
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
    handleSupabaseError(error, 'Error al guardar producto');
    throw error;
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.stock !== undefined) updateData.stock = updates.stock;
    if (updates.minStock !== undefined) updateData.min_stock = updates.minStock;
    if (updates.hasInventoryControl !== undefined) updateData.has_inventory_control = updates.hasInventoryControl;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
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
    handleSupabaseError(error, 'Error al actualizar producto');
    return null;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'Error al eliminar producto');
    return false;
  }
}

export async function updateProductStock(id: string, quantity: number): Promise<boolean> {
  try {
    // Primero obtenemos el producto actual
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock, has_inventory_control')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (product.has_inventory_control) {
      const newStock = Math.max(0, product.stock - quantity);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock: newStock, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
    }
    
    return true;
  } catch (error) {
    handleSupabaseError(error, 'Error al actualizar stock');
    return false;
  }
}

// Employees
export async function getEmployees(): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*');
    
    if (error) throw error;
    return (data || []).map(e => ({
      id: e.id,
      name: e.name,
      position: e.position,
      dailyPayBase: parseFloat(e.daily_pay_base),
      isActive: e.is_active,
      createdAt: e.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, 'Error al cargar empleados');
    return [];
  }
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const employees = await getEmployees();
  return employees.filter((e) => e.isActive);
}

export async function saveEmployee(
  employee: Omit<Employee, 'id' | 'createdAt'>
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
      .from('employees')
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
    handleSupabaseError(error, 'Error al guardar empleado');
    throw error;
  }
}

export async function updateEmployee(
  id: string,
  updates: Partial<Employee>
): Promise<Employee | null> {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.dailyPayBase !== undefined) updateData.daily_pay_base = updates.dailyPayBase;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    
    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
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
    handleSupabaseError(error, 'Error al actualizar empleado');
    return null;
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('employees')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'Error al eliminar empleado');
    return false;
  }
}

// Sales
export async function getSales(): Promise<Sale[]> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(s => ({
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
    handleSupabaseError(error, 'Error al cargar ventas');
    return [];
  }
}

export async function getTodaySales(): Promise<Sale[]> {
  try {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(s => ({
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
    handleSupabaseError(error, 'Error al cargar ventas del día');
    return [];
  }
}

export async function saveSale(
  sale: Omit<Sale, 'id' | 'createdAt' | 'status'>
): Promise<Sale | null> {
  try {
    // Check if daily closure exists
    if (await hasDailyClosure()) {
      return null;
    }
    
    // Calcular cambio devuelto si aplica
    const cashReturned = sale.cashReceived > sale.cashAmount 
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
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('sales')
      .insert(newSale)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update stock for products with inventory control
    for (const item of sale.items) {
      await updateProductStock(item.productId, item.quantity);
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
    };
  } catch (error) {
    handleSupabaseError(error, 'Error al guardar venta');
    return null;
  }
}

export async function cancelSale(id: string, cancelledBy: string): Promise<Sale | null> {
  try {
    // Primero obtenemos la venta
    const { data: sale, error: fetchError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Actualizamos la venta
    const { data, error } = await supabase
      .from('sales')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Restaurar stock para productos con control de inventario
    const products = await getProducts();
    const saleItems: SaleItem[] = sale.items;
    
    for (const item of saleItems) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.hasInventoryControl) {
        await updateProductStock(item.productId, -item.quantity); // Restar negativo = sumar
      }
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
    handleSupabaseError(error, 'Error al cancelar venta');
    return null;
  }
}



// Expenses
export async function getExpenses(): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(e => ({
      id: e.id,
      description: e.description,
      amount: parseFloat(e.amount),
      category: e.category,
      createdAt: e.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, 'Error al cargar gastos');
    return [];
  }
}

export async function getTodayExpenses(): Promise<Expense[]> {
  try {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(e => ({
      id: e.id,
      description: e.description,
      amount: parseFloat(e.amount),
      category: e.category,
      createdAt: e.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, 'Error al cargar gastos del día');
    return [];
  }
}

export async function saveExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>
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
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('expenses')
      .insert(newExpense)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      description: data.description,
      amount: parseFloat(data.amount),
      category: data.category,
      createdAt: data.created_at,
    };
  } catch (error) {
    handleSupabaseError(error, 'Error al guardar gasto');
    return null;
  }
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'Error al eliminar gasto');
    return false;
  }
}

// Employee Payments
export async function getEmployeePayments(): Promise<EmployeePayment[]> {
  try {
    const { data, error } = await supabase
      .from('employee_payments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      employeeId: p.employee_id,
      employeeName: p.employee_name,
      position: p.position,
      baseAmount: parseFloat(p.base_amount),
      finalAmount: parseFloat(p.final_amount),
      notes: p.notes,
      fromCashRegister: p.from_cash_register,
      createdAt: p.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, 'Error al cargar pagos de empleados');
    return [];
  }
}

export async function getTodayEmployeePayments(): Promise<EmployeePayment[]> {
  try {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from('employee_payments')
      .select('*')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      employeeId: p.employee_id,
      employeeName: p.employee_name,
      position: p.position,
      baseAmount: parseFloat(p.base_amount),
      finalAmount: parseFloat(p.final_amount),
      notes: p.notes,
      fromCashRegister: p.from_cash_register,
      createdAt: p.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, 'Error al cargar pagos del día');
    return [];
  }
}

export async function saveEmployeePayment(
  payment: Omit<EmployeePayment, 'id' | 'createdAt'>
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
      from_cash_register: payment.fromCashRegister,
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('employee_payments')
      .insert(newPayment)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: data.employee_name,
      position: data.position,
      baseAmount: parseFloat(data.base_amount),
      finalAmount: parseFloat(data.final_amount),
      notes: data.notes,
      fromCashRegister: data.from_cash_register,
      createdAt: data.created_at,
    };
  } catch (error) {
    handleSupabaseError(error, 'Error al guardar pago de empleado');
    return null;
  }
}

export async function deleteEmployeePayment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('employee_payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'Error al eliminar pago de empleado');
    return false;
  }
}

// Daily Closures
export async function getDailyClosures(): Promise<DailyClosure[]> {
  try {
    const { data, error } = await supabase
      .from('daily_closures')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(c => ({
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
    handleSupabaseError(error, 'Error al cargar cierres diarios');
    return [];
  }
}

export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  try {
    const products = await getProducts();
    return products
      .filter((p) => p.isActive && p.hasInventoryControl && p.stock <= p.minStock)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        currentStock: p.stock,
        minStock: p.minStock,
        suggestedOrder: Math.max(p.minStock * 2 - p.stock, p.minStock),
      }));
  } catch (error) {
    console.error('Error al cargar productos con stock bajo:', error);
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
    
    const todaySales = await getTodaySales();
    const todayExpenses = await getTodayExpenses();
    const todayPayments = await getTodayEmployeePayments();
    
    const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalCash = todaySales.reduce((sum, s) => sum + s.cashAmount, 0);
    const totalTransfer = todaySales.reduce((sum, s) => sum + s.transferAmount, 0);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPayments = todayPayments.reduce((sum, p) => sum + p.finalAmount, 0);
    
    const config = await getConfig();
    const lowStockProducts = await getLowStockProducts();
    
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
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('daily_closures')
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
    handleSupabaseError(error, 'Error al crear cierre diario');
    throw error;
  }
}

// System Config
export async function getConfig(): Promise<SystemConfig> {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
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
    console.error('Error al cargar configuración, usando valores por defecto:', error);
    return {
      topN: 10,
      alertEmail: '',
      businessName: 'Mi Restaurante',
      businessAddress: '',
      businessPhone: '',
      businessNIT: '',
      dailyBase: 500,
      reopenPassword: '1234',
    };
  }
}

export async function updateConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
  try {
    const updateData: any = {};
    
    if (updates.topN !== undefined) updateData.top_n = updates.topN;
    if (updates.alertEmail !== undefined) updateData.alert_email = updates.alertEmail;
    if (updates.businessName !== undefined) updateData.business_name = updates.businessName;
    if (updates.businessAddress !== undefined) updateData.business_address = updates.businessAddress;
    if (updates.businessPhone !== undefined) updateData.business_phone = updates.businessPhone;
    if (updates.businessNIT !== undefined) updateData.business_nit = updates.businessNIT;
    if (updates.dailyBase !== undefined) updateData.daily_base = updates.dailyBase;
    if (updates.reopenPassword !== undefined) updateData.reopen_password = updates.reopenPassword;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('system_config')
      .update(updateData)
      .eq('id', '11111111-1111-1111-1111-111111111111')
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
    handleSupabaseError(error, 'Error al actualizar configuración');
    throw error;
  }
}

// Statistics functions
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
    const todayTotalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const todayTotalPayments = todayPayments.reduce((sum, p) => sum + p.finalAmount, 0);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
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
    console.error('Error al cargar estadísticas diarias:', error);
    return [];
  }
}

export async function getMonthlyStats(months: number = 12): Promise<MonthlyStats[]> {
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
    const todayTotalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const todayTotalPayments = todayPayments.reduce((sum, p) => sum + p.finalAmount, 0);
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      
      // Filter closures for this month, excluding today if it's current month
      const monthClosures = closures.filter((c) => 
        c.date.startsWith(monthStr) && 
        (monthStr !== currentMonth || c.date !== today)
      );
      
      let monthSales = monthClosures.reduce((sum, c) => sum + c.totalSales, 0);
      let monthExpenses = monthClosures.reduce((sum, c) => sum + c.totalExpenses, 0);
      let monthPayments = monthClosures.reduce((sum, c) => sum + c.totalPayments, 0);
      
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
    console.error('Error al cargar estadísticas mensuales:', error);
    return [];
  }
}

export async function getTopProducts(n: number, period?: string): Promise<ProductStats[]> {
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
    console.error('Error al cargar productos más vendidos:', error);
    return [];
  }
}

export async function getBottomProducts(n: number, period?: string): Promise<ProductStats[]> {
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
    console.error('Error al cargar productos menos vendidos:', error);
    return [];
  }
}

// NEW FUNCTION: Check if today's closure exists
export async function hasDailyClosure(): Promise<boolean> {
  try {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from('daily_closures')
      .select('id')
      .eq('date', today)
      .single();
    
    // Si no hay error y hay data, existe el cierre
    return !error && data !== null;
  } catch (error) {
    // Si hay error (como ningún registro encontrado), no existe el cierre
    return false;
  }
}

// Initialize with sample data if empty
export async function initializeSampleData(): Promise<void> {
  try {
    // Check if categories already exist
    const categories = await getCategories();
    if (categories.length > 0) return;
    
    // Sample categories
    const sampleCategories = [
      { name: "Pescados", color: "#0ea5e9", order: 1 },
      { name: "Camarones", color: "#f97316", order: 2 },
      { name: "Entradas", color: "#22c55e", order: 3 },
      { name: "Bebidas", color: "#8b5cf6", order: 4 },
    ];
    
    // Insert categories
    for (const cat of sampleCategories) {
      await saveCategory(cat);
    }
    
    // Get saved categories
    const savedCategories = await getCategories();
    
    // Sample products
    const sampleProducts = [
      {
        name: "Filete de Pescado",
        price: 120,
        categoryId: savedCategories[0].id,
        stock: 50,
        minStock: 10,
        hasInventoryControl: true,
        isActive: true,
      },
      {
        name: "Pescado Entero",
        price: 150,
        categoryId: savedCategories[0].id,
        stock: 30,
        minStock: 5,
        hasInventoryControl: true,
        isActive: true,
      },
      {
        name: "Ceviche de Pescado",
        price: 95,
        categoryId: savedCategories[0].id,
        stock: 100,
        minStock: 20,
        hasInventoryControl: false,
        isActive: true,
      },
      {
        name: "Camarones al Ajillo",
        price: 180,
        categoryId: savedCategories[1].id,
        stock: 40,
        minStock: 10,
        hasInventoryControl: true,
        isActive: true,
      },
      {
        name: "Camarones Empanizados",
        price: 160,
        categoryId: savedCategories[1].id,
        stock: 45,
        minStock: 10,
        hasInventoryControl: true,
        isActive: true,
      },
      {
        name: "Coctel de Camarones",
        price: 110,
        categoryId: savedCategories[1].id,
        stock: 60,
        minStock: 15,
        hasInventoryControl: true,
        isActive: true,
      },
      {
        name: "Tostadas de Ceviche",
        price: 45,
        categoryId: savedCategories[2].id,
        stock: 200,
        minStock: 30,
        hasInventoryControl: false,
        isActive: true,
      },
      {
        name: "Aguachile",
        price: 85,
        categoryId: savedCategories[2].id,
        stock: 80,
        minStock: 15,
        hasInventoryControl: false,
        isActive: true,
      },
      {
        name: "Agua Fresca",
        price: 25,
        categoryId: savedCategories[3].id,
        stock: 1000,
        minStock: 50,
        hasInventoryControl: false,
        isActive: true,
      },
      {
        name: "Refresco",
        price: 30,
        categoryId: savedCategories[3].id,
        stock: 200,
        minStock: 30,
        hasInventoryControl: true,
        isActive: true,
      },
      {
        name: "Cerveza",
        price: 35,
        categoryId: savedCategories[3].id,
        stock: 150,
        minStock: 20,
        hasInventoryControl: true,
        isActive: true,
      },
    ];
    
    // Insert products
    for (const p of sampleProducts) {
      await saveProduct(p);
    }
    
    // Sample employees
    const sampleEmployees = [
      {
        name: "Juan Pérez",
        position: "Mesero",
        dailyPayBase: 300,
        isActive: true,
      },
      {
        name: "María García",
        position: "Cocinero",
        dailyPayBase: 400,
        isActive: true,
      },
      { 
        name: "Pedro López", 
        position: "Bar", 
        dailyPayBase: 350, 
        isActive: true 
      },
    ];
    
    // Insert employees
    for (const e of sampleEmployees) {
      await saveEmployee(e);
    }
    
  } catch (error) {
    console.error('Error al inicializar datos de muestra:', error);
  }
}

export async function getCashRegisterStatus(): Promise<"open" | "closed"> {
  return (await hasDailyClosure()) ? "closed" : "open";
}

export async function reopenCashRegister(password: string): Promise<boolean> {
  try {
    const config = await getConfig();
    if (password === config.reopenPassword) {
      const today = getTodayDate();
      const { error } = await supabase
        .from('daily_closures')
        .delete()
        .eq('date', today);
      
      if (error) throw error;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al reabrir caja:', error);
    return false;
  }
}

// Función para verificar credenciales con Supabase
export async function verifyLogin(username: string, password: string): Promise<any> {
  try {
    // Opción 1: Usar función PostgreSQL (recomendado)
    const { data, error } = await supabase
      .rpc('verify_user_password', {
        username_text: username,
        password_text: password
      });

    if (error) throw error;
    
    if (data && data.length > 0) {
      return {
        id: data[0].id,
        username: data[0].username,
        name: data[0].name,
        role: data[0].role
      };
    }
    
    // Opción 2: Consulta directa (para desarrollo simple)
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (queryError) throw queryError;

    // Validación simple para desarrollo (NO para producción)
    if (users) {
      const validPasswords: Record<string, string> = {
        'admin': 'admin123',
        'caja': 'caja123',
        'empleado': 'empleado123'
      };

      if (validPasswords[username] === password) {
        return {
          id: users.id,
          username: users.username,
          name: users.name,
          role: users.role
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error en verifyLogin:', error);
    return null;
  }
}

// Función para actualizar último login
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error al actualizar último login:', error);
  }
}

// Función para obtener usuario por ID
export async function getUserById(userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, role, last_login')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
}

// Función para crear usuario (solo admin)
export async function createUser(userData: {
  username: string;
  name: string;
  role: string;
  password: string;
}): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        name: userData.name,
        role: userData.role,
        password_hash: userData.password, // En producción, hash esta contraseña
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return null;
  }
}

// Funciones de permisos locales (mantener)
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