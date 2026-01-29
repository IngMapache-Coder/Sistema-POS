// Local Database using localStorage for offline functionality
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
} from './types'

const STORAGE_KEYS = {
  CATEGORIES: 'pos_categories',
  PRODUCTS: 'pos_products',
  EMPLOYEES: 'pos_employees',
  SALES: 'pos_sales',
  EXPENSES: 'pos_expenses',
  EMPLOYEE_PAYMENTS: 'pos_employee_payments',
  DAILY_CLOSURES: 'pos_daily_closures',
  CONFIG: 'pos_config',
}

// Helper functions
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : defaultValue
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Categories
export function getCategories(): Category[] {
  return getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, [])
}

export function saveCategory(category: Omit<Category, 'id' | 'createdAt'>): Category {
  const categories = getCategories()
  const newCategory: Category = {
    ...category,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  categories.push(newCategory)
  saveToStorage(STORAGE_KEYS.CATEGORIES, categories)
  return newCategory
}

export function updateCategory(id: string, updates: Partial<Category>): Category | null {
  const categories = getCategories()
  const index = categories.findIndex(c => c.id === id)
  if (index === -1) return null
  categories[index] = { ...categories[index], ...updates }
  saveToStorage(STORAGE_KEYS.CATEGORIES, categories)
  return categories[index]
}

export function deleteCategory(id: string): boolean {
  const categories = getCategories()
  const filtered = categories.filter(c => c.id !== id)
  if (filtered.length === categories.length) return false
  saveToStorage(STORAGE_KEYS.CATEGORIES, filtered)
  return true
}

// Products
export function getProducts(): Product[] {
  return getFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, [])
}

export function getProductsByCategory(categoryId: string): Product[] {
  return getProducts().filter(p => p.categoryId === categoryId && p.isActive)
}

export function saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
  const products = getProducts()
  const newProduct: Product = {
    ...product,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  products.push(newProduct)
  saveToStorage(STORAGE_KEYS.PRODUCTS, products)
  return newProduct
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const products = getProducts()
  const index = products.findIndex(p => p.id === id)
  if (index === -1) return null
  products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() }
  saveToStorage(STORAGE_KEYS.PRODUCTS, products)
  return products[index]
}

export function deleteProduct(id: string): boolean {
  const products = getProducts()
  const index = products.findIndex(p => p.id === id)
  if (index === -1) return false
  products[index].isActive = false
  saveToStorage(STORAGE_KEYS.PRODUCTS, products)
  return true
}

export function updateProductStock(id: string, quantity: number): boolean {
  const products = getProducts()
  const index = products.findIndex(p => p.id === id)
  if (index === -1) return false
  if (products[index].hasInventoryControl) {
    products[index].stock = Math.max(0, products[index].stock - quantity)
    products[index].updatedAt = new Date().toISOString()
    saveToStorage(STORAGE_KEYS.PRODUCTS, products)
  }
  return true
}

// Employees
export function getEmployees(): Employee[] {
  return getFromStorage<Employee[]>(STORAGE_KEYS.EMPLOYEES, [])
}

export function getActiveEmployees(): Employee[] {
  return getEmployees().filter(e => e.isActive)
}

export function saveEmployee(employee: Omit<Employee, 'id' | 'createdAt'>): Employee {
  const employees = getEmployees()
  const newEmployee: Employee = {
    ...employee,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  employees.push(newEmployee)
  saveToStorage(STORAGE_KEYS.EMPLOYEES, employees)
  return newEmployee
}

export function updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
  const employees = getEmployees()
  const index = employees.findIndex(e => e.id === id)
  if (index === -1) return null
  employees[index] = { ...employees[index], ...updates }
  saveToStorage(STORAGE_KEYS.EMPLOYEES, employees)
  return employees[index]
}

export function deleteEmployee(id: string): boolean {
  const employees = getEmployees()
  const index = employees.findIndex(e => e.id === id)
  if (index === -1) return false
  employees[index].isActive = false
  saveToStorage(STORAGE_KEYS.EMPLOYEES, employees)
  return true
}

// Sales
export function getSales(): Sale[] {
  return getFromStorage<Sale[]>(STORAGE_KEYS.SALES, [])
}

export function getTodaySales(): Sale[] {
  const today = getTodayDate()
  return getSales().filter(s => s.createdAt.startsWith(today) && s.status === 'completed')
}

export function saveSale(sale: Omit<Sale, 'id' | 'createdAt' | 'status'>): Sale {
  const sales = getSales()
  const newSale: Sale = {
    ...sale,
    id: generateId(),
    status: 'completed',
    createdAt: new Date().toISOString(),
  }
  sales.push(newSale)
  saveToStorage(STORAGE_KEYS.SALES, sales)
  
  // Update stock for products with inventory control
  newSale.items.forEach(item => {
    updateProductStock(item.productId, item.quantity)
  })
  
  return newSale
}

