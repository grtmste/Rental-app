import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface Quote {
  id: number
  quote_number: string
  client_name: string
  project_name: string
  date: string
  due_date: string
  total: number
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

export default function Quotes() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { fetchQuotes() }, [])

  async function fetchQuotes() {
    setLoading(true)
    try {
      const res = await api.get('/quotes')
      setQuotes(res.data)
    } catch {
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  async function deleteQuote(id: number) {
    if (!confirm('Delete this quote?')) return
    try {
      await api.delete(`/quotes/${id}`)
      toast.success('Quote deleted')
      fetchQuotes()
    } catch {
      toast.error('Failed to delete quote')
    }
  }

  const filtered = statusFilter ? quotes.filter(q => q.status === statusFilter) : quotes

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-500 text-sm mt-1">{quotes.length} total quotes</p>
        </div>
        <button onClick={() => navigate('/app/quotes/new')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          + Create Quote
        </button>
      </div>

      <div className="flex items-center gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes yet</h3>
          <p className="text-gray-500 mb-4">Create your first quote</p>
          <button onClick={() => navigate('/app/quotes/new')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Create Quote</button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Quote #</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/app/quotes/${q.id}`)}>
                  <td className="px-4 py-3 font-medium text-primary">{q.quote_number}</td>
                  <td className="px-4 py-3 text-gray-700">{q.client_name}</td>
                  <td className="px-4 py-3 text-gray-500">{q.project_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{q.date ? new Date(q.date).toLocaleDateString('et-EE') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{q.due_date ? new Date(q.due_date).toLocaleDateString('et-EE') : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">€{Number(q.total || 0).toLocaleString('et-EE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[q.status]}`}>
                      {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/app/quotes/${q.id}`)} className="text-primary hover:underline text-xs mr-3">Edit</button>
                    <button onClick={() => deleteQuote(q.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
