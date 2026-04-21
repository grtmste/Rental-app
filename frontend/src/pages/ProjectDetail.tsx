import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'

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
  name: string
  category_name: string
  quantity: number
  daily_rate: number
  total_quantity: number
  available_quantity: number
}
interface CrewMember {
  id: number
  crew_member_id: number
  name: string
  role: string
  hours: number
  rate_per_hour: number
  skills: string[]
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
  category_name: string
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

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
}

const NEXT_STATUS: Record<string, string> = {
  draft: 'confirmed',
  confirmed: 'in_progress',
  in_progress: 'completed',
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [project, setProject] = useState<Project | null>(null)
  const [equipment, setEquipment] = useState<ProjectEquipment[]>([])
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Equipment picker state
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([])
  const [eqSearch, setEqSearch] = useState('')
  const [eqCategoryFilter, setEqCategoryFilter] = useState('')
  const [eqQty, setEqQty] = useState<Record<number, number>>({})
  const [categories, setCategories] = useState<string[]>([])

  // Crew picker state
  const [allCrew, setAllCrew] = useState<CrewOption[]>([])
  const [showCrewModal, setShowCrewModal] = useState(false)

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', due_date: '' })
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)

  // Budget edit
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetVal, setBudgetVal] = useState('')

  // Qty edit for assigned equipment
  const [editingEqId, setEditingEqId] = useState<number | null>(null)
  const [editingEqQty, setEditingEqQty] = useState(1)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    try {
      const [pRes, eRes, cRes, tRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/equipment`),
        api.get(`/projects/${id}/crew`),
        api.get(`/projects/${id}/tasks`),
      ])
      setProject(pRes.data)
      setBudgetVal(pRes.data.budget || '0')
      setEquipment(eRes.data)
      setCrew(cRes.data)
      setTasks(tRes.data)
    } catch {
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  async function fetchEquipmentOptions() {
    try {
      const [eRes, catRes] = await Promise.all([api.get('/equipment'), api.get('/categories')])
      setAllEquipment(eRes.data)
      const cats = [...new Set(eRes.data.map((e: Equipment) => e.category_name).filter(Boolean))] as string[]
      setCategories(cats)
    } catch {}
  }

  async function fetchCrewOptions() {
    try {
      const res = await api.get('/crew')
      setAllCrew(res.data)
    } catch {}
  }

  useEffect(() => {
    if (tab === 'equipment') fetchEquipmentOptions()
    if (tab === 'crew') fetchCrewOptions()
  }, [tab])

  async function addEquipment(eqId: number) {
    const qty = eqQty[eqId] || 1
    try {
      await api.post(`/projects/${id}/equipment`, { equipment_id: eqId, quantity: qty })
      toast.success('Equipment added')
      fetchAll()
      fetchEquipmentOptions()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add equipment')
    }
  }

  async function updateEquipmentQty(itemId: number, qty: number) {
    try {
      await api.put(`/projects/${id}/equipment/${itemId}`, { quantity: qty })
      toast.success('Quantity updated')
      setEditingEqId(null)
      fetchAll()
      fetchEquipmentOptions()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update quantity')
    }
  }

  async function removeEquipment(itemId: number) {
    if (!confirm('Remove this equipment from the project?')) return
    try {
      await api.delete(`/projects/${id}/equipment/${itemId}`)
      toast.success('Equipment removed')
      fetchAll()
      fetchEquipmentOptions()
    } catch {
      toast.error('Failed to remove equipment')
    }
  }

  async function addCrew(crewId: number) {
    const member = allCrew.find(c => c.id === crewId)
    try {
      await api.post(`/projects/${id}/crew`, {
        crew_member_id: crewId,
        role: member?.role || '',
        hours: 0,
        rate_per_hour: member?.hourly_rate || 0,
      })
      toast.success('Crew member added')
      setShowCrewModal(false)
      fetchAll()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add crew')
    }
  }

  async function removeCrew(memberId: number) {
    if (!confirm('Remove this crew member?')) return
    try {
      await api.delete(`/projects/${id}/crew/${memberId}`)
      toast.success('Crew member removed')
      fetchAll()
    } catch {
      toast.error('Failed to remove crew')
    }
  }

  async function saveTask() {
    try {
      if (editingTaskId) {
        await api.put(`/projects/${id}/tasks/${editingTaskId}`, taskForm)
        toast.success('Task updated')
      } else {
        await api.post(`/projects/${id}/tasks`, taskForm)
        toast.success('Task created')
      }
      setShowTaskModal(false)
      setTaskForm({ title: '', description: '', status: 'todo', due_date: '' })
      setEditingTaskId(null)
      fetchAll()
    } catch {
      toast.error('Failed to save task')
    }
  }

  async function deleteTask(taskId: number) {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`)
      toast.success('Task deleted')
      fetchAll()
    } catch {
      toast.error('Failed to delete task')
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      await api.put(`/projects/${id}`, { ...project, status: newStatus })
      toast.success('Status updated')
      fetchAll()
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function saveBudget() {
    try {
      await api.put(`/projects/${id}`, { ...project, budget: parseFloat(budgetVal) })
      toast.success('Budget updated')
      setEditingBudget(false)
      fetchAll()
    } catch {
      toast.error('Failed to update budget')
    }
  }

  function createQuote() {
    navigate(`/app/quotes/new?project_id=${id}`)
  }

  const filteredEquipment = allEquipment.filter(e => {
    const matchSearch = !eqSearch || e.name.toLowerCase().includes(eqSearch.toLowerCase()) || (e.category_name || '').toLowerCase().includes(eqSearch.toLowerCase())
    const matchCat = !eqCategoryFilter || e.category_name === eqCategoryFilter
    return matchSearch && matchCat
  })

  const assignedIds = new Set(equipment.map(e => e.equipment_id))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
  if (!project) return <div className="p-8 text-gray-500">Project not found</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/app/projects" className="hover:text-primary">Projects</Link>
            <span>/</span>
            <span>{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
              {project.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">{project.client_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={createQuote} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
            + Create Quote
          </button>
          {NEXT_STATUS[project.status] && (
            <button onClick={() => updateStatus(NEXT_STATUS[project.status])} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
              Move to {NEXT_STATUS[project.status].replace('_', ' ')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        {['overview', 'equipment', 'crew', 'tasks'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Project Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Client</span><p className="font-medium">{project.client_name}</p></div>
              <div><span className="text-gray-500">Status</span><p className="font-medium capitalize">{project.status.replace('_', ' ')}</p></div>
              <div><span className="text-gray-500">Start Date</span><p className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString('et-EE') : '—'}</p></div>
              <div><span className="text-gray-500">End Date</span><p className="font-medium">{project.end_date ? new Date(project.end_date).toLocaleDateString('et-EE') : '—'}</p></div>
            </div>
            {project.description && <div className="text-sm"><span className="text-gray-500">Description</span><p className="mt-1">{project.description}</p></div>}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Budget</h3>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">€</span>
                <input type="number" value={budgetVal} onChange={e => setBudgetVal(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={saveBudget} className="px-3 py-2 bg-primary text-white rounded text-sm">Save</button>
                <button onClick={() => setEditingBudget(false)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">€{Number(project.budget || 0).toLocaleString('et-EE', { minimumFractionDigits: 2 })}</span>
                <button onClick={() => setEditingBudget(true)} className="text-sm text-primary hover:underline">Edit</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Equipment Tab */}
      {tab === 'equipment' && (
        <div className="space-y-6">
          {/* Assigned equipment */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 font-semibold text-gray-900">Assigned Equipment ({equipment.length})</div>
            {equipment.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No equipment assigned yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Daily Rate</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {equipment.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{(item as any).equipment_name || item.name}</td>
                      <td className="px-4 py-3 text-gray-500">{(item as any).category_name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {editingEqId === item.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min="1" value={editingEqQty} onChange={e => setEditingEqQty(Number(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center" />
                            <button onClick={() => updateEquipmentQty(item.id, editingEqQty)} className="text-xs text-green-600 hover:underline">✓</button>
                            <button onClick={() => setEditingEqId(null)} className="text-xs text-gray-400 hover:underline">✕</button>
                          </div>
                        ) : (
                          <span className="cursor-pointer hover:text-primary" onClick={() => { setEditingEqId(item.id); setEditingEqQty(item.quantity) }}>{item.quantity}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">€{Number(item.daily_rate || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeEquipment(item.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add equipment */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 font-semibold text-gray-900">Add Equipment from Inventory</div>
            <div className="p-4 space-y-3">
              <div className="flex gap-3">
                <input type="text" placeholder="Search by name or category..." value={eqSearch} onChange={e => setEqSearch(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <select value={eqCategoryFilter} onChange={e => setEqCategoryFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100">
                {filteredEquipment.map(eq => {
                  const isAssigned = assignedIds.has(eq.id)
                  const pct = eq.total_quantity > 0 ? (eq.available_quantity / eq.total_quantity) * 100 : 0
                  const outOfStock = eq.available_quantity <= 0
                  const lowStock = !outOfStock && pct <= 20
                  return (
                    <div key={eq.id} className={`flex items-center gap-3 px-4 py-3 ${outOfStock ? 'bg-red-50' : lowStock ? 'bg-yellow-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{eq.name}</span>
                          <span className="text-xs text-gray-400">{eq.category_name}</span>
                          {outOfStock && <span className="text-xs text-red-600">🚫 Out of stock</span>}
                          {lowStock && <span className="text-xs text-yellow-600">⚠️ Low stock ({eq.available_quantity} left)</span>}
                        </div>
                        <div className="text-xs text-gray-500">Available: {eq.available_quantity}/{eq.total_quantity} · €{Number(eq.daily_rate).toFixed(2)}/day</div>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={eq.available_quantity}
                        value={eqQty[eq.id] || 1}
                        onChange={e => setEqQty(prev => ({ ...prev, [eq.id]: Number(e.target.value) }))}
                        disabled={outOfStock}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center disabled:bg-gray-100"
                      />
                      <button
                        onClick={() => addEquipment(eq.id)}
                        disabled={outOfStock}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${isAssigned ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : outOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-dark'}`}
                      >
                        {isAssigned ? 'Update' : 'Add'}
                      </button>
                    </div>
                  )
                })}
                {filteredEquipment.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">No equipment found</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crew Tab */}
      {tab === 'crew' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { fetchCrewOptions(); setShowCrewModal(true) }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
              + Add Crew Member
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200">
            {crew.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No crew assigned yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                    <th className="px-4 py-3 text-right">Rate/hr</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {crew.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{(m as any).crew_name || m.name}</td>
                      <td className="px-4 py-3 text-gray-500">{m.role}</td>
                      <td className="px-4 py-3 text-right">{m.hours || 0}</td>
                      <td className="px-4 py-3 text-right">€{Number(m.rate_per_hour || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeCrew(m.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setTaskForm({ title: '', description: '', status: 'todo', due_date: '' }); setEditingTaskId(null); setShowTaskModal(true) }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
              + Add Task
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['todo', 'in_progress', 'done'].map(status => (
              <div key={status} className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-600 capitalize mb-3">{status.replace('_', ' ')}</h4>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === status).map(task => (
                    <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.description && <div className="text-xs text-gray-500 mt-1">{task.description}</div>}
                      {task.due_date && <div className="text-xs text-gray-400 mt-1">Due: {new Date(task.due_date).toLocaleDateString('et-EE')}</div>}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => { setTaskForm({ title: task.title, description: task.description, status: task.status, due_date: task.due_date || '' }); setEditingTaskId(task.id); setShowTaskModal(true) }} className="text-xs text-primary hover:underline">Edit</button>
                        <button onClick={() => deleteTask(task.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === status).length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-3">No tasks</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crew Modal */}
      {showCrewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Add Crew Member</h3>
              <button onClick={() => setShowCrewModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto divide-y divide-gray-100">
              {allCrew.filter(c => !crew.find(p => p.crew_member_id === c.id)).map(c => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.role} · €{Number(c.hourly_rate || 0).toFixed(2)}/hr</div>
                    {c.skills?.length > 0 && <div className="flex gap-1 mt-1">{c.skills.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>)}</div>}
                  </div>
                  <button onClick={() => addCrew(c.id)} className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark">Add</button>
                </div>
              ))}
              {allCrew.filter(c => !crew.find(p => p.crew_member_id === c.id)).length === 0 && (
                <div className="py-6 text-center text-gray-400 text-sm">All crew members assigned</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{editingTaskId ? 'Edit Task' : 'Add Task'}</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Due Date</label>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveTask} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