export function cancelSale(id: string, cancelledBy: string): Sale | null {
  const sales = getSales()
  const index = sales.findIndex(s => s.id === id)
  if (index === -1) return null
  
  const sale = sales[index]
  sales[index] = {
    ...sale,
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelledBy,
  }
  saveToStorage(STORAGE_KEYS.SALES, sales)
  
  // Restore stock for products with inventory control
  const products = getProducts()
  sale.items.forEach(item => {
    const productIndex = products.findIndex(p => p.id === item.productId)
    if (productIndex !== -1 && products[productIndex].hasInventoryControl) {
      products[productIndex].stock += item.quantity
    }
  })
  saveToStorage(STORAGE_KEYS.PRODUCTS, products)
  
  return sales[index]
}

// Expenses
export function getExpenses(): Expense[] {
  return getFromStorage<Expense[]>(STORAGE_KEYS.EXPENSES, [])
}

export function getTodayExpenses(): Expense[] {
  const today = getTodayDate()
  return getExpenses().filter(e => e.createdAt.startsWith(today))
}

export function saveExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
  const expenses = getExpenses()
  const newExpense: Expense = {
    ...expense,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  expenses.push(newExpense)
  saveToStorage(STORAGE_KEYS.EXPENSES, expenses)
  return newExpense
}

export function deleteExpense(id: string): boolean {
  const expenses = getExpenses()
  const filtered = expenses.filter(e => e.id !== id)
  if (filtered.length === expenses.length) return false
  saveToStorage(STORAGE_KEYS.EXPENSES, filtered)
  return true
}

// Employee Payments
export function getEmployeePayments(): EmployeePayment[] {
  return getFromStorage<EmployeePayment[]>(STORAGE_KEYS.EMPLOYEE_PAYMENTS, [])
}

export function getTodayEmployeePayments(): EmployeePayment[] {
  const today = getTodayDate()
  return getEmployeePayments().filter(p => p.createdAt.startsWith(today))
}

export function saveEmployeePayment(payment: Omit<EmployeePayment, 'id' | 'createdAt'>): EmployeePayment {
  const payments = getEmployeePayments()
  const newPayment: EmployeePayment = {
    ...payment,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  payments.push(newPayment)
  saveToStorage(STORAGE_KEYS.EMPLOYEE_PAYMENTS, payments)
  return newPayment
}

// Daily Closures
export function getDailyClosures(): DailyClosure[] {
  return getFromStorage<DailyClosure[]>(STORAGE_KEYS.DAILY_CLOSURES, [])
}

export function getLowStockProducts(): LowStockProduct[] {
  const products = getProducts()
  return products
    .filter(p => p.isActive && p.hasInventoryControl && p.stock <= p.minStock)
    .map(p => ({
      productId: p.id,
      productName: p.name,
      currentStock: p.stock,
      minStock: p.minStock,
      suggestedOrder: Math.max(p.minStock * 2 - p.stock, p.minStock),
    }))
}

export function createDailyClosure(): DailyClosure {
  const closures = getDailyClosures()
  const today = getTodayDate()
  
  // Check if closure already exists for today
  const existingIndex = closures.findIndex(c => c.date === today)
  if (existingIndex !== -1) {
    return closures[existingIndex]
  }
  
  const todaySales = getTodaySales()
  const todayExpenses = getTodayExpenses()
  const todayPayments = getTodayEmployeePayments()
  
  const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0)
  const totalCash = todaySales.reduce((sum, s) => sum + s.cashAmount, 0)
  const totalTransfer = todaySales.reduce((sum, s) => sum + s.transferAmount, 0)
  const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalPayments = todayPayments.reduce((sum, p) => sum + p.finalAmount, 0)
  
  const closure: DailyClosure = {
    id: generateId(),
    date: today,
    sales: todaySales,
    totalSales,
    totalCash,
    totalTransfer,
    expenses: todayExpenses,
    totalExpenses,
    employeePayments: todayPayments,
    totalPayments,
    netIncome: totalSales - totalExpenses - totalPayments,
    lowStockProducts: getLowStockProducts(),
    createdAt: new Date().toISOString(),
  }
  
  closures.push(closure)
  saveToStorage(STORAGE_KEYS.DAILY_CLOSURES, closures)
  return closure
}

// System Config
export function getConfig(): SystemConfig {
  return getFromStorage<SystemConfig>(STORAGE_KEYS.CONFIG, {
    topN: 10,
    alertEmail: '',
    businessName: 'Mi Restaurante',
    businessAddress: '',
    businessPhone: '',
  })
}

export function updateConfig(updates: Partial<SystemConfig>): SystemConfig {
  const config = getConfig()
  const newConfig = { ...config, ...updates }
  saveToStorage(STORAGE_KEYS.CONFIG, newConfig)
  return newConfig
}

// Statistics
export function getDailyStats(days: number = 30): DailyStats[] {
  const closures = getDailyClosures()
  const stats: DailyStats[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const closure = closures.find(c => c.date === dateStr)
    stats.push({
      date: dateStr,
      totalSales: closure?.totalSales || 0,
      totalExpenses: closure?.totalExpenses || 0,
      totalPayments: closure?.totalPayments || 0,
      netIncome: closure?.netIncome || 0,
    })
  }
  
  return stats
}

