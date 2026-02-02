// app/login/page.tsx
import { LoginForm } from "@/components/ui/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión - Tabby POS",
  description: "Página de inicio de sesión del sistema POS",
};

export default function LoginPage() {
  return <LoginForm />;
}