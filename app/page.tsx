"use client";

import { useEffect, useState } from "react";
import { POSInterface } from "@/components/pos/pos-interface";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentUser } from "@/lib/database";

export default function HomePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.role === "waiter") {
      window.location.replace("/mesas");
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-4 overflow-hidden">
        <POSInterface />
      </main>
    </div>
  );
}
