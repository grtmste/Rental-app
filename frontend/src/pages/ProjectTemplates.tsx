import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface TemplateListItem {
  id: number
  name: string
  description: string | null
  stage_count: number
  item_count: number
}

interface EquipmentOption {
  id: number
  name: string
  category_name: string | null
}

interface TemplateItem {
  equipment_id: number
  quantity: number
  equipment_name?: string
}

interface TemplateStage {
  name: string
  sort_order: number
  items: TemplateItem[]
}

const EMPTY_STAGE: TemplateStage = { name: '', sort_order: 0, items: [] }

export default function ProjectTemplates() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [allEquipment, setAllEquipment] = useState<EquipmentOption[]>([])

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stages, setStages] = useState<TemplateStage[]>([{ ...EMPTY_STAGE }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTemplates()
    api.get('/equipment').then(r => setAllEquipment(r.data || [])).catch(() => {})
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await api.get('/project-templates')
      setTemplates(res.data || [])
    } catch {
      toast.error('Mallide laadimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setName('')
    setDescription('')
    setStages([{ ...EMPTY_STAGE, items: [] }])
    setShowModal(true)
  }

  async function openEdit(id: number) {
    try {
      const res = await api.get(`/project-templates/${id}`)
      const t = res.data
      setEditingId(id)
      setName(t.name)
      setDescription(t.description || '')
      setStages((t.stages || []).map((s: any) => ({
        name: s.name,
        sort_order: s.sort_order || 0,
        items: (s.items || []).map((i: any) => ({
          equipment_id: i.equipment_id,
          quantity: i.quantity,
          equipment_name: i.equipment_name,
        })),
      })))
      setShowModal(true)
    } catch {
      toast.error('Malli laadimine ebaõnnestus')
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Kustuta see mall?')) return
    try {
      await api.delete(`/project-templates/${id}`)
      toast.success('Mall kustutatud')
      fetchTemplates()
    } catch {
      toast.error('Malli kustutamine ebaõnnestus')
    }
  }

  function addStage() {
    setStages(prev => [...prev, { ...EMPTY_STAGE, sort_order: prev.length, items: [] }])
  }
  function removeStage(idx: number) {
    setStages(prev => prev.filter((_, i) => i !== idx))
  }
  function updateStageName(idx: number, value: string) {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, name: value } : s))
  }
  function addItemToStage(stageIdx: number) {
    setStages(prev => prev.map((s, i) => i === stageIdx
      ? { ...s, items: [...s.items, { equipment_id: allEquipment[0]?.id || 0, quantity: 1 }] }
      : s))
  }
  function updateItem(stageIdx: number, itemIdx: number, field: 'equipment_id' | 'quantity', value: number) {
    setStages(prev => prev.map((s, i) => i === stageIdx
      ? { ...s, items: s.items.map((it, j) => j === itemIdx ? { ...it, [field]: value } : it) }
      : s))
  }
  function removeItem(stageIdx: number, itemIdx: number) {
    setStages(prev => prev.map((s, i) => i === stageIdx
      ? { ...s, items: s.items.filter((_, j) => j !== itemIdx) }
      : s))
  }

  async function save() {
    if (!name.trim()) { toast.error('Malli nimi on kohustuslik'); return }
    setSaving(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      stages: stages
        .filter(s => s.name.trim())
        .map((s, idx) => ({
          name: s.name.trim(),
          sort_order: idx,
          items: s.items.filter(it => it.equipment_id).map(it => ({ equipment_id: it.equipment_id, quantity: it.quantity || 1 })),
        })),
    }
    try {
      if (editingId) {
        await api.put(`/project-templates/${editingId}`, payload)
        toast.success('Mall salvestatud')
      } else {
        await api.post('/project-templates', payload)
        toast.success('Mall loodud')
      }
      setShowModal(false)
      fetchTemplates()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Malli salvestamine ebaõnnestus')
    } finally {
      setSaving(false)
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mallid</h1>
          <p className="text-sm text-gray-500">{templates.length} malli kokku</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
          + Loo mall
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p>Malle pole veel loodud</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
              <h3 className="font-semibold text-gray-900 text-base">{t.name}</h3>
              {t.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>}
              <div className="text-xs text-gray-400 mt-3">{t.stage_count} etappi · {t.item_count} seadet</div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(t.id)} className="text-sm text-primary hover:underline">Muuda</button>
                <button onClick={() => remove(t.id)} className="text-sm text-red-500 hover:underline">Kustuta</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Muuda malli' : 'Loo mall'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Malli nimi *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="nt. Standard kontserdi seadistus" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kirjeldus</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Etapid</h3>
                  <button onClick={addStage} className="text-sm text-primary hover:underline">+ Lisa etapp</button>
                </div>
                {stages.map((stage, sIdx) => (
                  <div key={sIdx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={stage.name}
                        onChange={e => updateStageName(sIdx, e.target.value)}
                        placeholder="Etapi nimi (nt. Lava A)"
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button onClick={() => removeStage(sIdx)} className="text-red-500 hover:text-red-700 text-xs">Eemalda</button>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {stage.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2">
                          <select
                            value={item.equipment_id}
                            onChange={e => updateItem(sIdx, iIdx, 'equipment_id', Number(e.target.value))}
                            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none"
                          >
                            {allEquipment.map(eq => (
                              <option key={eq.id} value={eq.id}>{eq.name}{eq.category_name ? ` — ${eq.category_name}` : ''}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(sIdx, iIdx, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none"
                          />
                          <button onClick={() => removeItem(sIdx, iIdx)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                        </div>
                      ))}
                      <button onClick={() => addItemToStage(sIdx)} disabled={allEquipment.length === 0} className="text-xs text-primary hover:underline disabled:opacity-50">+ Lisa seade</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Tühista</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60">
                {saving ? 'Salvestamine...' : 'Salvesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
