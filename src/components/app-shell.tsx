"use client"

import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import type { SegmentNavLabels } from "@/lib/segments/types"

interface Props {
  children:       React.ReactNode
  userName:       string
  userEmail:      string
  tenantName:     string
  userRole:       string
  activeModules?: string[]
  navLabels?:     SegmentNavLabels
}

export function AppShell({ children, userName, userEmail, tenantName, userRole, activeModules = [], navLabels }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-blue-50">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        tenantName={tenantName}
        userRole={userRole}
        activeModules={activeModules}
        navLabels={navLabels}
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
