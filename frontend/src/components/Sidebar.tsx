import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  FolderIcon,
  CubeIcon,
  UsersIcon,
  CalendarIcon,
  DocumentTextIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  XMarkIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

const navItems = [
  { label: 'Töölaud',     to: '/app/dashboard', icon: HomeIcon },
  { label: 'Projektid',   to: '/app/projects',  icon: FolderIcon },
  { label: 'Seadmed',     to: '/app/equipment',   icon: CubeIcon },
  { label: 'Kategooriad', to: '/app/categories',  icon: TagIcon },
  { label: 'Meeskond',    to: '/app/crew',       icon: UsersIcon },
  { label: 'Kalender',    to: '/app/calendar',   icon: CalendarIcon },
  { label: 'Pakkumised',  to: '/app/quotes',     icon: DocumentTextIcon },
  { label: 'Arved',       to: '/app/invoices',   icon: CurrencyEuroIcon },
  { label: 'Kliendid',    to: '/app/crm',        icon: BuildingOfficeIcon },
  { label: 'Analüütika',  to: '/app/analytics',  icon: ChartBarIcon },
]

interface SidebarProps { open: boolean; onClose: () => void }

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden" onClick={onClose} />}
      <aside className={clsx(
        'fixed top-0 left-0 z-30 h-full w-64 bg-primary flex flex-col transition-transform duration-300',
        'lg:relative lg:translate-x-0 lg:flex',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-primary-light">
          <span className="text-white font-bold text-xl tracking-tight">RentPro</span>
          <button onClick={onClose} className="lg:hidden text-white hover:text-gray-300">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (window.innerWidth < 1024) onClose() }}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors',
                isActive ? 'bg-accent text-white' : 'text-blue-200 hover:bg-primary-light hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-primary-light">
          <p className="text-blue-300 text-xs text-center">Stereo Sound OÜ © 2025</p>
        </div>
      </aside>
    </>
  )
}
