import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface CrewMember {
  id: number
  name: string
  role: string
  skills: string[]
  phone: string
  email: string
  hourly_rate: number
  availability_notes: string
}

const ROLES = [
  'Helitehnik', 'Valgustehnik', 'Lavaülem', 'Rigger', 'Autojuht',
  'Kaameraoperaator', 'AV-tehnik', 'Tootmisjuht', 'Meeskonnajuht', 'Muu'
]

export default function Crew() {
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [form, setForm] = useState({
    name: '', role: '', skills: [] as string[], phone: '', email: '', hourly_rate: '', availability_notes: '',
  })

  useEffect(() => { fetchCrew() }, [])

  async function fetchCrew() {
    setLoading(true)
    try {
      const res = await api.get('/crew')
      setCrew(res.data)
    } catch {
      toast.error('Meeskonna laadimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm({ name: '', role: '', skills: [], phone: '', email: '', hourly_rate: '', availability_notes: '' })
    setSkillInput('')
    setShowModal(true)
  }

  function openEdit(m: CrewMember) {
    setEditingId(m.id)
    setForm({ name: m.name, role: m.role || '', skills: m.skills || [], phone: m.phone || '', email: m.email || '', hourly_rate: String(m.hourly_rate || ''), availability_notes: m.availability_notes || '' })
    setSkillInput('')
    setShowModal(true)
  }

  function addSkill() {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s)) {
      setForm(p => ({ ...p, skills: [...p.skills, s] }))
    }
    setSkillInput('')
  }

  function removeSkill(s: string) {
    setForm(p => ({ ...p, skills: p.skills.filter(x => x !== s) }))
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Nimi on kohustuslik'); return }
    try {
      const payload = { ...form, hourly_rate: parseFloat(form.hourly_rate) || 0 }
      if (editingId) {
        await api.put(`/crew/${editingId}`, payload)
        toast.success('Meeskonnaliige uuendatud')
      } else {
        await api.post('/crew', payload)
        toast.success('Meeskonnaliige lisatud')
      }
      setShowModal(false)
      fetchCrew()
    } catch {
      toast.error('Salvestamine ebaõnnestus')
    }
  }

  async function deleteMember(id: number) {
    if (!confirm('Kustuta see meeskonnaliige?')) return
    try {
      await api.delete(`/crew/${id}`)
      toast.success('Meeskonnaliige kustutatud')
      fetchCrew()
    } catch {
      toast.error('Kustutamine ebaõnnestus')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeskond</h1>
          <p className="text-gray-500 text-sm mt-1">{crew.length} meeskonnaliiget</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          + Lisa meeskonnaliige
        </button>
      </div>

      {crew.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Meeskonnaliikmeid pole veel</h3>
          <p className="text-gray-500 mb-4">Lisa esimene meeskonnaliige alustamiseks</p>
          <button onClick={openCreate} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Lisa meeskonnaliige</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {crew.map(m => (
            <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                    {m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{m.name}</h3>
                    <p className="text-sm text-gray-500">{m.role || 'Roll puudub'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(m)} className="text-gray-400 hover:text-primary text-sm">Muuda</button>
                  <button onClick={() => deleteMember(m.id)} className="text-gray-400 hover:text-red-500 text-sm">Kustuta</button>
                </div>
              </div>

              {m.skills && m.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {m.skills.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">{s}</span>
                  ))}
                </div>
              )}

              <div className="space-y-1 text-sm text-gray-600">
                {m.email && <div className="flex items-center gap-2"><span className="text-gray-400">✉</span>{m.email}</div>}
                {m.phone && <div className="flex items-center gap-2"><span className="text-gray-400">📞</span>{m.phone}</div>}
                {m.hourly_rate > 0 && <div className="flex items-center gap-2"><span className="text-gray-400">€</span>€{Number(m.hourly_rate).toFixed(2)}/t</div>}
              </div>

              {m.availability_notes && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">{m.availability_notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Muuda meeskonnaliiget' : 'Lisa meeskonnaliige'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Nimi *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Roll</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Vali roll</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tunnimäär (€)</label>
                  <input type="number" step="0.01" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">E-post</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefon</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Oskused</label>
                <div className="flex gap-2 mt-1">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} placeholder="Lisa oskus, vajuta Enter" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={addSkill} type="button" className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Lisa</button>
                </div>
                {form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.skills.map(s => (
                      <span key={s} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                        {s} <button onClick={() => removeSkill(s)} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Saadavuse märkmed</label>
                <textarea value={form.availability_notes} onChange={e => setForm(p => ({ ...p, availability_notes: e.target.value }))} rows={2} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Tühista</button>
              <button onClick={save} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">Salvesta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
