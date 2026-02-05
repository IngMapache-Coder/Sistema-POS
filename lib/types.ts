export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  stock: number;
  minStock: number;
  hasInventoryControl: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  dailyPayBase: number;
  isActive: boolean;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  total: number;
  cashAmount: number;
  transferAmount: number;
  cashReceived: number;
  cashReturned: number;
  paymentMethod: "cash" | "transfer" | "mixed";
  status: "completed" | "cancelled";
  createdAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: "cash" | "transfer";
  fromCashRegister?: boolean;
  createdAt: string;
}

// Actualizar EmployeePayment interface
export interface EmployeePayment {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  baseAmount: number;
  finalAmount: number;
  notes: string;
  paymentMethod: "cash" | "transfer";
  fromCashRegister?: boolean;
  createdAt: string;
}

export interface DailyClosure {
  id: string;
  date: string;
  sales: Sale[];
  totalSales: number;
  totalCash: number;
  totalTransfer: number;
  expenses: Expense[];
  totalExpenses: number;
  employeePayments: EmployeePayment[];
  totalPayments: number;
  lowStockProducts: LowStockProduct[];
  dailyBase: number;
  createdAt: string;
  
  // NUEVOS CAMPOS para detalle de caja
  cashExpenses?: number;
  cashPayments?: number;
  cashBeforeClosure?: number;  // Efectivo ANTES del cierre
  cashAfterClosure?: number;   // Efectivo DESPUÉS del cierre (solo base)
  cashExcessTransferred?: number;
  excessExpenseId?: string;    // ID del gasto que retira el excedente
}

export interface LowStockProduct {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  suggestedOrder: number;
}

export interface SystemConfig {
  topN: number;
  alertEmail: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessNIT: string;
  dailyBase: number;
  reopenPassword: string;
}

export interface CartItem extends SaleItem {
  productId: string;
}

// Statistics types
export interface DailyStats {
  date: string;
  totalSales: number;
  totalExpenses: number;
  totalPayments: number;
}

export interface MonthlyStats {
  month: string;
  totalSales: number;
  totalExpenses: number;
  totalPayments: number;
}

export interface ProductStats {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface PaymentMethodOption {
  value: string;
  label: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
];

export interface MajorCashAccount {
  id: string;
  type: "transfer" | "saved_cash";
  description: string;
  amount: number;
  movementType: "income" | "expense";
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface MajorCashSummary {
  totalTransfers: number;
  totalSavedCash: number;
  totalMajorCash: number;
  lastUpdate: string;
}

export interface ManualAdjustment {
  account: "transfer" | "saved_cash";
  type: "income" | "expense";
  amount: number;
  description: string;
  notes?: string;
}