import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface Category {
  id: number
  name: string
  equipment_count: number
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [reassignTo, setReassignTo] = useState<number | ''>('')

  useEffect(() => { fetchCategories() }, [])

  async function fetchCategories() {
    setLoading(true)
    try {
      const res = await api.get('/categories')
      setCategories(res.data)
    } catch {
      toast.error('Kategooriate laadimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }

  async function addCategory() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await api.post('/categories', { name: newName.trim() })
      toast.success('Kategooria lisatud')
      setNewName('')
      fetchCategories()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lisamine ebaõnnestus')
    } finally {
      setAdding(false)
    }
  }

  async function saveEdit(id: number) {
    if (!editingName.trim()) return
    try {
      await api.put(`/categories/${id}`, { name: editingName.trim() })
      toast.success('Kategooria uuendatud')
      setEditingId(null)
      fetchCategories()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Salvestamine ebaõnnestus')
    }
  }

  async function deleteCategory() {
    if (!deleteTarget) return
    try {
      await api.delete(`/categories/${deleteTarget.id}`, {
        data: reassignTo ? { reassign_to: reassignTo } : undefined,
      })
      toast.success('Kategooria kustutatud')
      setDeleteTarget(null)
      setReassignTo('')
      fetchCategories()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Kustutamine ebaõnnestus')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kategooriad</h1>
        <p className="text-gray-500 text-sm mt-1">Halda seadmete kategooriaid</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Lisa uus kategooria</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Kategooria nimi..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={addCategory}
            disabled={adding || !newName.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            {adding ? 'Lisamine...' : 'Lisa kategooria'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Kategooriaid pole veel lisatud</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Kategooria nimi</th>
                <th className="px-4 py-3 text-center">Seadmeid</th>
                <th className="px-4 py-3 text-right">Toimingud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-48"
                        />
                        <button onClick={() => saveEdit(cat.id)} className="text-xs text-green-600 hover:underline">Salvesta</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">Tühista</button>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {cat.equipment_count} seadet
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => { setEditingId(cat.id); setEditingName(cat.name) }}
                        className="text-xs text-primary hover:underline"
                      >
                        Muuda
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(cat); setReassignTo('') }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Kustuta
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 text-lg mb-2">Kustuta kategooria</h3>
              <p className="text-gray-600 text-sm mb-4">
                Kas oled kindel, et soovid selle kategooria kustutada?
                <br />
                <strong>„{deleteTarget.name}"</strong>
                {deleteTarget.equipment_count > 0 && ` — sellele on määratud ${deleteTarget.equipment_count} seadet.`}
              </p>
              {deleteTarget.equipment_count > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">Määra seadmed ümber kategooriasse (valikuline)</label>
                  <select
                    value={reassignTo}
                    onChange={e => setReassignTo(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Jäta kategooriata</option>
                    {categories.filter(c => c.id !== deleteTarget.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Tühista
                </button>
                <button onClick={deleteCategory} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                  Kustuta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
