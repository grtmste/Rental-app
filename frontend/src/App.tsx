import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Equipment from './pages/Equipment'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Crew from './pages/Crew'
import Calendar from './pages/Calendar'
import Quotes from './pages/Quotes'
import QuoteDetail from './pages/QuoteDetail'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import CRM from './pages/CRM'
import ClientDetail from './pages/ClientDetail'
import Analytics from './pages/Analytics'
import Categories from './pages/Categories'
import ProjectTemplates from './pages/ProjectTemplates'
import CalendarSettings from './pages/CalendarSettings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1A3C6E', color: '#fff' },
            success: { style: { background: '#166534', color: '#fff' } },
            error: { style: { background: '#991B1B', color: '#fff' } },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/app/dashboard" element={<Dashboard />} />
              <Route path="/app/equipment" element={<Equipment />} />
              <Route path="/app/projects" element={<Projects />} />
              <Route path="/app/projects/:id" element={<ProjectDetail />} />
              <Route path="/app/crew" element={<Crew />} />
              <Route path="/app/calendar" element={<Calendar />} />
              <Route path="/app/quotes" element={<Quotes />} />
              <Route path="/app/quotes/:id" element={<QuoteDetail />} />
              <Route path="/app/invoices" element={<Invoices />} />
              <Route path="/app/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/app/crm" element={<CRM />} />
              <Route path="/app/crm/:id" element={<ClientDetail />} />
              <Route path="/app/analytics" element={<Analytics />} />
              <Route path="/app/categories" element={<Categories />} />
              <Route path="/app/templates" element={<ProjectTemplates />} />
              <Route path="/app/calendar-settings" element={<CalendarSettings />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
