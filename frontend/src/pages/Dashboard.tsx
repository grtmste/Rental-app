import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderIcon,
  CubeIcon,
  CurrencyEuroIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import api from '../utils/api'
import { format } from 'date-fns'

interface Overview {
  totalProjects: number
  activeEquipment: number
  totalRevenue: number
  crewMembers: number
  equipmentUtilization: number
}

interface Project {
  id: number
  name: string
  client_name: string
  start_date: string
  end_date: string
  status: string
  budget: number
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  draft: 'Mustand',
  confirmed: 'Kinnitatud',
  in_progress: 'Töös',
  completed: 'Lõpetatud',
  cancelled: 'Tühistatud',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
      {statusLabels[status] || status}
    </span>
  )
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'dd.MM.yyyy')
  } catch {
    return dateStr
  }
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [upcomingProjects, setUpcomingProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, projectsRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/projects?limit=10&sort=start_date'),
        ])
        setOverview(overviewRes.data)
        const projects: Project[] = projectsRes.data.projects || projectsRes.data || []
        setRecentProjects(projects.slice(0, 5))
        const now = new Date()
        setUpcomingProjects(
          projects.filter((p) => new Date(p.start_date) > now && p.status !== 'cancelled').slice(0, 4)
        )
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  const metrics = [
    {
      label: 'Projektid kokku',
      value: overview?.totalProjects ?? 0,
      icon: FolderIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/app/projects',
    },
    {
      label: 'Aktiivsed seadmed',
      value: overview?.activeEquipment ?? 0,
      icon: CubeIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: '/app/equipment',
    },
    {
      label: 'Tulu kokku',
      value: `€${((overview?.totalRevenue ?? 0) / 1000).toFixed(1)}k`,
      icon: CurrencyEuroIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
      link: '/app/invoices',
    },
    {
      label: 'Meeskonnaliikmed',
      value: overview?.crewMembers ?? 0,
      icon: UsersIcon,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      link: '/app/crew',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Töölaud</h1>
        <p className="text-gray-500 text-sm mt-1">Tere tulemast tagasi! Siin on tänane ülevaade.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Link
            key={label}
            to={link}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Seadmete kasutusaste</h2>
          <Link to="/app/analytics" className="text-sm text-primary hover:underline">Vaata analüütikat →</Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${overview?.equipmentUtilization ?? 0}%` }}
            />
          </div>
          <span className="text-xl font-bold text-gray-900 w-14 text-right">
            {overview?.equipmentUtilization ?? 0}%
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Seadmete osakaal, mis on praegu aktiivsete projektide jaoks määratud</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Viimased projektid</h2>
            <Link to="/app/projects" className="text-sm text-primary hover:underline">Vaata kõiki →</Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <FolderIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Projekte pole veel</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="text-left px-6 py-3">Projekt</th>
                    <th className="text-left px-6 py-3 hidden sm:table-cell">Klient</th>
                    <th className="text-left px-6 py-3">Staatus</th>
                    <th className="text-right px-6 py-3 hidden md:table-cell">Eelarve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <Link to={`/app/projects/${p.id}`} className="font-medium text-gray-900 hover:text-primary">
                          {p.name}
                        </Link>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatDate(p.start_date)} – {formatDate(p.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600 hidden sm:table-cell">{p.client_name || '—'}</td>
                      <td className="px-6 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-3 text-right text-gray-700 font-medium hidden md:table-cell">
                        {p.budget ? `€${p.budget.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Tulevased projektid</h2>
            <Link to="/app/calendar" className="text-sm text-primary hover:underline">Vaata kalendrit →</Link>
          </div>
          {upcomingProjects.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <ClockIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tulevasi projekte pole</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingProjects.map((p) => (
                <div key={p.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link to={`/app/projects/${p.id}`} className="font-medium text-gray-900 hover:text-primary">
                        {p.name}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{p.client_name || 'Klient puudub'}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {formatDate(p.start_date)} – {formatDate(p.end_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
