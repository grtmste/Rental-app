import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'
// @ts-ignore
import html2pdf from 'html2pdf.js'

interface InvoiceItem {
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
  paid: 'Makstud',
  overdue: 'Tähtaeg ületatud',
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const printRef = useRef<HTMLDivElement>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)

  const [form, setForm] = useState({
    invoice_number: '',
    client_id: '',
    project_id: '',
    quote_id: '',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    vat_rate: 20,
  })
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0, line_total: 0 }])

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {})
    if (isNew) {
      generateInvoiceNumber()
    } else {
      loadInvoice()
    }
  }, [id])

  async function generateInvoiceNumber() {
    try {
      const res = await api.get('/invoices')
      const num = (res.data.length + 1).toString().padStart(4, '0')
      setForm(f => ({ ...f, invoice_number: `INV-${num}` }))
    } catch {
      setForm(f => ({ ...f, invoice_number: `INV-0001` }))
    }
  }

  async function loadInvoice() {
    try {
      const res = await api.get(`/invoices/${id}`)
      const inv = res.data
      setForm({
        invoice_number: inv.invoice_number,
        client_id: String(inv.client_id),
        project_id: inv.project_id ? String(inv.project_id) : '',
        quote_id: inv.quote_id ? String(inv.quote_id) : '',
        status: inv.status,
        date: inv.date ? inv.date.split('T')[0] : '',
        due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
        notes: inv.notes || '',
        vat_rate: Number(inv.vat_rate) || 20,
      })
      setItems(inv.items?.map((i: any) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
        category_name: i.category_name || '',
        stage_name: i.stage_name || '',
      })) || [])
    } catch {
      toast.error('Arve laadimine ebaõnnestus')
    }
  }

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
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

  async function save() {
    if (!form.client_id) { toast.error('Palun vali klient'); return }
    if (!form.invoice_number.trim()) { toast.error('Arve number on kohustuslik'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: parseInt(form.client_id),
        project_id: form.project_id ? parseInt(form.project_id) : null,
        quote_id: form.quote_id ? parseInt(form.quote_id) : null,
        subtotal,
        vat_amount: vatAmount,
        total,
        items,
      }
      if (isNew) {
        const res = await api.post('/invoices', payload)
        toast.success('Arve loodud')
        navigate(`/app/invoices/${res.data.id}`, { replace: true })
      } else {
        await api.put(`/invoices/${id}`, payload)
        toast.success('Arve salvestatud')
        loadInvoice()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Arve salvestamine ebaõnnestus')
    } finally {
      setSaving(false)
    }
  }

  function openSendModal() {
    const client = clients.find(c => c.id === parseInt(form.client_id))
    setSendEmail(client?.email || '')
    setSendSubject(`Arve ${form.invoice_number} firmalt ${COMPANY.name}`)
    setSendMessage('')
    setShowSendModal(true)
  }

  async function sendToClient() {
    if (!sendEmail) { toast.error('Saaja e-post on kohustuslik'); return }
    setSending(true)
    try {
      await api.post(`/invoices/${id}/send`, { to: sendEmail, subject: sendSubject, message: sendMessage })
      toast.success(`Edukalt saadetud aadressile ${sendEmail}`)
      setShowSendModal(false)
      if (!isNew) loadInvoice()
    } catch {
      toast.error('E-posti saatmine ebaõnnestus')
    } finally {
      setSending(false)
    }
  }

  function handlePdf() {
    const element = printRef.current
    if (!element) return
    html2pdf().set({
      margin: [1.5, 1.5, 1.5, 1.5],
      filename: `arve-${form.invoice_number}.pdf`,
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

  // ── Grouped view: Stage → Category → Items ────────────────────────────────

  const stageMap: Record<string, Record<string, InvoiceItem[]>> = {}
  items.forEach(item => {
    const stage = item.stage_name || ''
    const cat = item.category_name || ''
    if (!stageMap[stage]) stageMap[stage] = {}
    if (!stageMap[stage][cat]) stageMap[stage][cat] = []
    stageMap[stage][cat].push(item)
  })

  const hasGrouping = items.some(i => i.stage_name || i.category_name)

  const sortedStages = Object.keys(stageMap).sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    return 0
  })

  const selectedClient = clients.find(c => c.id === parseInt(form.client_id))

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="no-print space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate('/app/invoices')} className="hover:text-primary">Arved</button>
            <span>/</span>
            <span>{isNew ? 'Uus arve' : form.invoice_number}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePdf} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Laadi PDF</button>
            {!isNew && <button onClick={openSendModal} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark">Saada kliendile</button>}
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Salvestamine...' : 'Salvesta arve'}
            </button>
          </div>
        </div>
      </div>

      <div ref={printRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-4xl mx-auto print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-6">
        {/* ── Header ── */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">{COMPANY.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{COMPANY.address}</p>
            <p className="text-sm text-gray-500">{COMPANY.email} · {COMPANY.phone}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-800">ARVE</div>
            <div className="no-print mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${form.status === 'paid' ? 'bg-green-100 text-green-700' : form.status === 'overdue' ? 'bg-red-100 text-red-700' : form.status === 'sent' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                {STATUS_LABELS[form.status] || form.status}
              </span>
            </div>
          </div>
        </div>

        {/* ── Client + meta ── */}
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
              <span className="text-gray-500 font-medium">Arve nr.</span>
              <input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm text-right w-36 focus:outline-none" />
              <span className="print-only hidden font-semibold">{form.invoice_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Kuupäev</span>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none" />
              <span className="print-only hidden">{form.date ? new Date(form.date).toLocaleDateString('et-EE') : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Maksetähtaeg</span>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none" />
              <span className="print-only hidden">{form.due_date ? new Date(form.due_date).toLocaleDateString('et-EE') : '—'}</span>
            </div>
            <div className="no-print flex justify-between items-center">
              <span className="text-gray-500 font-medium">Staatus</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none">
                <option value="draft">Mustand</option>
                <option value="sent">Saadetud</option>
                <option value="paid">Makstud</option>
                <option value="overdue">Tähtaeg ületatud</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Edit mode items table (no-print) ── */}
        <div className="no-print mb-4">
          <table className="w-full mb-2">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Kirjeldus</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase w-28">Etapp</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase w-28">Kategooria</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase w-16">Kogus</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-24">Ühiku hind</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-24">Kokku</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 pr-2">
                    <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Kirjeldus..." className="w-full border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                  </td>
                  <td className="py-2 pr-2">
                    <input value={item.stage_name || ''} onChange={e => updateItem(idx, 'stage_name', e.target.value)} placeholder="Etapp..." className="w-full border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm text-gray-500" />
                  </td>
                  <td className="py-2 pr-2">
                    <input value={item.category_name || ''} onChange={e => updateItem(idx, 'category_name', e.target.value)} placeholder="Kategooria..." className="w-full border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm text-gray-500" />
                  </td>
                  <td className="py-2 text-center">
                    <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-14 text-center border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                  </td>
                  <td className="py-2 text-right">
                    <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="w-20 text-right border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                  </td>
                  <td className="py-2 text-right text-sm font-medium">€{Number(item.line_total).toFixed(2)}</td>
                  <td className="py-2 text-center">
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addItem} className="text-sm text-primary hover:underline">+ Lisa rida</button>
        </div>

        {/* ── Grouped view: Stage → Category → Items ── */}
        <div className="mb-6 mt-2">
          {hasGrouping ? (
            sortedStages.map(stageName => {
              const catMap = stageMap[stageName]
              const sortedCats = Object.keys(catMap).sort((a, b) => {
                if (a === '') return 1
                if (b === '') return -1
                return a.localeCompare(b)
              })
              const stageTotal = Object.values(catMap).flat().reduce((s, i) => s + Number(i.line_total), 0)

              return (
                <div key={stageName || '__none'} className="mb-6">
                  {stageName && (
                    <div className="bg-gray-800 text-white px-4 py-2 rounded-t-lg">
                      <span className="font-semibold text-sm">{stageName}</span>
                    </div>
                  )}
                  {sortedCats.map(catName => {
                    const catItems = catMap[catName].slice().sort((a, b) => a.description.localeCompare(b.description))
                    const catTotal = catItems.reduce((s, i) => s + Number(i.line_total), 0)
                    return (
                      <div key={catName || '__none'} className={stageName ? 'border-l border-r border-gray-200' : ''}>
                        {catName && (
                          <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-200">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{catName}</span>
                          </div>
                        )}
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Kirjeldus</th>
                              <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 uppercase w-16">Kogus</th>
                              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase w-24">Ühiku hind</th>
                              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase w-24">Kokku</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {catItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2">{item.description}</td>
                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">€{Number(item.unit_price).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right font-medium">€{Number(item.line_total).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          {catName && (
                            <tfoot>
                              <tr className="border-t border-gray-200 bg-gray-50">
                                <td colSpan={3} className="px-4 py-1.5 text-xs text-gray-500 text-right">{catName} kokku</td>
                                <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-700">€{catTotal.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )
                  })}
                  {stageName && (
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-700 text-white rounded-b-lg">
                      <span className="text-sm font-semibold">{stageName} kokku</span>
                      <span className="text-sm font-bold">€{stageTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Kirjeldus</th>
                  <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase w-20">Kogus</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-28">Ühiku hind</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-28">Kokku</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">€{Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">€{Number(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Totals ── */}
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

        {/* ── Notes ── */}
        <div className="mb-6">
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Lisamärkmed..." className="no-print w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          {form.notes && <p className="print-only hidden text-sm text-gray-600">{form.notes}</p>}
        </div>

        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          {COMPANY.name} · {COMPANY.address} · {COMPANY.email} · {COMPANY.phone}
        </div>
      </div>

      {/* ── Send modal ── */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Saada arve kliendile</h3>
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
