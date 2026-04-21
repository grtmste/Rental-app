import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface InvoiceItem {
  id?: number
  description: string
  quantity: number
  unit_price: number
  line_total: number
}
interface Client { id: number; name: string; company: string; email: string; address: string }

const COMPANY = {
  name: 'Stereo Sound OÜ',
  address: 'Sõpruse pst 219-7, Mustamäe linnaosa, 13414 Tallinn, Harju maakond',
  email: 'karmogudinas@gmail.com',
  phone: '+3725068422',
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNew = id === 'new'

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
      setItems(inv.items?.map((i: any) => ({ id: i.id, description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), line_total: Number(i.line_total) })) || [])
    } catch {
      toast.error('Failed to load invoice')
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
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, line_total: 0 }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.line_total), 0)
  const vatAmount = subtotal * (Number(form.vat_rate) / 100)
  const total = subtotal + vatAmount

  async function save() {
    if (!form.client_id) { toast.error('Please select a client'); return }
    if (!form.invoice_number.trim()) { toast.error('Invoice number is required'); return }
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
        toast.success('Invoice created')
        navigate(`/app/invoices/${res.data.id}`, { replace: true })
      } else {
        await api.put(`/invoices/${id}`, payload)
        toast.success('Invoice saved')
        loadInvoice()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  function openSendModal() {
    const client = clients.find(c => c.id === parseInt(form.client_id))
    setSendEmail(client?.email || '')
    setSendSubject(`Invoice ${form.invoice_number} from ${COMPANY.name}`)
    setSendMessage('')
    setShowSendModal(true)
  }

  async function sendToClient() {
    if (!sendEmail) { toast.error('Recipient email is required'); return }
    setSending(true)
    try {
      await api.post(`/invoices/${id}/send`, { to: sendEmail, subject: sendSubject, message: sendMessage })
      toast.success(`✅ Successfully sent to ${sendEmail}`)
      setShowSendModal(false)
      if (!isNew) loadInvoice()
    } catch {
      toast.error('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const selectedClient = clients.find(c => c.id === parseInt(form.client_id))

  return (
    <>
      <div className="no-print space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate('/app/invoices')} className="hover:text-primary">Invoices</button>
            <span>/</span>
            <span>{isNew ? 'New Invoice' : form.invoice_number}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Download PDF</button>
            {!isNew && <button onClick={openSendModal} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark">Send to Client</button>}
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-4xl mx-auto print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">{COMPANY.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{COMPANY.address}</p>
            <p className="text-sm text-gray-500">{COMPANY.email} · {COMPANY.phone}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-800">INVOICE</div>
            <div className="no-print mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${form.status === 'paid' ? 'bg-green-100 text-green-700' : form.status === 'overdue' ? 'bg-red-100 text-red-700' : form.status === 'sent' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                {form.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Bill To</h3>
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
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                </select>
              </div>
            )}
            {selectedClient && (
              <div className="no-print mt-2">
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="border border-gray-300 rounded text-xs px-2 py-1 text-gray-500">
                  <option value="">Change client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Invoice No.</span>
              <input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm text-right w-36 focus:outline-none" />
              <span className="print-only hidden font-semibold">{form.invoice_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Date</span>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none" />
              <span className="print-only hidden">{form.date ? new Date(form.date).toLocaleDateString('et-EE') : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Due Date</span>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="no-print border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none" />
              <span className="print-only hidden">{form.due_date ? new Date(form.due_date).toLocaleDateString('et-EE') : '—'}</span>
            </div>
            <div className="no-print flex justify-between items-center">
              <span className="text-gray-500 font-medium">Status</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Description</th>
              <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-28">Unit Price</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-28">Total</th>
              <th className="w-8 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 pr-4">
                  <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description..." className="no-print w-full border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                  <span className="print-only hidden text-sm">{item.description}</span>
                </td>
                <td className="py-2 text-center">
                  <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="no-print w-16 text-center border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                  <span className="print-only hidden text-sm text-center">{item.quantity}</span>
                </td>
                <td className="py-2 text-right">
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="no-print w-24 text-right border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none py-1 text-sm" />
                  <span className="print-only hidden text-sm">€{Number(item.unit_price).toFixed(2)}</span>
                </td>
                <td className="py-2 text-right text-sm font-medium">€{Number(item.line_total).toFixed(2)}</td>
                <td className="py-2 text-center no-print">
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="no-print mb-6">
          <button onClick={addItem} className="text-sm text-primary hover:underline">+ Add Row</button>
        </div>

        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">VAT%</span>
              <div className="flex items-center gap-1">
                <input type="number" min="0" max="100" value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))} className="no-print w-14 text-right border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none" />
                <span className="print-only hidden">{form.vat_rate}%</span>
                <span className="text-gray-500">= €{vatAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
              <span>Total</span>
              <span>€{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Additional notes..." className="no-print w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          {form.notes && <p className="print-only hidden text-sm text-gray-600">{form.notes}</p>}
        </div>

        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          {COMPANY.name} · {COMPANY.address} · {COMPANY.email} · {COMPANY.phone}
        </div>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Send Invoice to Client</h3>
              <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Recipient Email</label>
                <input value={sendEmail} onChange={e => setSendEmail(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Subject</label>
                <input value={sendSubject} onChange={e => setSendSubject(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Message (optional)</label>
                <textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)} rows={3} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowSendModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={sendToClient} disabled={sending} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-50">
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