export function getMonthlyStats(months: number = 12): MonthlyStats[] {
  const closures = getDailyClosures()
  const stats: MonthlyStats[] = []
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStr = date.toISOString().slice(0, 7)
    
    const monthClosures = closures.filter(c => c.date.startsWith(monthStr))
    stats.push({
      month: monthStr,
      totalSales: monthClosures.reduce((sum, c) => sum + c.totalSales, 0),
      totalExpenses: monthClosures.reduce((sum, c) => sum + c.totalExpenses, 0),
      totalPayments: monthClosures.reduce((sum, c) => sum + c.totalPayments, 0),
      netIncome: monthClosures.reduce((sum, c) => sum + c.netIncome, 0),
    })
  }
  
  return stats
}

export function getTopProducts(n: number, period?: string): ProductStats[] {
  const closures = getDailyClosures()
  const filteredClosures = period 
    ? closures.filter(c => c.date.startsWith(period))
    : closures
  
  const productMap = new Map<string, ProductStats>()
  
  filteredClosures.forEach(closure => {
    closure.sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          totalQuantity: 0,
          totalRevenue: 0,
        }
        existing.totalQuantity += item.quantity
        existing.totalRevenue += item.total
        productMap.set(item.productId, existing)
      })
    })
  })
  
  return Array.from(productMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, n)
}

export function getBottomProducts(n: number, period?: string): ProductStats[] {
  const closures = getDailyClosures()
  const filteredClosures = period 
    ? closures.filter(c => c.date.startsWith(period))
    : closures
  
  const productMap = new Map<string, ProductStats>()
  const products = getProducts().filter(p => p.isActive)
  
  // Initialize all active products with zero sales
  products.forEach(p => {
    productMap.set(p.id, {
      productId: p.id,
      productName: p.name,
      totalQuantity: 0,
      totalRevenue: 0,
    })
  })
  
  // Add actual sales data
  filteredClosures.forEach(closure => {
    closure.sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId)
        if (existing) {
          existing.totalQuantity += item.quantity
          existing.totalRevenue += item.total
        }
      })
    })
  })
  
  return Array.from(productMap.values())
    .sort((a, b) => a.totalQuantity - b.totalQuantity)
    .slice(0, n)
}

// Initialize with sample data if empty
export function initializeSampleData(): void {
  if (getCategories().length > 0) return
  
  // Sample categories
  const categories = [
    { name: 'Pescados', color: '#0ea5e9', order: 1 },
    { name: 'Camarones', color: '#f97316', order: 2 },
    { name: 'Entradas', color: '#22c55e', order: 3 },
    { name: 'Bebidas', color: '#8b5cf6', order: 4 },
  ]
  
  const savedCategories = categories.map(c => saveCategory(c))
  
  // Sample products
  const sampleProducts = [
    { name: 'Filete de Pescado', price: 120, categoryId: savedCategories[0].id, stock: 50, minStock: 10, hasInventoryControl: true },
    { name: 'Pescado Entero', price: 150, categoryId: savedCategories[0].id, stock: 30, minStock: 5, hasInventoryControl: true },
    { name: 'Ceviche de Pescado', price: 95, categoryId: savedCategories[0].id, stock: 100, minStock: 20, hasInventoryControl: false },
    { name: 'Camarones al Ajillo', price: 180, categoryId: savedCategories[1].id, stock: 40, minStock: 10, hasInventoryControl: true },
    { name: 'Camarones Empanizados', price: 160, categoryId: savedCategories[1].id, stock: 45, minStock: 10, hasInventoryControl: true },
    { name: 'Coctel de Camarones', price: 110, categoryId: savedCategories[1].id, stock: 60, minStock: 15, hasInventoryControl: true },
    { name: 'Tostadas de Ceviche', price: 45, categoryId: savedCategories[2].id, stock: 200, minStock: 30, hasInventoryControl: false },
    { name: 'Aguachile', price: 85, categoryId: savedCategories[2].id, stock: 80, minStock: 15, hasInventoryControl: false },
    { name: 'Agua Fresca', price: 25, categoryId: savedCategories[3].id, stock: 1000, minStock: 50, hasInventoryControl: false },
    { name: 'Refresco', price: 30, categoryId: savedCategories[3].id, stock: 200, minStock: 30, hasInventoryControl: true },
    { name: 'Cerveza', price: 35, categoryId: savedCategories[3].id, stock: 150, minStock: 20, hasInventoryControl: true },
  ]
  
  sampleProducts.forEach(p => saveProduct({ ...p, isActive: true }))
  
  // Sample employees
  const employees = [
    { name: 'Juan Pérez', position: 'Mesero', dailyPayBase: 300, isActive: true },
    { name: 'María García', position: 'Cocinero', dailyPayBase: 400, isActive: true },
    { name: 'Pedro López', position: 'Bar', dailyPayBase: 350, isActive: true },
  ]
  
  employees.forEach(e => saveEmployee(e))
}
