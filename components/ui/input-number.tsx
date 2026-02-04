"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InputNumberProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
> {
  value: number;
  onChange: (value: number) => void;
  allowDecimals?: boolean;
  maxDecimals?: number;
}

const formatNumber = (
  num: number,
  allowDecimals: boolean,
  maxDecimals: number,
): string => {
  if (num === 0) return "";

  if (allowDecimals) {
    // Para números con decimales
    const fixedNum = num.toFixed(maxDecimals);
    const [integerPart, decimalPart] = fixedNum.split(".");
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Si los decimales son .00, no mostrarlos
    if (decimalPart === "00" || decimalPart === "0".repeat(maxDecimals)) {
      return formattedInteger;
    }

    return `${formattedInteger}.${decimalPart}`;
  } else {
    // Para números enteros
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};
function InputNumber({
  className,
  value,
  onChange,
  allowDecimals = true,
  maxDecimals = 2,
  ...props
}: InputNumberProps) {
  const [displayValue, setDisplayValue] = React.useState(
    value === 0 ? "" : formatNumber(value, allowDecimals, maxDecimals),
  );
  const [isFocused, setIsFocused] = React.useState(false);
  const prevValueRef = React.useRef(value);

  // Función para quitar formato (quitar comas) y convertir a número
  const unformatNumber = (formatted: string): number => {
    if (formatted === "") return 0;

    // Quitar comas y convertir a número
    const cleanValue = formatted.replace(/,/g, "");
    const num = Number(cleanValue);

    return isNaN(num) ? 0 : num;
  };

  // Efecto para sincronizar con el valor externo solo cuando no estamos enfocados
  React.useEffect(() => {
    // Solo actualizar displayValue si:
    // 1. No estamos enfocados en el input
    // 2. El valor externo realmente cambió (no por nuestro propio onChange)
    if (!isFocused && prevValueRef.current !== value) {
      setDisplayValue(
        value === 0 ? "" : formatNumber(value, allowDecimals, maxDecimals),
      );
    }
    prevValueRef.current = value;
  }, [value, isFocused, allowDecimals, maxDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;

    // Permitir solo números, punto decimal y comas
    const regex = allowDecimals ? /^[0-9,]*\.?[0-9]*$/ : /^[0-9,]*$/;

    if (rawValue === "" || regex.test(rawValue)) {
      // Limitar a un punto decimal
      if (allowDecimals) {
        const decimalCount = (rawValue.match(/\./g) || []).length;
        if (decimalCount > 1) {
          return;
        }
      }

      setDisplayValue(rawValue);

      // Convertir a número (quitar comas para el cálculo)
      const numValue = rawValue === "" ? 0 : unformatNumber(rawValue);
      onChange(numValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Al enfocar, mostrar sin formato (sin comas) para editar fácilmente
    const rawValue = displayValue.replace(/,/g, "");
    setDisplayValue(rawValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Al perder el foco, formatear el número
    const numValue = unformatNumber(displayValue);
    const formatted =
      numValue === 0 ? "" : formatNumber(numValue, allowDecimals, maxDecimals);
    setDisplayValue(formatted);

    // Asegurar que el valor final sea correcto
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir atajos comunes
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(className)}
      {...props}
    />
  );
}

export { InputNumber };
