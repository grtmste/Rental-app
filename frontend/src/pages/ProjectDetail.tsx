import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Project {
  id: number
  name: string
  client_id: number
  client_name: string
  client_email: string
  start_date: string
  end_date: string
  status: string
  budget: number
  description: string
}

interface ProjectEquipment {
  id: number
  equipment_id: number
  equipment_name: string
  category_name: string | null
  stage_id: number | null
  stage_name: string | null
  quantity: number
  daily_rate: number
  total_quantity: number
  total_reserved: number
  is_overbooked: boolean
  location: string | null
}

interface Stage {
  id: number
  name: string
  sort_order: number
}

interface CrewMember {
  id: number
  crew_member_id: number
  crew_name: string
  role: string
  hours: number
  rate_per_hour: number
}

interface Task {
  id: number
  title: string
  description: string
  status: string
  due_date: string
}

interface Equipment {
  id: number
  name: string
  category_name: string | null
  daily_rate: number
  total_quantity: number
  available_quantity: number
}

interface CrewOption {
  id: number
  name: string
  role: string
  hourly_rate: number
  skills: string[]
}

// ─── Label Maps ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Mustand',
  confirmed: 'Kinnitatud',
  in_progress: 'Töös',
  completed: 'Lõpetatud',
}

const NEXT_STATUS: Record<string, string> = {
  draft: 'confirmed',
  confirmed: 'in_progress',
  in_progress: 'completed',
}

