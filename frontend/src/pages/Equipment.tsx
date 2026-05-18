import React, { useEffect, useState, useCallback } from 'react'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  QrCodeIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import api from '../utils/api'
import toast from 'react-hot-toast'

interface Category {
  id: number
  name: string
}

interface Equipment {
  id: number
  name: string
  category_id: number | null
  category_name: string | null
  total_quantity: number
  available_quantity: number
  condition: string
  location: string
  description: string
  daily_rate: number
  qr_code?: string
}

interface LogEntry {
  id: number
  action: string
  quantity: number
  project_name: string
  user_name: string
  created_at: string
}

interface AvailabilityItem {
  equipment_id: number
  name: string
  category_name: string | null
  total_quantity: number
  booked_qty: number
  available_qty: number
}

const conditionColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-red-100 text-red-700',
  under_repair: 'bg-orange-100 text-orange-700',
}

const conditionLabels: Record<string, string> = {
  excellent: 'Suurepärane',
  good: 'Hea',
  fair: 'Rahuldav',
  poor: 'Halb',
  under_repair: 'Remondis',
}

const EMPTY_FORM = {
  name: '',
  category_id: '',
  newCategory: '',
  total_quantity: 1,
  condition: 'good',
  location: '',
  description: '',
  daily_rate: 0,
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Equipment | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [showQR, setShowQR] = useState<Equipment | null>(null)
  const [showLogs, setShowLogs] = useState<Equipment | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Availability calendar state
  const [showAvailCalendar, setShowAvailCalendar] = useState(false)
  const [availDate, setAvailDate] = useState(new Date().toISOString().split('T')[0])
  const [availData, setAvailData] = useState<AvailabilityItem[]>([])
  const [availLoading, setAvailLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [eqRes, catRes] = await Promise.all([
        api.get('/equipment'),
        api.get('/categories'),
      ])
      const items: Equipment[] = eqRes.data.equipment || eqRes.data || []
      setEquipment(items)
      setCategories(catRes.data || [])
    } catch {
      toast.error('Seadmete laadimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchAvailability = useCallback(async (date: string) => {
    setAvailLoading(true)
    try {
      const res = await api.get(`/inventory/availability?date=${date}`)
      setAvailData(res.data || [])
    } catch {
      toast.error('Varude kalendri laadimine ebaõnnestus')
    } finally {
      setAvailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showAvailCalendar) fetchAvailability(availDate)
  }, [showAvailCalendar, availDate, fetchAvailability])

  const filtered = equipment.filter((e) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || e.name.toLowerCase().includes(q)
      || (e.category_name || '').toLowerCase().includes(q)
      || (e.location || '').toLowerCase().includes(q)
    const matchCat = !filterCategory || String(e.category_id) === filterCategory
    return matchSearch && matchCat
  })

  const openAdd = () => {
    setEditItem(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const openEdit = (item: Equipment) => {
    setEditItem(item)
    setForm({
      name: item.name,
      category_id: item.category_id ? String(item.category_id) : '',
      newCategory: '',
      total_quantity: item.total_quantity,
      condition: item.condition,
      location: item.location || '',
      description: item.description || '',
      daily_rate: item.daily_rate || 0,
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      let categoryId: number | null = null

      if (form.category_id === '__new__') {
        const newName = form.newCategory.trim()
        if (newName) {
          const res = await api.post('/categories', { name: newName })
          categoryId = res.data.id
          setCategories(prev => [...prev, res.data])
        }
      } else if (form.category_id) {
        categoryId = Number(form.category_id)
      }

      const payload = {
        name: form.name,
        category_id: categoryId,
        total_quantity: Number(form.total_quantity),
        condition: form.condition,
        location: form.location,
        description: form.description,
        daily_rate: Number(form.daily_rate),
      }

      if (editItem) {
        await api.put(`/equipment/${editItem.id}`, payload)
        toast.success('Seade uuendatud')
      } else {
        await api.post('/equipment', payload)
        toast.success('Seade lisatud')
      }
      setShowModal(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Salvestamine ebaõnnestus')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: Equipment) => {
    if (!window.confirm(`Kustuta "${item.name}"? Seda ei saa tagasi võtta.`)) return
    setDeleting(item.id)
    try {
      await api.delete(`/equipment/${item.id}`)
      toast.success('Seade kustutatud')
      fetchData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Kustutamine ebaõnnestus')
    } finally {
      setDeleting(null)
    }
  }

  const openLogs = async (item: Equipment) => {
    setShowLogs(item)
    setLogsLoading(true)
    try {
      const res = await api.get(`/equipment/${item.id}/logs`)
      setLogs(res.data.logs || res.data || [])
    } catch {
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  const availColor = (item: Equipment) => {
    if (item.available_quantity === 0) return 'text-red-600 font-semibold'
    if (item.available_quantity <= item.total_quantity * 0.2) return 'text-yellow-600 font-semibold'
    return 'text-gray-900'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seadmed</h1>
          <p className="text-sm text-gray-500">{equipment.length} seadet laos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAvailCalendar(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${showAvailCalendar ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Varude kalender
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Lisa seade
          </button>
        </div>
      </div>

      {/* ── Availability Calendar ── */}
      {showAvailCalendar && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Varude kalender</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 font-medium">Kuupäev:</label>
              <input
                type="date"
                value={availDate}
                onChange={e => setAvailDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          {availLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : availData.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Seadmeid ei leitud</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                    <th className="text-left px-4 py-2">Seade</th>
                    <th className="text-left px-4 py-2">Kategooria</th>
                    <th className="text-center px-4 py-2">Kokku</th>
                    <th className="text-center px-4 py-2">Broneeritud</th>
                    <th className="text-center px-4 py-2">Saadaval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {availData.map(item => {
                    const avail = Number(item.available_qty)
                    const total = Number(item.total_quantity)
                    const availClass = avail === 0
                      ? 'text-red-600 font-bold'
                      : avail < total
                        ? 'text-yellow-600 font-semibold'
                        : 'text-green-600 font-semibold'
                    return (
                      <tr key={item.equipment_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-2.5 text-gray-500">{item.category_name || '—'}</td>
                        <td className="px-4 py-2.5 text-center text-gray-700">{total}</td>
                        <td className="px-4 py-2.5 text-center text-gray-700">{Number(item.booked_qty)}</td>
                        <td className={`px-4 py-2.5 text-center ${availClass}`}>{avail}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Otsi nime, kategooria, asukoha järgi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Kõik kategooriad</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CubeIconOutline className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Seadmeid ei leitud</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase">
                  <th className="text-left px-6 py-3">Nimi</th>
                  <th className="text-left px-6 py-3">Kategooria</th>
                  <th className="text-center px-6 py-3">Kokku</th>
                  <th className="text-center px-6 py-3">Saadaval</th>
                  <th className="text-left px-6 py-3">Seisukord</th>
                  <th className="text-left px-6 py-3 hidden md:table-cell">Asukoht</th>
                  <th className="text-right px-6 py-3 hidden lg:table-cell">Päevamäär</th>
                  <th className="text-right px-6 py-3">Toimingud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-gray-500">{item.category_name || '—'}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{item.total_quantity}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={availColor(item)}>
                        {item.available_quantity === 0 && '🚫 '}
                        {item.available_quantity > 0 && item.available_quantity <= item.total_quantity * 0.2 && '⚠️ '}
                        {item.available_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditionColors[item.condition] || 'bg-gray-100 text-gray-700'}`}>
                        {conditionLabels[item.condition] || item.condition || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 hidden md:table-cell">{item.location || '—'}</td>
                    <td className="px-6 py-4 text-right text-gray-700 hidden lg:table-cell">
                      {item.daily_rate ? `€${Number(item.daily_rate).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded transition-colors" title="Muuda">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setShowQR(item)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="QR-kood">
                          <QrCodeIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => openLogs(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Vaata logisid">
                          <ClipboardDocumentListIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deleting === item.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Kustuta"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lisa/Muuda modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editItem ? 'Muuda seadet' : 'Lisa seade'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nimi *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="nt. Shure SM58 mikrofon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategooria</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Vali kategooria</option>
                  {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  <option value="__new__">+ Loo uus...</option>
                </select>
                {form.category_id === '__new__' && (
                  <input
                    type="text"
                    placeholder="Uue kategooria nimi"
                    value={form.newCategory}
                    onChange={(e) => setForm({ ...form, newCategory: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kogus *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.total_quantity}
                    onChange={(e) => setForm({ ...form, total_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Päevamäär (€)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.daily_rate}
                    onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seisukord</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="excellent">Suurepärane</option>
                  <option value="good">Hea</option>
                  <option value="fair">Rahuldav</option>
                  <option value="poor">Halb</option>
                  <option value="under_repair">Remondis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asukoht</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="nt. Ladu A, Riiul 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kirjeldus</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Valikulised märkmed või kirjeldus"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Tühista
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {saving ? 'Salvestamine...' : editItem ? 'Salvesta muudatused' : 'Lisa seade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR-koodi modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">QR-kood</h2>
              <button onClick={() => setShowQR(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              {showQR.qr_code ? (
                <img src={`data:image/png;base64,${showQR.qr_code}`} alt="QR-kood" className="mx-auto mb-4 w-48 h-48" />
              ) : (
                <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-4 flex-col">
                  <QrCodeIcon className="h-16 w-16 text-gray-300" />
                  <p className="text-xs text-gray-400 mt-2">QR-koodi ei ole</p>
                </div>
              )}
              <p className="font-semibold text-gray-900">{showQR.name}</p>
              <p className="text-sm text-gray-500">{showQR.category_name}</p>
              <p className="text-xs text-gray-400 mt-1">ID: {showQR.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logide modal */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Kasutuslogid — {showLogs.name}</h2>
              <button onClick={() => setShowLogs(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {logsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Logisid ei leitud</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left px-6 py-3">Toiming</th>
                      <th className="text-center px-6 py-3">Kogus</th>
                      <th className="text-left px-6 py-3">Projekt</th>
                      <th className="text-left px-6 py-3">Kasutaja</th>
                      <th className="text-left px-6 py-3">Kuupäev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${log.action === 'check_out' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {log.action === 'check_out' ? 'Väljas' : 'Tagastatud'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">{log.quantity}</td>
                        <td className="px-6 py-3 text-gray-600">{log.project_name || '—'}</td>
                        <td className="px-6 py-3 text-gray-600">{log.user_name || '—'}</td>
                        <td className="px-6 py-3 text-gray-500">
                          {log.created_at ? new Date(log.created_at).toLocaleDateString('et-EE') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CubeIconOutline({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}
