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
      const [pRes, eRes, cRes, tRes, sRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/equipment`),
        api.get(`/projects/${id}/crew`),
        api.get(`/projects/${id}/tasks`),
        api.get(`/projects/${id}/stages`),
      ])
      setProject(pRes.data)
      setBudgetVal(pRes.data.budget || '0')
      setEquipment(eRes.data)
      setCrew(cRes.data)
      setTasks(tRes.data)
      setStages(sRes.data)
    } catch {
      toast.error('Projekti laadimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
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

  async function addEquipment(eqId: number) {
    const qty = eqQty[eqId] || 1
    try {
      const res = await api.post(`/projects/${id}/equipment`, {
        equipment_id: eqId,
        quantity: qty,
        stage_id: selectedStageId || null,
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

          {/* Stage selector */}
          {stages.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vali lava (valikuline)</label>
              <select
                value={selectedStageId}
                onChange={e => setSelectedStageId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Vali lava</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

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
