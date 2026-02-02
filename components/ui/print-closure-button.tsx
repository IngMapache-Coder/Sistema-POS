"use client";

import { Button } from "@/components/ui/button";
import { Printer, Eye } from "lucide-react";
import type { DailyClosure } from "@/lib/types";

interface PrintClosureButtonProps {
  closure: DailyClosure;
  onView?: (closure: DailyClosure) => void;
}

export function PrintClosureButton({ closure, onView }: PrintClosureButtonProps) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=400,height=800");
    if (printWindow) {
      const printDate = new Date(closure.date + "T00:00:00").toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>Cierre de Caja - ${closure.date}</title>
            <style>
              body { 
                font-family: monospace; 
                font-size: 11px; 
                width: 280px; 
                margin: 0 auto; 
                padding: 10px; 
              }
              .header { 
                text-align: center; 
                margin-bottom: 15px; 
                border-bottom: 1px dashed #000;
                padding-bottom: 8px;
              }
              .business-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .business-info {
                font-size: 10px;
                margin-bottom: 3px;
                color: #555;
              }
              .business-nit {
                font-size: 10px;
                margin-bottom: 3px;
                color: #555;
                font-weight: bold;
              }
              .section { 
                margin: 15px 0; 
              }
              .section-title { 
                font-weight: bold; 
                border-bottom: 1px dashed #000; 
                padding-bottom: 3px;
                margin-bottom: 8px;
              }
              .item { 
                display: flex; 
                justify-content: space-between; 
                margin: 3px 0; 
              }
              .sub-item { 
                display: flex; 
                justify-content: space-between; 
                margin: 1px 0 1px 15px; 
                font-size: 10px; 
                color: #555; 
              }
              .total-line { 
                border-top: 1px dashed #000; 
                margin-top: 5px; 
                padding-top: 5px; 
                font-weight: bold; 
              }
              .cash-register-section {
                background: #f5f5f5;
                padding: 8px;
                border-radius: 4px;
                margin: 10px 0;
              }
              .cash-register-item {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
              }
              .net-income { 
                font-size: 14px; 
                text-align: center; 
                margin-top: 15px; 
                padding: 10px; 
                border: 2px solid #000; 
              }
              .from-cash-badge {
                background: #fee2e2;
                color: #dc2626;
                font-size: 9px;
                padding: 1px 4px;
                border-radius: 3px;
                margin-left: 5px;
              }
              .not-from-cash-badge {
                background: #dbeafe;
                color: #1d4ed8;
                font-size: 9px;
                padding: 1px 4px;
                border-radius: 3px;
                margin-left: 5px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 9px;
                color: #666;
                border-top: 1px dashed #000;
                padding-top: 8px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="business-name">RESTAURANTE</div>
              <div class="business-info">REPORTE DE CIERRE DE CAJA</div>
              <div class="business-info">${printDate}</div>
              <div class="business-info">Fecha: ${closure.date}</div>
              <div class="business-info">Hora: ${new Date(closure.createdAt).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            <div class="cash-register-section">
              <div class="section-title">RESUMEN FINANCIERO</div>
              <div class="cash-register-item">
                <span>Ventas totales:</span>
                <span>$${closure.totalSales.toFixed(2)}</span>
              </div>
              <div class="cash-register-item">
                <span>- Efectivo:</span>
                <span>$${closure.totalCash.toFixed(2)}</span>
              </div>
              <div class="cash-register-item">
                <span>- Transferencia:</span>
                <span>$${closure.totalTransfer.toFixed(2)}</span>
              </div>
              <div class="cash-register-item">
                <span>- Gastos:</span>
                <span>-$${closure.totalExpenses.toFixed(2)}</span>
              </div>
              <div class="cash-register-item">
                <span>- Pagos empleados (total):</span>
                <span>-$${closure.totalPayments.toFixed(2)}</span>
              </div>
              <div class="total-line">
              </div>
            </div>

            <div class="section">
              <div class="section-title">DINERO EN CAJA</div>
              <div class="item">
                <span>Base diaria:</span>
                <span>$${closure.dailyBase.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>+ Ventas efectivo:</span>
                <span>+$${closure.totalCash.toFixed(2)}</span>
              </div>
              
              ${(() => {
                // Calcular pagos de caja desde los pagos de empleados
                const paymentsFromCash = closure.employeePayments
                  .filter(p => p.fromCashRegister)
                  .reduce((sum, p) => sum + p.finalAmount, 0);
                return `
                  <div class="item">
                    <span>- Pagos empleados (de caja):</span>
                    <span>-$${paymentsFromCash.toFixed(2)}</span>
                  </div>
                  <div class="total-line">
                    <div class="item">
                      <span>TOTAL ESPERADO EN CAJA:</span>
                      <span>$${(closure.dailyBase + closure.totalCash - paymentsFromCash).toFixed(2)}</span>
                    </div>
                  </div>
                `;
              })()}
              
              <p style="font-size: 9px; color: #666; margin-top: 5px;">
                Esta cantidad debió estar físicamente en caja
              </p>
            </div>

            <div class="section">
              <div class="section-title">VENTAS (${closure.sales.length} transacciones)</div>
              ${closure.sales.length === 0 
                ? '<div>Sin ventas registradas</div>' 
                : closure.sales.slice(0, 5).map(sale => `
                  <div class="item">
                    <span>#${sale.id.slice(-6)}</span>
                    <span>$${sale.total.toFixed(2)}</span>
                  </div>
                  ${sale.items.slice(0, 2).map(item => `
                    <div class="sub-item">
                      <span>${item.quantity}x ${item.productName}</span>
                      <span>$${item.total.toFixed(2)}</span>
                    </div>
                  `).join('')}
                `).join('')}
              ${closure.sales.length > 5 
                ? `<div class="sub-item">... y ${closure.sales.length - 5} transacciones más</div>` 
                : ''}
            </div>

            ${closure.lowStockProducts.length > 0 ? `
              <div class="section">
                <div class="section-title">PRODUCTOS CON STOCK BAJO</div>
                ${closure.lowStockProducts.map(product => `
                  <div class="item">
                    <span>${product.productName}</span>
                    <span>${product.currentStock}/${product.minStock}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div class="footer">
              Reporte generado el ${new Date().toLocaleString("es-MX")}<br>
              Sistema POS Restaurante
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleView = () => {
    if (onView) {
      onView(closure);
    }
  };

  return (
    <div className="flex gap-2">
      {onView && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleView}
          className="h-8 gap-1"
        >
          <Eye className="h-3 w-3" />
          Ver
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="h-8 gap-1"
      >
        <Printer className="h-3 w-3" />
        Imprimir
      </Button>
    </div>
  );
}