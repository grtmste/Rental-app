import React, { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface Overview { total_projects: number; total_revenue: number; equipment_utilization: number; active_projects: number }
interface RevenuePoint { month: string; revenue: number }
interface EquipmentUtil { name: string; utilization: number; days_used: number }
interface TopClient { name: string; company: string; revenue: number; project_count: number }
interface CrewHours { name: string; total_hours: number; total_revenue: number }

export default function Analytics() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [equipment, setEquipment] = useState<EquipmentUtil[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [crewHours, setCrewHours] = useState<CrewHours[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [ovRes, revRes, eqRes, clientRes, crewRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/revenue'),
        api.get('/analytics/equipment-utilization'),
        api.get('/analytics/top-clients'),
        api.get('/analytics/crew-hours'),
      ])
      setOverview(ovRes.data)
      setRevenue(revRes.data)
      setEquipment(eqRes.data)
      setTopClients(clientRes.data)
      setCrewHours(crewRes.data)
    } catch {
      toast.error('Analüütika laadimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analüütika ja aruanded</h1>
        <p className="text-gray-500 text-sm mt-1">Ettevõtte tulemuslikkuse ülevaade</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tulu kokku', value: `€${Number(overview?.total_revenue || 0).toLocaleString('et-EE', { minimumFractionDigits: 2 })}`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Projektid kokku', value: overview?.total_projects || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Aktiivsed projektid', value: overview?.active_projects || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Seadmete kasutusaste', value: `${Number(overview?.equipment_utilization || 0).toFixed(1)}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-3`}>
              <span className={`text-lg font-bold ${card.color}`}>
                {typeof card.value === 'string' && card.value.startsWith('€') ? '€' : '#'}
              </span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Tulu — viimased 12 kuud</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${v}`} />
            <Tooltip formatter={(v: number) => [`€${Number(v).toFixed(2)}`, 'Tulu']} />
            <Line type="monotone" dataKey="revenue" stroke="#1A3C6E" strokeWidth={2} dot={{ fill: '#1A3C6E', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Seadmete kasutusaste</h3>
          {equipment.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Kasutusandmed puuduvad</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={equipment.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => [`${Number(v).toFixed(1)}%`, 'Kasutusaste']} />
                <Bar dataKey="utilization" fill="#F97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Meeskonna töötunnid</h3>
          {crewHours.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Töötunniandmed puuduvad</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={crewHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}t`, 'Tunnid']} />
                <Bar dataKey="total_hours" fill="#1A3C6E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Tulu järgi TOP kliendid</h3>
        {topClients.length === 0 ? (
          <p className="text-gray-400 text-sm">Andmed puuduvad</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase border-b border-gray-200">
                <th className="pb-2 text-left">#</th>
                <th className="pb-2 text-left">Klient</th>
                <th className="pb-2 text-left">Ettevõte</th>
                <th className="pb-2 text-right">Projektid</th>
                <th className="pb-2 text-right">Tulu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topClients.map((c, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-3 text-gray-400 font-medium">#{idx + 1}</td>
                  <td className="py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="py-3 text-gray-500">{c.company || '—'}</td>
                  <td className="py-3 text-right text-gray-700">{c.project_count}</td>
                  <td className="py-3 text-right font-semibold text-green-600">€{Number(c.revenue || 0).toLocaleString('et-EE', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
