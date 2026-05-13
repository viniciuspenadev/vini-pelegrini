"use client"

import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"

interface Props {
  children:   React.ReactNode
  userName:   string
  userEmail:  string
  tenantName: string
  userRole:   string
}

export function AppShell({ children, userName, userEmail, tenantName, userRole }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-blue-50">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        tenantName={tenantName}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-200">
        <Topbar userName={userName} userRole={userRole} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