const TAB_LABELS: Record<string, string> = {
  overview: 'Ülevaade',
  equipment: 'Seadmed',
  crew: 'Meeskond',
  tasks: 'Ülesanded',
}

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'Teha',
  in_progress: 'Töös',
  done: 'Valmis',
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Core data
  const [tab, setTab] = useState('overview')
  const [project, setProject] = useState<Project | null>(null)
  const [equipment, setEquipment] = useState<ProjectEquipment[]>([])
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  // Equipment catalog / picker
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([])
  const [eqSearch, setEqSearch] = useState('')
  const [eqCategoryFilter, setEqCategoryFilter] = useState('')
  const [eqQty, setEqQty] = useState<Record<number, number>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [selectedStageId, setSelectedStageId] = useState<number | ''>('')

  // Inline equipment editing
  const [editingEqId, setEditingEqId] = useState<number | null>(null)
  const [editingEqQty, setEditingEqQty] = useState(1)

  // Stage management
  const [newStageName, setNewStageName] = useState('')
  const [addingStage, setAddingStage] = useState(false)

  // Crew
  const [allCrew, setAllCrew] = useState<CrewOption[]>([])
  const [showCrewModal, setShowCrewModal] = useState(false)
  const [editingCrewId, setEditingCrewId] = useState<number | null>(null)
  const [editingCrewHours, setEditingCrewHours] = useState(0)

  // Tasks
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', due_date: '' })
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)

  // Budget
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetVal, setBudgetVal] = useState('')

  // ─── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => { fetchAll() }, [id])

  useEffect(() => {
    if (tab === 'equipment') {
      fetchEquipmentOptions()
      fetchStages()
    }
    if (tab === 'crew') fetchCrewOptions()
  }, [tab])

  async function fetchAll() {
    setLoading(true)
    try {
      const pRes = await api.get(`/projects/${id}`)
      setProject(pRes.data)
      setBudgetVal(pRes.data.budget || '0')
    } catch {
      toast.error('Projekti laadimine ebaõnnestus')
      setLoading(false)
      return
    }

    const [eRes, cRes, tRes, sRes] = await Promise.allSettled([
      api.get(`/projects/${id}/equipment`),
      api.get(`/projects/${id}/crew`),
      api.get(`/projects/${id}/tasks`),
      api.get(`/projects/${id}/stages`),
    ])
    if (eRes.status === 'fulfilled') setEquipment(eRes.value.data)
    if (cRes.status === 'fulfilled') setCrew(cRes.value.data)
    if (tRes.status === 'fulfilled') setTasks(tRes.value.data)
    if (sRes.status === 'fulfilled') setStages(sRes.value.data)

    setLoading(false)
  }

  async function fetchStages() {
    try {
      const res = await api.get(`/projects/${id}/stages`)
      setStages(res.data)
    } catch {}
  }

  async function fetchEquipmentOptions() {
    try {
      const eRes = await api.get('/equipment')
      setAllEquipment(eRes.data)
      const cats = [...new Set(
        eRes.data.map((e: Equipment) => e.category_name).filter(Boolean)
      )] as string[]
      setCategories(cats)
    } catch {}
  }

  async function fetchCrewOptions() {
    try {
      const res = await api.get('/crew')
      setAllCrew(res.data)
    } catch {}
  }

  // ─── Stage actions ────────────────────────────────────────────────────────────

  async function addStage() {
    if (!newStageName.trim()) return
    setAddingStage(true)
    try {
      await api.post(`/projects/${id}/stages`, { name: newStageName.trim() })
      toast.success('Lava lisatud')
      setNewStageName('')
      fetchStages()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lava lisamine ebaõnnestus')
    } finally {
      setAddingStage(false)
    }
  }

  async function removeStage(stageId: number) {
    if (!confirm('Eemalda see lava? Sellele määratud seadmed jäävad projekti ilma lavata.')) return
    try {
      await api.delete(`/projects/${id}/stages/${stageId}`)
      toast.success('Lava eemaldatud')
      fetchAll()
    } catch {
      toast.error('Lava eemaldamine ebaõnnestus')
    }
  }

  // ─── Equipment actions ────────────────────────────────────────────────────────

  async function updateEquipmentStage(itemId: number, newStageId: number | null) {
    try {
      await api.put(`/projects/${id}/equipment/${itemId}`, { stage_id: newStageId })
      fetchAll()
    } catch {
      toast.error('Lava muutmine ebaõnnestus')
    }
  }

  async function addEquipment(eqId: number) {
    const qty = eqQty[eqId] || 1
    try {
      const res = await api.post(`/projects/${id}/equipment`, {
        equipment_id: eqId,
        quantity: qty,
        stage_id: null,
      })
      if (res.data.overbooked) {
        toast('Seade lisatud — kogus ületab laovaru (üle broneeritud)', { icon: '⚠️' })
      } else {
        toast.success('Seade lisatud')
      }
      fetchAll()
      fetchEquipmentOptions()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Seadme lisamine ebaõnnestus')
    }
  }

  async function updateEquipmentQty(itemId: number, qty: number) {
    try {
      await api.put(`/projects/${id}/equipment/${itemId}`, { quantity: qty })
      toast.success('Kogus uuendatud')
      setEditingEqId(null)
      fetchAll()
      fetchEquipmentOptions()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Koguse uuendamine ebaõnnestus')
    }
  }

  async function removeEquipment(itemId: number) {
    if (!confirm('Eemalda see seade projektist?')) return
    try {
      await api.delete(`/projects/${id}/equipment/${itemId}`)
      toast.success('Seade eemaldatud')
      fetchAll()
      fetchEquipmentOptions()
    } catch {
      toast.error('Seadme eemaldamine ebaõnnestus')
    }
  }

  // ─── Crew actions ─────────────────────────────────────────────────────────────

  async function addCrew(crewId: number) {
    const member = allCrew.find(c => c.id === crewId)
    try {
      await api.post(`/projects/${id}/crew`, {
        crew_member_id: crewId,
        role: member?.role || '',
        hours: 0,
        rate_per_hour: member?.hourly_rate || 0,
      })
      toast.success('Meeskonnaliige lisatud')
      setShowCrewModal(false)
      fetchAll()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Meeskonnaliikme lisamine ebaõnnestus')
    }
  }

  async function removeCrew(memberId: number) {
    if (!confirm('Eemalda see meeskonnaliige projektist?')) return
    try {
      await api.delete(`/projects/${id}/crew/${memberId}`)
      toast.success('Meeskonnaliige eemaldatud')
      fetchAll()
    } catch {
      toast.error('Meeskonnaliikme eemaldamine ebaõnnestus')
    }
  }

  async function updateCrewHours(memberId: number, hours: number) {
    try {
      await api.put(`/projects/${id}/crew/${memberId}`, { hours })
      toast.success('Tunnid uuendatud')
      setEditingCrewId(null)
      fetchAll()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Tundide uuendamine ebaõnnestus')
    }
  }

  // ─── Task actions ─────────────────────────────────────────────────────────────

  async function saveTask() {
    try {
      if (editingTaskId) {
        await api.put(`/projects/${id}/tasks/${editingTaskId}`, taskForm)
        toast.success('Ülesanne uuendatud')
      } else {
        await api.post(`/projects/${id}/tasks`, taskForm)
        toast.success('Ülesanne loodud')
      }
      setShowTaskModal(false)
      setTaskForm({ title: '', description: '', status: 'todo', due_date: '' })
      setEditingTaskId(null)
      fetchAll()
    } catch {
      toast.error('Ülesande salvestamine ebaõnnestus')
    }
  }

  async function deleteTask(taskId: number) {
    if (!confirm('Kustuta see ülesanne?')) return
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`)
      toast.success('Ülesanne kustutatud')
      fetchAll()
    } catch {
      toast.error('Ülesande kustutamine ebaõnnestus')
    }
  }

  // ─── Project actions ──────────────────────────────────────────────────────────

  async function updateStatus(newStatus: string) {
    try {
      await api.put(`/projects/${id}`, { ...project, status: newStatus })
      toast.success('Staatus uuendatud')
      fetchAll()
    } catch {
      toast.error('Staatuse uuendamine ebaõnnestus')
    }
  }

  async function saveBudget() {
    try {
      await api.put(`/projects/${id}`, { ...project, budget: parseFloat(budgetVal) })
      toast.success('Eelarve uuendatud')
      setEditingBudget(false)
      fetchAll()
    } catch {
      toast.error('Eelarve uuendamine ebaõnnestus')
    }
  }

  function createQuote() {
    navigate(`/app/quotes/new?project_id=${id}`)
  }

  // ─── Derived data ─────────────────────────────────────────────────────────────

  const filteredEquipment = allEquipment.filter(e => {
    const matchSearch = !eqSearch || e.name.toLowerCase().includes(eqSearch.toLowerCase()) || (e.category_name || '').toLowerCase().includes(eqSearch.toLowerCase())
    const matchCat = !eqCategoryFilter || e.category_name === eqCategoryFilter
    return matchSearch && matchCat
  })

  const assignedIds = new Set(equipment.map(e => e.equipment_id))

  // Group assigned equipment: stage → category → items
  const stageGroups: Record<string, Record<string, ProjectEquipment[]>> = {}
  equipment.forEach(item => {
    const stage = item.stage_name || 'Määramata lava'
    const cat = item.category_name || 'Kategooriata'
    if (!stageGroups[stage]) stageGroups[stage] = {}
    if (!stageGroups[stage][cat]) stageGroups[stage][cat] = []
    stageGroups[stage][cat].push(item)
  })

  // ─── Guards ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  )
  if (!project) return <div className="p-8 text-gray-500">Projekti ei leitud</div>

  // ─── Part B: Stage Manager render helper ─────────────────────────────────────

  function renderStageManager() {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Lavade haldus</h4>

        {stages.length === 0 ? (
          <p className="text-sm text-gray-400 mb-3">Lavad puuduvad. Lisa esimene lava.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {stages.map(s => (
              <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm">
                <span className="text-blue-800 font-medium">{s.name}</span>
                <button
                  onClick={() => removeStage(s.id)}
                  className="text-blue-400 hover:text-red-500 transition-colors ml-1 text-xs font-bold leading-none"
                  title="Eemalda lava"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Uue lava nimi"
            value={newStageName}
            onChange={e => setNewStageName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStage()}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={addStage}
            disabled={addingStage || !newStageName.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {addingStage ? 'Lisamine...' : 'Lisa lava'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Part C: Equipment Assigner render helper ─────────────────────────────────

  function renderEquipmentAssigner() {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 font-semibold text-gray-900">
          Lisa seadmeid laost
        </div>
        <div className="p-4 space-y-3">
          {/* Search + category filter */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Otsi nime või kategooria järgi..."
              value={eqSearch}
              onChange={e => setEqSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={eqCategoryFilter}
              onChange={e => setEqCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Kõik kategooriad</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Equipment list */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100">
            {filteredEquipment.map(eq => {
              const isAssigned = assignedIds.has(eq.id)
              const qty = eqQty[eq.id] || 1
              const wouldOverbook = qty > eq.available_quantity
              const outOfStock = eq.available_quantity <= 0 && !wouldOverbook
              const lowStock = !wouldOverbook && !outOfStock && eq.available_quantity / eq.total_quantity <= 0.2

              return (
                <div key={eq.id} className={`px-4 py-3 ${wouldOverbook ? 'bg-yellow-50' : outOfStock ? 'bg-red-50' : lowStock ? 'bg-yellow-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{eq.name}</span>
                        {eq.category_name && (
                          <span className="text-xs text-gray-400">— {eq.category_name}</span>
                        )}
                        {wouldOverbook && (
                          <span className="text-xs text-orange-600 font-medium">⚠ Üle broneeritud</span>
                        )}
                        {!wouldOverbook && outOfStock && (
                          <span className="text-xs text-red-600">🚫 Laos otsas</span>
                        )}
                        {!wouldOverbook && lowStock && (
                          <span className="text-xs text-yellow-600">⚠ Vähe laos</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Saadaval: {eq.available_quantity}/{eq.total_quantity} · €{Number(eq.daily_rate).toFixed(2)}/päev
                      </div>
                      {wouldOverbook && (
                        <p className="text-xs text-orange-600 mt-1">
                          Hoiatus: kogus ületab laovaru. Seade märgitakse üle broneerituks.
                        </p>
                      )}
                    </div>

                    {/* Quantity input */}
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-400">Kogus</label>
                      <input
                        type="number"
                        min="1"
                        value={eqQty[eq.id] || 1}
                        onChange={e => setEqQty(prev => ({ ...prev, [eq.id]: Number(e.target.value) }))}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => addEquipment(eq.id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                        isAssigned
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : wouldOverbook
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-primary text-white hover:bg-primary-dark'
                      }`}
                    >
                      {isAssigned ? 'Uuenda' : 'Lisa seade'}
                    </button>
                  </div>
                </div>
              )
            })}
            {filteredEquipment.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">Seadmeid ei leitud</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Part D: Assigned Equipment List render helper ────────────────────────────

  function renderAssignedEquipment() {
    const stageKeys = Object.keys(stageGroups).sort((a, b) => {
      if (a === 'Määramata lava') return 1
      if (b === 'Määramata lava') return -1
      return a.localeCompare(b)
    })

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 font-semibold text-gray-900">
          Määratud seadmed ({equipment.length})
        </div>
        {equipment.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Seadmeid pole lisatud.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stageKeys.map(stageName => (
              <StageSection
                key={stageName}
                stageName={stageName}
                categoryGroups={stageGroups[stageName]}
                stages={stages}
                onRemove={removeEquipment}
                onEditQty={(item) => { setEditingEqId(item.id); setEditingEqQty(item.quantity) }}
                onChangeStage={updateEquipmentStage}
                editingEqId={editingEqId}
                editingEqQty={editingEqQty}
                setEditingEqQty={setEditingEqQty}
                onSaveQty={updateEquipmentQty}
                onCancelEdit={() => setEditingEqId(null)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Return ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/app/projects" className="hover:text-primary">Projektid</Link>
            <span>/</span>
            <span>{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-700'}`}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
            {project.client_name && <span className="text-sm text-gray-500">{project.client_name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={createQuote} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
            + Loo pakkumine
          </button>
          {NEXT_STATUS[project.status] && (
            <button onClick={() => updateStatus(NEXT_STATUS[project.status])} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
              Liigu: {STATUS_LABELS[NEXT_STATUS[project.status]]}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        {['overview', 'equipment', 'crew', 'tasks'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Projekti andmed</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Klient</span><p className="font-medium">{project.client_name || '—'}</p></div>
              <div><span className="text-gray-500">Staatus</span><p className="font-medium">{STATUS_LABELS[project.status] || project.status}</p></div>
              <div><span className="text-gray-500">Alguskuupäev</span><p className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString('et-EE') : '—'}</p></div>
              <div><span className="text-gray-500">Lõppkuupäev</span><p className="font-medium">{project.end_date ? new Date(project.end_date).toLocaleDateString('et-EE') : '—'}</p></div>
            </div>
            {project.description && <div className="text-sm"><span className="text-gray-500">Kirjeldus</span><p className="mt-1">{project.description}</p></div>}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Eelarve</h3>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">€</span>
                <input type="number" value={budgetVal} onChange={e => setBudgetVal(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={saveBudget} className="px-3 py-2 bg-primary text-white rounded text-sm">Salvesta</button>
                <button onClick={() => setEditingBudget(false)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm">Tühista</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">€{Number(project.budget || 0).toLocaleString('et-EE', { minimumFractionDigits: 2 })}</span>
                <button onClick={() => setEditingBudget(true)} className="text-sm text-primary hover:underline">Muuda</button>
              </div>
            )}
          </div>
        </div>

        <EquipmentSummary equipment={equipment} />
        </>
      )}

      {/* Equipment tab */}
      {tab === 'equipment' && (
        <div className="space-y-4">
          {renderStageManager()}
          {renderAssignedEquipment()}
          {renderEquipmentAssigner()}
        </div>
      )}

      {/* Crew tab */}
      {tab === 'crew' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { fetchCrewOptions(); setShowCrewModal(true) }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
              + Lisa meeskonnaliige
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200">
            {crew.length === 0 ? (
              <div className="p-6 text-center text-gray-400">Meeskonda pole veel määratud</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Nimi</th>
                    <th className="px-4 py-3 text-left">Roll</th>
                    <th className="px-4 py-3 text-right">Tunnid</th>
                    <th className="px-4 py-3 text-right">Tasu/t</th>
                    <th className="px-4 py-3 text-right">Toimingud</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {crew.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{m.crew_name}</td>
                      <td className="px-4 py-3 text-gray-500">{m.role}</td>
                      <td className="px-4 py-3 text-right">
                        {editingCrewId === m.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input type="number" min="0" value={editingCrewHours} onChange={e => setEditingCrewHours(Number(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center" />
                            <button onClick={() => updateCrewHours(m.id, editingCrewHours)} className="text-xs text-green-600 hover:underline">✓</button>
                            <button onClick={() => setEditingCrewId(null)} className="text-xs text-gray-400 hover:underline">✕</button>
                          </div>
                        ) : (
                          <span className="cursor-pointer hover:text-primary" onClick={() => { setEditingCrewId(m.id); setEditingCrewHours(m.hours || 0) }}>{m.hours || 0}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">€{Number(m.rate_per_hour || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeCrew(m.id)} className="text-red-500 hover:text-red-700 text-xs">Eemalda</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tasks tab */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setTaskForm({ title: '', description: '', status: 'todo', due_date: '' }); setEditingTaskId(null); setShowTaskModal(true) }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
              + Lisa ülesanne
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['todo', 'in_progress', 'done'].map(status => (
              <div key={status} className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">{TASK_STATUS_LABELS[status]}</h4>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === status).map(task => (
                    <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.description && <div className="text-xs text-gray-500 mt-1">{task.description}</div>}
                      {task.due_date && <div className="text-xs text-gray-400 mt-1">Tähtaeg: {new Date(task.due_date).toLocaleDateString('et-EE')}</div>}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => { setTaskForm({ title: task.title, description: task.description, status: task.status, due_date: task.due_date || '' }); setEditingTaskId(task.id); setShowTaskModal(true) }} className="text-xs text-primary hover:underline">Muuda</button>
                        <button onClick={() => deleteTask(task.id)} className="text-xs text-red-500 hover:underline">Kustuta</button>
                      </div>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === status).length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-3">Ülesandeid pole</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crew modal */}
      {showCrewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Lisa meeskonnaliige</h3>
              <button onClick={() => setShowCrewModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto divide-y divide-gray-100">
              {allCrew.filter(c => !crew.find(p => p.crew_member_id === c.id)).map(c => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.role} · €{Number(c.hourly_rate || 0).toFixed(2)}/t</div>
                    {c.skills?.length > 0 && <div className="flex gap-1 mt-1">{c.skills.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>)}</div>}
                  </div>
                  <button onClick={() => addCrew(c.id)} className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark">Lisa</button>
                </div>
              ))}
              {allCrew.filter(c => !crew.find(p => p.crew_member_id === c.id)).length === 0 && (
                <div className="py-6 text-center text-gray-400 text-sm">Kõik meeskonnaliikmed on juba määratud</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{editingTaskId ? 'Muuda ülesannet' : 'Lisa ülesanne'}</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Pealkiri</label>
                <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Kirjeldus</label>
                <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Staatus</label>
                  <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="todo">Teha</option>
                    <option value="in_progress">Töös</option>
                    <option value="done">Valmis</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tähtaeg</label>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Tühista</button>
              <button onClick={saveTask} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">Salvesta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EquipmentSummary sub-component ──────────────────────────────────────────

function EquipmentSummary({ equipment }: { equipment: ProjectEquipment[] }) {
  const totalQty = equipment.reduce((sum, e) => sum + e.quantity, 0)
  const overbookedCount = equipment.filter(e => e.is_overbooked).length
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Seadmete kokkuvõte</h3>
      {equipment.length === 0 ? (
        <p className="text-sm text-gray-400">Seadmeid pole lisatud</p>
      ) : (
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-gray-500">Unikaalseid seadmeid</span>
            <p className="font-semibold text-gray-900 text-lg">{equipment.length} seadet</p>
          </div>
          <div>
            <span className="text-gray-500">Kogus kokku</span>
            <p className="font-semibold text-gray-900 text-lg">Kokku: {totalQty} tk</p>
          </div>
          {overbookedCount > 0 && (
            <div>
              <span className="text-gray-500">Ülebroneeringud</span>
              <p className="font-semibold text-red-600 text-lg">Üle broneeritud: {overbookedCount}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── StageSection sub-component ───────────────────────────────────────────────

interface StageSectionProps {
  stageName: string
  categoryGroups: Record<string, ProjectEquipment[]>
  stages: Stage[]
  onRemove: (id: number) => void
  onEditQty: (item: ProjectEquipment) => void
  onChangeStage: (itemId: number, stageId: number | null) => void
  editingEqId: number | null
  editingEqQty: number
  setEditingEqQty: (v: number) => void
  onSaveQty: (id: number, qty: number) => void
  onCancelEdit: () => void
}

function StageSection({ stageName, categoryGroups, stages, onRemove, onEditQty, onChangeStage, editingEqId, editingEqQty, setEditingEqQty, onSaveQty, onCancelEdit }: StageSectionProps) {
  const [open, setOpen] = useState(true)
  const catKeys = Object.keys(categoryGroups).sort()

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="font-semibold text-gray-800 text-sm">{stageName}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div>
          {catKeys.map(catName => (
            <div key={catName}>
              <div className="px-6 py-2 bg-white border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{catName}</span>
              </div>
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '9%' }} />
                </colgroup>
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-2 text-left font-medium">Seade</th>
                    <th className="px-4 py-2 text-center font-medium">Kogus</th>
                    <th className="px-4 py-2 text-right font-medium">Hind/päev</th>
                    <th className="px-4 py-2 text-center font-medium">Staatus</th>
                    <th className="px-4 py-2 text-center font-medium">Lava</th>
                    <th className="px-4 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {categoryGroups[catName].map(item => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${item.is_overbooked ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                      <td className="px-6 py-3 font-medium truncate">{item.equipment_name}</td>
                      <td className="px-4 py-3 text-center">
                        {editingEqId === item.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min="1" value={editingEqQty} onChange={e => setEditingEqQty(Number(e.target.value))} className="w-14 border border-gray-300 rounded px-1 py-1 text-sm text-center" />
                            <button onClick={() => onSaveQty(item.id, editingEqQty)} className="text-xs text-green-600 hover:underline">✓</button>
                            <button onClick={onCancelEdit} className="text-xs text-gray-400 hover:underline">✕</button>
                          </div>
                        ) : (
                          <span className="cursor-pointer hover:text-primary" onClick={() => onEditQty(item)}>{item.quantity}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">€{Number(item.daily_rate || 0).toFixed(2)}/päev</td>
                      <td className="px-4 py-3 text-center">
                        {item.is_overbooked ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium whitespace-nowrap">Üle broneeritud</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Saadaval</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.stage_id ?? ''}
                          onChange={e => onChangeStage(item.id, e.target.value ? Number(e.target.value) : null)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-700"
                        >
                          <option value="">— Lava —</option>
                          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => onRemove(item.id)} className="text-red-500 hover:text-red-700 text-xs">Eemalda</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
