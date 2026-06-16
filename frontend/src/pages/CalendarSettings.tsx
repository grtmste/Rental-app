import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface CalendarSettingsRow {
  id: number
  master_calendar_id: string | null
  enabled: boolean
}

interface UserRow {
  id: number
  name: string
  email: string
  role: string
  google_calendar_id: string | null
}

export default function CalendarSettings() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<CalendarSettingsRow | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [masterId, setMasterId] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [memberEdits, setMemberEdits] = useState<Record<number, string>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    setLoading(true)
    try {
      const res = await api.get('/calendar-sync/settings')
      setSettings(res.data.settings)
      setMasterId(res.data.settings?.master_calendar_id || '')
      setEnabled(!!res.data.settings?.enabled)
      setUsers(res.data.users || [])
      const edits: Record<number, string> = {}
      ;(res.data.users || []).forEach((u: UserRow) => { edits[u.id] = u.google_calendar_id || '' })
      setMemberEdits(edits)
    } catch {
      toast.error('Seadete laadimine ebaõnnestus')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      await api.put('/calendar-sync/settings', { master_calendar_id: masterId || null, enabled })
      toast.success('Seaded salvestatud')
      fetchSettings()
    } catch {
      toast.error('Seadete salvestamine ebaõnnestus')
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post('/calendar-sync/test-connection')
      setTestResult(res.data)
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.response?.data?.error || err?.message || 'Tundmatu viga' })
    } finally {
      setTesting(false)
    }
  }

  async function saveMember(userId: number) {
    try {
      await api.put(`/calendar-sync/members/${userId}`, { google_calendar_id: memberEdits[userId] || null })
      toast.success('Kalendri ID salvestatud')
    } catch {
      toast.error('Salvestamine ebaõnnestus')
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kalendri seaded</h1>
        <p className="text-sm text-gray-500 mt-1">
          Google'i kalendri sünkroonimine aktiveerub, kui integratsioon on serveris seadistatud
          (GOOGLE_CALENDAR_ENABLED=true ja teenusekonto andmed). Vaikimisi on see välja lülitatud.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Üldine</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peakalendri ID (master)</label>
          <input
            value={masterId}
            onChange={e => setMasterId(e.target.value)}
            placeholder="nt. ettevote@group.calendar.google.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4" />
          <span className="text-gray-700">Sünkroonimine lubatud</span>
        </label>
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={testConnection}
            disabled={testing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {testing ? 'Testimine...' : 'Testi ühendust'}
          </button>
          <button onClick={saveSettings} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
            {saving ? 'Salvestamine...' : 'Salvesta seaded'}
          </button>
        </div>
        {testResult && (
          <div className={`mt-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            <span className="font-semibold">{testResult.ok ? '✓ ' : '✗ '}</span>{testResult.message}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Meeskonnaliikmete kalendrid</h2>
        <p className="text-sm text-gray-500">
          Iga kasutaja Google'i kalendri ID. Kui see on määratud, lisatakse selle liikme projektide
          sündmused tema kalendrisse.
        </p>
        <div className="divide-y divide-gray-100">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{u.name}</div>
                <div className="text-xs text-gray-500">{u.email} · {u.role}</div>
              </div>
              <input
                value={memberEdits[u.id] ?? ''}
                onChange={e => setMemberEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                placeholder="Google'i kalendri ID"
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={() => saveMember(u.id)} className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark">
                Salvesta
              </button>
            </div>
          ))}
          {users.length === 0 && <div className="py-4 text-center text-gray-400 text-sm">Kasutajaid ei leitud</div>}
        </div>
      </div>
    </div>
  )
}
