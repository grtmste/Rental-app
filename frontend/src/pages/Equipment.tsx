import React, { useEffect, useState, useCallback } from 'react'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  QrCodeIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import api from '../utils/api'
import toast from 'react-hot-toast'

interface Equipment {
  id: number
  name: string
  category: string
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

const conditionColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-red-100 text-red-700',
  under_repair: 'bg-orange-100 text-orange-700',
}

const EMPTY_FORM = {
  name: '',
  category: '',
  newCategory: '',
  total_quantity: 1,
  condition: 'good',
  location: '',
  description: '',
  daily_rate: 0,
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<string[]>([])
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

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await api.get('/equipment')
      const items: Equipment[] = res.data.equipment || res.data || []
      setEquipment(items)
      const cats = Array.from(new Set(items.map((e) => e.category).filter(Boolean))) as string[]
      setCategories(cats)
    } catch {
      toast.error('Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEquipment() }, [fetchEquipment])

  const filtered = equipment.filter((e) => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.name.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q)
    const matchCat = !filterCategory || e.category === filterCategory
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
      category: item.category || '',
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
      const category = form.category === '__new__' ? form.newCategory.trim() : form.category
      const payload = {
        name: form.name,
        category,
        total_quantity: Number(form.total_quantity),
        condition: form.condition,
        location: form.location,
        description: form.description,
        daily_rate: Number(form.daily_rate),
      }
      if (editItem) {
        await api.put(`/equipment/${editItem.id}`, payload)
        toast.success('Equipment updated')
      } else {
        await api.post('/equipment', payload)
        toast.success('Equipment added')
      }
      setShowModal(false)
      fetchEquipment()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: Equipment) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    setDeleting(item.id)
    try {
      await api.delete(`/equipment/${item.id}`)
      toast.success('Equipment deleted')
      fetchEquipment()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed')
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
          <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
          <p className="text-sm text-gray-500">{equipment.length} items in inventory</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, category, location..."
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
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CubeIconOutline className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No equipment found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase">
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Category</th>
                  <th className="text-center px-6 py-3">Total</th>
                  <th className="text-center px-6 py-3">Available</th>
                  <th className="text-left px-6 py-3">Condition</th>
                  <th className="text-left px-6 py-3 hidden md:table-cell">Location</th>
                  <th className="text-right px-6 py-3 hidden lg:table-cell">Daily Rate</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-gray-500">{item.category || '—'}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{item.total_quantity}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={availColor(item)}>
                        {item.available_quantity === 0 && '🚫 '}
                        {item.available_quantity > 0 && item.available_quantity <= item.total_quantity * 0.2 && '⚠️ '}
                        {item.available_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${conditionColors[item.condition] || 'bg-gray-100 text-gray-700'}`}>
                        {item.condition?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 hidden md:table-cell">{item.location || '—'}</td>
                    <td className="px-6 py-4 text-right text-gray-700 hidden lg:table-cell">
                      {item.daily_rate ? `€${item.daily_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded transition-colors" title="Edit">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setShowQR(item)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="QR Code">
                          <QrCodeIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => openLogs(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View Logs">
                          <ClipboardDocumentListIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deleting === item.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editItem ? 'Edit Equipment' : 'Add Equipment'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Shure SM58 Microphone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ Create new...</option>
                </select>
                {form.category === '__new__' && (
                  <input
                    type="text"
                    placeholder="New category name"
                    value={form.newCategory}
                    onChange={(e) => setForm({ ...form, newCategory: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Quantity *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (€)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="under_repair">Under Repair</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Warehouse A, Shelf 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Optional notes or description"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">QR Code</h2>
              <button onClick={() => setShowQR(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              {showQR.qr_code ? (
                <img src={`data:image/png;base64,${showQR.qr_code}`} alt="QR Code" className="mx-auto mb-4 w-48 h-48" />
              ) : (
                <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  <QrCodeIcon className="h-16 w-16 text-gray-300" />
                  <p className="text-xs text-gray-400 mt-2">No QR code</p>
                </div>
              )}
              <p className="font-semibold text-gray-900">{showQR.name}</p>
              <p className="text-sm text-gray-500">{showQR.category}</p>
              <p className="text-xs text-gray-400 mt-1">ID: {showQR.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Usage Logs — {showLogs.name}</h2>
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
                <div className="p-8 text-center text-gray-400">No logs found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left px-6 py-3">Action</th>
                      <th className="text-center px-6 py-3">Qty</th>
                      <th className="text-left px-6 py-3">Project</th>
                      <th className="text-left px-6 py-3">User</th>
                      <th className="text-left px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${log.action === 'check_out' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {log.action?.replace('_', ' ')}
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

// Inline icon to avoid import issues
function CubeIconOutline({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}
