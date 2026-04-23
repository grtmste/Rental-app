import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'
// @ts-ignore
import html2pdf from 'html2pdf.js'

interface QuoteItem {
  id?: number
  description: string
  quantity: number
  unit_price: number
  line_total: number
  category_name?: string
  stage_name?: string
}
interface Client { id: number; name: string; company: string; email: string; address: string }

const COMPANY = {
  name: 'Stereo Sound OÜ',
  address: 'Sõpruse pst 219-7, Mustamäe linnaosa, 13414 Tallinn, Harju maakond',
  email: 'karmogudinas@gmail.com',
  phone: '+3725068422',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Mustand',
  sent: 'Saadetud',
  accepted: 'Aktsepteeritud',
  declined: 'Tagasi lükatud',
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const printRef = useRef<HTMLDivElement>(null)
  const isNew = id === 'new'

  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Picking list
  const [pickingListMode, setPickingListMode] = useState(false)
  const [pickingListEquipment, setPickingListEquipment] = useState<any[]>([])
  const [pickingListProject, setPickingListProject] = useState<any>(null)
  const [loadingPickingList, setLoadingPickingList] = useState(false)

  const [form, setForm] = useState({
    quote_number: '',
    client_id: '',
    project_id: '',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    vat_rate: 20,
  })
  const [items, setItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, unit_price: 0, line_total: 0, category_name: '' }])

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {})
    if (isNew) {
      const projectId = searchParams.get('project_id')
      if (projectId) {
        setForm(f => ({ ...f, project_id: projectId }))
        loadProjectEquipment(projectId)
      }
      generateQuoteNumber()
    } else {
      loadQuote()
    }
  }, [id])

  async function generateQuoteNumber() {
    try {
      const res = await api.get('/quotes')
      const num = (res.data.length + 1).toString().padStart(4, '0')
      setForm(f => ({ ...f, quote_number: `QUO-${num}` }))
    } catch {
      setForm(f => ({ ...f, quote_number: `QUO-0001` }))
    }
  }

  async function loadProjectEquipment(projectId: string) {
    try {
      const [projRes, eqRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/equipment`),
      ])
      if (projRes.data.client_id) setForm(f => ({ ...f, client_id: String(projRes.data.client_id) }))
      const eqItems: QuoteItem[] = eqRes.data.map((e: any) => ({
        description: e.equipment_name || e.name,
        quantity: e.quantity,
        unit_price: Number(e.daily_rate || e.equipment_daily_rate) || 0,
        line_total: (e.quantity || 1) * (Number(e.daily_rate || e.equipment_daily_rate) || 0),
        category_name: e.category_name || '',
        stage_name: e.stage_name || '',
      }))
      if (eqItems.length > 0) setItems(eqItems)
    } catch {}
  }

  async function loadQuote() {
    try {
      const res = await api.get(`/quotes/${id}`)
      const q = res.data
      setForm({
        quote_number: q.quote_number,
        client_id: String(q.client_id),
        project_id: q.project_id ? String(q.project_id) : '',
        status: q.status,
        date: q.date ? q.date.split('T')[0] : '',
        due_date: q.due_date ? q.due_date.split('T')[0] : '',
        notes: q.notes || '',
        vat_rate: Number(q.vat_rate) || 20,
      })
      setItems(q.items?.map((i: any) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
        category_name: i.category_name || '',
        stage_name: i.stage_name || '',
      })) || [])
    } catch {
      toast.error('Pakkumise laadimine ebaõnnestus')
    }
  }

  async function loadPickingList() {
    if (!form.project_id) { toast.error('Pakkumisel pole seotud projekti'); return }
    setLoadingPickingList(true)
    try {
      const projRes = await api.get(`/projects/${form.project_id}`)
      setPickingListProject(projRes.data)
    } catch {
      toast.error('Laonimekirja laadimine ebaõnnestus')
      setLoadingPickingList(false)
      return
    }
    try {
      const eqRes = await api.get(`/projects/${form.project_id}/equipment`)
      setPickingListEquipment(Array.isArray(eqRes.data) ? eqRes.data : [])
    } catch {
      setPickingListEquipment([])
    }
    setPickingListMode(true)
    setLoadingPickingList(false)
  }

  function updateItem(idx: number, field: keyof QuoteItem, value: string | number) {
    setItems(prev => {
      const updated = [...prev]
      const item = { ...updated[idx], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        item.line_total = Number(item.quantity) * Number(item.unit_price)
      }
      updated[idx] = item
      return updated
    })
  }

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, line_total: 0, category_name: '', stage_name: '' }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.line_total), 0)
  const vatAmount = subtotal * (Number(form.vat_rate) / 100)
  const total = subtotal + vatAmount

  // Group items by category for the print view
  const categoryGroups = items.reduce((acc, item) => {
    const cat = item.category_name?.trim() || 'Muu'
    if (!acc[cat]) acc[cat] = { items: [], total: 0 }
    acc[cat].items.push(item)
    acc[cat].total += Number(item.line_total)
    return acc
  }, {} as Record<string, { items: QuoteItem[], total: number }>)

  // Group picking list equipment by stage → category
  const pickingStageGroups = pickingListEquipment.reduce((acc, item) => {
    const stage = item.stage_name || 'Määramata lava'
    const cat = item.category_name || 'Kategooriata'
    if (!acc[stage]) acc[stage] = {}
    if (!acc[stage][cat]) acc[stage][cat] = []
    acc[stage][cat].push(item)
    return acc
  }, {} as Record<string, Record<string, any[]>>)

  async function save() {
    if (!form.client_id) { toast.error('Palun vali klient'); return }
    if (!form.quote_number.trim()) { toast.error('Pakkumise number on kohustuslik'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: parseInt(form.client_id),
        project_id: form.project_id ? parseInt(form.project_id) : null,
        subtotal,
        vat_amount: vatAmount,
        total,
        items,
      }
      if (isNew) {
        const res = await api.post('/quotes', payload)
        toast.success('Pakkumine loodud')
        navigate(`/app/quotes/${res.data.id}`, { replace: true })
      } else {
        await api.put(`/quotes/${id}`, payload)
        toast.success('Pakkumine salvestatud')
        loadQuote()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Pakkumise salvestamine ebaõnnestus')
    } finally {
      setSaving(false)
    }
  }

  function openSendModal() {
    const client = clients.find(c => c.id === parseInt(form.client_id))
    setSendEmail(client?.email || '')
    setSendSubject(`Pakkumine ${form.quote_number} firmalt ${COMPANY.name}`)
    setSendMessage('')
    setShowSendModal(true)
  }

  async function sendToClient() {
    if (!sendEmail) { toast.error('Saaja e-post on kohustuslik'); return }
    setSending(true)
    try {
      const res = await api.post(`/quotes/${id}/send`, { to: sendEmail, subject: sendSubject, message: sendMessage })
      const msg = res.data.simulated
        ? `Pakkumine edukalt saadetud! (test-režiim — SMTP pole seadistatud)`
        : `Pakkumine edukalt saadetud aadressile ${sendEmail}`
      toast.success(msg)
      setShowSendModal(false)
      if (!isNew) loadQuote()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'E-kirja saatmine ebaõnnestus. Palun kontrolli seadeid.')
    } finally {
      setSending(false)
    }
  }

  function handlePdf() {
    const element = printRef.current
    if (!element) return
    html2pdf().set({
      margin: [1.5, 1.5, 1.5, 1.5],
      filename: `pakkumine-${form.quote_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        onclone: (doc: Document) => {
          doc.querySelectorAll('.no-print').forEach((el: Element) => {
            (el as HTMLElement).style.display = 'none'
          })
          doc.querySelectorAll('.print-only').forEach((el: Element) => {
            (el as HTMLElement).style.display = 'block'
          })
        },
      },
      jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' },
    }).from(element).save()
  }

  async function createInvoice() {
    if (!form.client_id) { toast.error('Vali kõigepealt klient'); return }
    try {
      const res = await api.post('/invoices', {
        client_id: parseInt(form.client_id),
        project_id: form.project_id ? parseInt(form.project_id) : null,
        quote_id: isNew ? null : parseInt(id!),
        status: 'draft',
        date: form.date,
        due_date: form.due_date || null,
        notes: form.notes || null,
        vat_rate: form.vat_rate,
        items: items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      })
      toast.success('Arve loodud')
      navigate(`/app/invoices/${res.data.id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Arve loomine ebaõnnestus')
    }
  }

  const selectedClient = clients.find(c => c.id === parseInt(form.client_id))

  return (
    <>
      {/* ── Toolbar (no-print) ── */}
      <div className="no-print space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate('/app/quotes')} className="hover:text-primary">Pakkumised</button>
            <span>/</span>
            <span>{isNew ? 'Uus pakkumine' : form.quote_number}</span>
          </div>
          <div className="flex items-center gap-3">
            {pickingListMode ? (
              <>
                <button onClick={() => window.print()} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Prindi laonimekiri</button>
                <button onClick={() => setPickingListMode(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">← Tagasi pakkumise juurde</button>
              </>
            ) : (
              <>
                <button onClick={handlePdf} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Laadi PDF</button>
                {form.project_id && (
                  <button
                    onClick={loadPickingList}
                    disabled={loadingPickingList}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loadingPickingList ? 'Laen...' : 'Loo laonimekiri'}
                  </button>
                )}
                {!isNew && <button onClick={createInvoice} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Loo arve</button>}
                {!isNew && <button onClick={openSendModal} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark">Saada kliendile</button>}
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                  {saving ? 'Salvestamine...' : 'Salvesta pakkumine'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Picking List View ── */}
      {pickingListMode && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-4xl mx-auto">
          {/* Print header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Laonimekiri</h1>
            <p className="text-gray-600 mt-1">
              {pickingListProject?.name} — {new Date().toLocaleDateString('et-EE')}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{COMPANY.name}</p>
          </div>

          {Object.keys(pickingStageGroups).sort((a, b) => a === 'Määramata lava' ? 1 : b === 'Määramata lava' ? -1 : a.localeCompare(b)).map(stageName => (
            <div key={stageName} className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-300 pb-1 mb-3">{stageName}</h2>
              {Object.keys(pickingStageGroups[stageName]).sort().map(catName => (
                <div key={catName} className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{catName}</h3>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Seade</th>
                        <th className="text-center px-3 py-2 font-semibold text-gray-600">Kogus</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Laoriiuli asukoht</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pickingStageGroups[stageName][catName].map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{item.equipment_name}</td>
                          <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                          <td className="px-3 py-2 text-gray-500">{item.location || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}

          {pickingListEquipment.length === 0 && (
            <p className="text-gray-400 text-center py-8">Projektil pole seadmeid määratud.</p>
          )}

          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            {COMPANY.name} · {COMPANY.address}
          </div>
        </div>
      )}

      {/* ── Quote Document ── */}
      <div className={pickingListMode ? 'hidden' : ''}>
        <div ref={printRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-4xl mx-auto print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-6">
          {/* Quote header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-primary">{COMPANY.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{COMPANY.address}</p>
              <p className="text-sm text-gray-500">{COMPANY.email} · {COMPANY.phone}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-800">PAKKUMINE</div>
              <div className="no-print mt-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${form.status === 'accepted' ? 'bg-green-100 text-green-700' : form.status === 'sent' ? 'bg-yellow-100 text-yellow-700' : form.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABELS[form.status] || form.status}
                </span>
              </div>
            </div>
          </div>

          {/* Client + meta */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Arve saaja</h3>
              {selectedClient ? (
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{selectedClient.name}</div>
                  {selectedClient.company && <div className="text-gray-600">{selectedClient.company}</div>}
                  {selectedClient.address && <div className="text-gray-500">{selectedClient.address}</div>}
                  {selectedClient.email && <div className="text-gray-500">{selectedClient.email}</div>}
                </div>
              ) : (
                <div className="no-print">
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Vali klient...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                  </select>
                </div>
              )}
              {selectedClient && (
                <div className="no-print mt-2">
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="border border-gray-300 rounded text-xs px-2 py-1 text-gray-500">
                    <option value="">Vaheta klient...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Pakkumise nr.</span>
                <input value={form.quote_number} onChange={e => setForm(f => ({ ...f, quote_number: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm text-right w-36 focus:outline-none focus:ring-1 focus:ring-primary" />
                <span className="print-only hidden font-semibold">{form.quote_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Kuupäev</span>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary" />
                <span className="print-only hidden">{form.date ? new Date(form.date).toLocaleDateString('et-EE') : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Maksetähtaeg</span>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary" />
                <span className="print-only hidden">{form.due_date ? new Date(form.due_date).toLocaleDateString('et-EE') : '—'}</span>
              </div>
              <div className="no-print flex justify-between items-center">
                <span className="text-gray-500 font-medium">Staatus</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none">
                  <option value="draft">Mustand</option>
                  <option value="sent">Saadetud</option>
                  <option value="accepted">Aktsepteeritud</option>
                  <option value="declined">Tagasi lükatud</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── EDIT mode items table (no-print) ── */}
          <div className="no-print mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase w-28">Lava</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase w-32">Kategooria</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Kirjeldus</th>
                  <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase w-20">Kogus</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-28">Ühiku hind</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-28">Kokku</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 pr-2">
                      <input
                        value={item.stage_name || ''}
                        onChange={e => updateItem(idx, 'stage_name', e.target.value)}
                        placeholder="Lava..."
                        className="w-full border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-xs text-gray-500"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={item.category_name || ''}
                        onChange={e => updateItem(idx, 'category_name', e.target.value)}
                        placeholder="Kategooria..."
                        className="w-full border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-xs text-gray-500"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Rea kirjeldus..." className="w-full border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                    </td>
                    <td className="py-2 text-center">
                      <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-16 text-center border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                    </td>
                    <td className="py-2 text-right">
                      <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 text-right border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                    </td>
                    <td className="py-2 text-right text-sm font-medium">€{Number(item.line_total).toFixed(2)}</td>
                    <td className="py-2 text-center">
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addItem} className="mt-3 text-sm text-primary hover:underline">+ Lisa rida</button>
          </div>

          {/* ── Grouped view: Stage → Category → Items (screen + print) ── */}
          {(() => {
            const hasStages = items.some(i => i.stage_name?.trim())
            const stageGroups: Record<string, { cats: Record<string, { items: QuoteItem[], total: number }>, total: number }> = {}
            items.forEach(item => {
              const stage = item.stage_name?.trim() || (hasStages ? 'Muu' : '__all__')
              const cat = item.category_name?.trim() || 'Muu'
              if (!stageGroups[stage]) stageGroups[stage] = { cats: {}, total: 0 }
              if (!stageGroups[stage].cats[cat]) stageGroups[stage].cats[cat] = { items: [], total: 0 }
              stageGroups[stage].cats[cat].items.push(item)
              stageGroups[stage].cats[cat].total += Number(item.line_total)
              stageGroups[stage].total += Number(item.line_total)
            })
            const sortedStages = Object.keys(stageGroups).sort((a, b) => a === '__all__' ? 0 : a.localeCompare(b))
            return (
              <div className="mb-6 mt-2">
                {sortedStages.map(stageName => {
                  const stageData = stageGroups[stageName]
                  const sortedCats = Object.keys(stageData.cats).sort((a, b) => a.localeCompare(b))
                  return (
                    <div key={stageName} className="mb-6">
                      {hasStages && stageName !== '__all__' && (
                        <div className="font-bold text-gray-900 text-base border-b-2 border-gray-800 pb-1 mb-3 uppercase tracking-wide">{stageName}</div>
                      )}
                      {sortedCats.map(catName => {
                        const catData = stageData.cats[catName]
                        const sortedItems = [...catData.items].sort((a, b) => a.description.localeCompare(b.description))
                        return (
                          <div key={catName} className="mb-4">
                            <div className="font-semibold text-gray-700 text-sm border-b border-gray-300 pb-1 mb-1">{catName}</div>
                            <table className="w-full text-sm">
                              <tbody>
                                {sortedItems.map((item, idx) => (
                                  <tr key={idx} className="border-b border-gray-50">
                                    <td className="py-1.5 pl-2">{item.description}</td>
                                    <td className="py-1.5 text-right text-gray-500 w-16">× {item.quantity}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex justify-end mt-1">
                              <span className="text-sm font-medium text-gray-600">{catName} kokku: €{catData.total.toFixed(2)}</span>
                            </div>
                          </div>
                        )
                      })}
                      {hasStages && stageName !== '__all__' && (
                        <div className="flex justify-end mt-1 pt-1 border-t border-gray-400">
                          <span className="text-sm font-bold text-gray-800">{stageName} kokku: €{stageData.total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Vahesumma</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">KM%</span>
                <div className="flex items-center gap-1">
                  <input type="number" min="0" max="100" value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))} className="no-print w-14 text-right border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none" />
                  <span className="print-only hidden">{form.vat_rate}%</span>
                  <span className="text-gray-500">= €{vatAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                <span>Kokku</span>
                <span>€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-gray-400 uppercase no-print">Märkmed</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Lisamärkmed..." className="no-print mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            {form.notes && <p className="print-only hidden text-sm text-gray-600 mt-2">{form.notes}</p>}
          </div>

          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
            {COMPANY.name} · {COMPANY.address} · {COMPANY.email} · {COMPANY.phone}
          </div>
        </div>
      </div>

      {/* ── Send modal ── */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Saada pakkumine kliendile</h3>
              <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Saaja e-post</label>
                <input value={sendEmail} onChange={e => setSendEmail(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Teema</label>
                <input value={sendSubject} onChange={e => setSendSubject(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sõnum (valikuline)</label>
                <textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)} rows={3} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowSendModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Tühista</button>
              <button onClick={sendToClient} disabled={sending} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-50">
                {sending ? 'Saatmine...' : 'Saada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
