import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PlusIcon,
  FolderIcon,
  XMarkIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  TrashIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Project {
  id: number
  name: string
  client_name: string
  client_id: number
  start_date: string
  end_date: string
  status: string
  budget: number
  description: string
}

interface Client {
  id: number
  name: string
  company: string
}

interface ProjectStatus {
  id: number
  key: string
  label: string
  color: string
  sort_order: number
  is_default: boolean
}

// Fallback colors map for known status keys
const DEFAULT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

// Convert a color name to Tailwind classes
function colorToTailwind(color: string): string {
  const map: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    pink: 'bg-pink-100 text-pink-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    teal: 'bg-teal-100 text-teal-700',
  }
  return map[color] || 'bg-gray-100 text-gray-700'
}

function formatDate(d: string) {
  try { return format(new Date(d), 'dd.MM.yyyy') } catch { return d }
}

const EMPTY_FORM = {
  name: '',
  client_id: '',
  start_date: '',
  end_date: '',
  status: 'draft',
  budget: '',
  description: '',
}

const COLOR_OPTIONS = ['gray', 'blue', 'orange', 'green', 'red', 'purple', 'yellow', 'pink', 'indigo', 'teal']

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  // Templates (create from template)
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([])
  const [useTemplateId, setUseTemplateId] = useState('')

  // Status management
  const [statuses, setStatuses] = useState<ProjectStatus[]>([])
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusEdits, setStatusEdits] = useState<Record<number, { label: string; color: string }>>({})
  const [newStatusKey, setNewStatusKey] = useState('')
  const [newStatusLabel, setNewStatusLabel] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('gray')
  const [savingStatus, setSavingStatus] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects')
      setProjects(res.data.projects || res.data || [])
    } catch {
      toast.error('Projektide laadimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await api.get('/project-statuses')
      setStatuses(res.data || [])
    } catch {
      // fallback to defaults if API not available
    }
  }, [])

  useEffect(() => {
    fetchProjects()
    fetchStatuses()
    api.get('/clients').then((r) => setClients(r.data.clients || r.data || [])).catch(() => {})
    api.get('/project-templates').then((r) => setTemplates(r.data || [])).catch(() => {})
  }, [fetchProjects, fetchStatuses])

  const getStatusLabel = (key: string) => {
    const s = statuses.find(s => s.key === key)
    return s ? s.label : key
  }

  const getStatusClass = (key: string) => {
    const s = statuses.find(s => s.key === key)
    if (s) return colorToTailwind(s.color)
    return DEFAULT_STATUS_COLORS[key] || 'bg-gray-100 text-gray-700'
  }

  function StatusBadge({ status }: { status: string }) {
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
        {getStatusLabel(status)}
      </span>
    )
  }

  const filtered = filterStatus ? projects.filter((p) => p.status === filterStatus) : projects

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      let newId: number | undefined
      if (useTemplateId) {
        // Create from template
        const res = await api.post(`/project-templates/${useTemplateId}/create-project`, {
          name: form.name,
          client_id: form.client_id ? Number(form.client_id) : undefined,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        })
        newId = res.data.id
        toast.success('Projekt loodud mallist')
      } else {
        const payload = {
          name: form.name,
          client_id: form.client_id ? Number(form.client_id) : undefined,
          start_date: form.start_date,
          end_date: form.end_date,
          status: form.status,
          budget: form.budget ? Number(form.budget) : undefined,
          description: form.description,
        }
        const res = await api.post('/projects', payload)
        newId = res.data.id || res.data.project?.id
        toast.success('Projekt loodud')
      }
      setShowModal(false)
      setForm({ ...EMPTY_FORM })
      setUseTemplateId('')
      if (newId) navigate(`/app/projects/${newId}`)
      else fetchProjects()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Loomine ebaõnnestus')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/projects/${deleteTarget.id}`)
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success('Projekt kustutatud')
      setDeleteTarget(null)
    } catch {
      toast.error('Projekti kustutamine ebaõnnestus')
    } finally {
      setDeleting(false)
    }
  }

  function openStatusModal() {
    const edits: Record<number, { label: string; color: string }> = {}
    statuses.forEach(s => { edits[s.id] = { label: s.label, color: s.color } })
    setStatusEdits(edits)
    setNewStatusKey('')
    setNewStatusLabel('')
    setNewStatusColor('gray')
    setShowStatusModal(true)
  }

  async function saveStatusEdit(id: number) {
    const edit = statusEdits[id]
    if (!edit) return
    setSavingStatus(true)
    try {
      const res = await api.put(`/project-statuses/${id}`, { label: edit.label, color: edit.color })
      setStatuses(prev => prev.map(s => s.id === id ? res.data : s))
      toast.success('Olek uuendatud')
    } catch {
      toast.error('Oleku uuendamine ebaõnnestus')
    } finally {
      setSavingStatus(false)
    }
  }

  async function addNewStatus() {
    if (!newStatusKey.trim() || !newStatusLabel.trim()) {
      toast.error('Võtme ja nimetuse sisestamine on kohustuslik')
      return
    }
    setSavingStatus(true)
    try {
      const res = await api.post('/project-statuses', {
        key: newStatusKey.trim().toLowerCase().replace(/\s+/g, '_'),
        label: newStatusLabel.trim(),
        color: newStatusColor,
      })
      setStatuses(prev => [...prev, res.data])
      setNewStatusKey('')
      setNewStatusLabel('')
      setNewStatusColor('gray')
      toast.success('Olek lisatud')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Oleku lisamine ebaõnnestus')
    } finally {
      setSavingStatus(false)
    }
  }

  async function deleteStatus(id: number) {
    if (!window.confirm('Kustuta see olek?')) return
    try {
      await api.delete(`/project-statuses/${id}`)
      setStatuses(prev => prev.filter(s => s.id !== id))
      toast.success('Olek kustutatud')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Kustutamine ebaõnnestus')
    }
  }

  // Filter buttons: use statuses from API if available, else fallback
  const filterStatusKeys = statuses.length > 0
    ? statuses.map(s => s.key)
    : ['draft', 'confirmed', 'in_progress', 'completed', 'cancelled']

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
          <h1 className="text-2xl font-bold text-gray-900">Projektid</h1>
          <p className="text-sm text-gray-500">{projects.length} projekti kokku</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openStatusModal}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            title="Halda olekuid"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Olekud</span>
          </button>
          <button
            onClick={() => { setForm({ ...EMPTY_FORM }); setUseTemplateId(''); setShowModal(true) }}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Loo projekt
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === '' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Kõik
        </button>
        {filterStatusKeys.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {getStatusLabel(s)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <FolderIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Projekte ei leitud</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <div key={p.id} className="relative bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-primary transition-all group">
              <Link to={`/app/projects/${p.id}`} className="block p-6">
                <div className="flex items-start justify-between mb-3 pr-6">
                  <h3 className="font-semibold text-gray-900 text-base line-clamp-2">{p.name}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-gray-500 mb-4">{p.client_name || 'Klient puudub'}</p>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(p.start_date)} – {formatDate(p.end_date)}</span>
                  </div>
                  {p.budget && (
                    <div className="flex items-center gap-2">
                      <CurrencyEuroIcon className="h-4 w-4 text-gray-400" />
                      <span>€{p.budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </Link>
              <button
                onClick={() => setDeleteTarget(p)}
                className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Kustuta projekt"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Status Management Modal ── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Projekti olekute haldamine</h2>
              <button onClick={() => setShowStatusModal(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {statuses.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <input
                      value={statusEdits[s.id]?.label ?? s.label}
                      onChange={e => setStatusEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], label: e.target.value } }))}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Oleku nimetus"
                    />
                  </div>
                  <select
                    value={statusEdits[s.id]?.color ?? s.color}
                    onChange={e => setStatusEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], color: e.target.value } }))}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  >
                    {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorToTailwind(statusEdits[s.id]?.color ?? s.color)}`}>
                    {statusEdits[s.id]?.label ?? s.label}
                  </span>
                  <button
                    onClick={() => saveStatusEdit(s.id)}
                    disabled={savingStatus}
                    className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
                  >
                    Salvesta
                  </button>
                  {!s.is_default && (
                    <button
                      onClick={() => deleteStatus(s.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                      title="Kustuta"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Lisa uus olek</h3>
                <div className="flex gap-2 flex-wrap">
                  <input
                    value={newStatusKey}
                    onChange={e => setNewStatusKey(e.target.value)}
                    placeholder="Võti (nt. on_hold)"
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    value={newStatusLabel}
                    onChange={e => setNewStatusLabel(e.target.value)}
                    placeholder="Nimetus (nt. Ootel)"
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={newStatusColor}
                    onChange={e => setNewStatusColor(e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  >
                    {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    onClick={addNewStatus}
                    disabled={savingStatus}
                    className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                  >
                    Lisa
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100">
              <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Sulge</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kustuta projekt</h3>
            <p className="text-sm text-gray-600 mb-6">
              Kas oled kindel, et soovid projekti <strong>„{deleteTarget.name}"</strong> kustutada? Seda toimingut ei saa tagasi võtta.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Tühista
              </button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-60">
                {deleting ? 'Kustutan...' : 'Kustuta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Loo projekt</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loo mallist</label>
                  <select
                    value={useTemplateId}
                    onChange={(e) => setUseTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Tühi projekt (ilma mallita)</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {useTemplateId && (
                    <p className="text-xs text-gray-400 mt-1">Mallist kopeeritakse etapid ja seadmed uude projekti.</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projekti nimi *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="nt. Suvefestival 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Klient</label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Klient puudub</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.company ? `${c.name} (${c.company})` : c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alguskuupäev *</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lõppkuupäev *</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staatus</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {statuses.length > 0
                      ? statuses.map(s => <option key={s.key} value={s.key}>{s.label}</option>)
                      : (
                        <>
                          <option value="draft">Mustand</option>
                          <option value="confirmed">Kinnitatud</option>
                          <option value="in_progress">Töös</option>
                          <option value="completed">Lõpetatud</option>
                          <option value="cancelled">Tühistatud</option>
                        </>
                      )
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eelarve (€)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kirjeldus</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Projekti märkmed..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Tühista</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg disabled:opacity-60">
                  {saving ? 'Loomine...' : 'Loo projekt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
