import { POSInterface } from "@/components/pos/pos-interface"
import { AppSidebar } from "@/components/layout/app-sidebar"

export default function HomePage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-4 overflow-hidden">
        <POSInterface />
      </main>
    </div>
  )
}
