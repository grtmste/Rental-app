import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface Client {
  id: number; name: string; company: string; email: string; phone: string; address: string; notes: string
}
interface Project {
  id: number; name: string; status: string; start_date: string; end_date: string; budget: number
}
interface CommLog {
  id: number; type: string; subject: string; message: string; created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [comms, setComms] = useState<CommLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', address: '', notes: '' })
  const [logForm, setLogForm] = useState({ type: 'note', subject: '', message: '' })
  const [savingLog, setSavingLog] = useState(false)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    try {
      const [cRes, commRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/clients/${id}/communications`),
      ])
      const clientData = cRes.data
      setClient(clientData)
      setProjects(clientData.projects || [])
      setForm({
        name: clientData.name || '',
        company: clientData.company || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        notes: clientData.notes || '',
      })
      setComms(commRes.data)
    } catch {
      toast.error('Failed to load client')
    } finally {
      setLoading(false)
    }
  }

  async function saveClient() {
    try {
      await api.put(`/clients/${id}`, form)
      toast.success('Client updated')
      setEditing(false)
      fetchAll()
    } catch {
      toast.error('Failed to save client')
    }
  }

  async function addLog() {
    if (!logForm.message.trim()) { toast.error('Message is required'); return }
    setSavingLog(true)
    try {
      await api.post(`/clients/${id}/communications`, logForm)
      toast.success('Note added')
      setLogForm({ type: 'note', subject: '', message: '' })
      fetchAll()
    } catch {
      toast.error('Failed to add note')
    } finally {
      setSavingLog(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
  if (!client) return <div className="p-8 text-gray-500">Client not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/app/crm" className="hover:text-primary">CRM</Link>
            <span>/</span>
            <span>{client.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          {client.company && <p className="text-gray-500">{client.company}</p>}
        </div>
        <button onClick={() => setEditing(!editing)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
          {editing ? 'Cancel Edit' : 'Edit Client'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contact Info</h3>
          {editing ? (
            <div className="space-y-3">
              {['name','company','email','phone','address','notes'].map(field => (
                <div key={field}>
                  <label className="text-xs text-gray-500 capitalize">{field}</label>
                  {field === 'notes' || field === 'address' ? (
                    <textarea value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" rows={2} />
                  ) : (
                    <input value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  )}
                </div>
              ))}
              <button onClick={saveClient} className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">Save Changes</button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {client.email && <div><span className="text-gray-400">Email</span><p className="text-gray-900">{client.email}</p></div>}
              {client.phone && <div><span className="text-gray-400">Phone</span><p className="text-gray-900">{client.phone}</p></div>}
              {client.address && <div><span className="text-gray-400">Address</span><p className="text-gray-900">{client.address}</p></div>}
              {client.notes && <div><span className="text-gray-400">Notes</span><p className="text-gray-700 text-xs mt-1">{client.notes}</p></div>}
            </div>
          )}
        </div>

        {/* Project History */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Project History ({projects.length})</h3>
          {projects.length === 0 ? (
            <p className="text-gray-400 text-sm">No projects yet</p>
          ) : (
            <div className="space-y-2">
              {projects.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => navigate(`/app/projects/${p.id}`)}>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {p.start_date ? new Date(p.start_date).toLocaleDateString('et-EE') : '—'} – {p.end_date ? new Date(p.end_date).toLocaleDateString('et-EE') : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">€{Number(p.budget || 0).toLocaleString('et-EE', { minimumFractionDigits: 2 })}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Communication Log */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Communication Log</h3>
        <div className="space-y-4 mb-6">
          {comms.length === 0 ? (
            <p className="text-gray-400 text-sm">No communications logged yet</p>
          ) : (
            comms.map(log => (
              <div key={log.id} className="border-l-4 border-primary pl-4 py-1">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="capitalize font-medium text-gray-600">{log.type}</span>
                  {log.subject && <span>· {log.subject}</span>}
                  <span>· {new Date(log.created_at).toLocaleDateString('et-EE')} {new Date(log.created_at).toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{log.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Add log form */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Add Note</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Type</label>
              <select value={logForm.type} onChange={e => setLogForm(p => ({ ...p, type: e.target.value }))} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="note">Note</option>
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Subject</label>
              <input value={logForm.subject} onChange={e => setLogForm(p => ({ ...p, subject: e.target.value }))} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Message *</label>
            <textarea value={logForm.message} onChange={e => setLogForm(p => ({ ...p, message: e.target.value }))} rows={2} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <button onClick={addLog} disabled={savingLog} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
            {savingLog ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
