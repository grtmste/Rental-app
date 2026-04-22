import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface Project {
  id: number
  name: string
  start_date: string
  end_date: string
  status: string
  client_name: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  confirmed: '#2563EB',
  in_progress: '#F97316',
  completed: '#16A34A',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Mustand',
  confirmed: 'Kinnitatud',
  in_progress: 'Töös',
  completed: 'Lõpetatud',
  cancelled: 'Tühistatud',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ['Jaanuar','Veebruar','Märts','Aprill','Mai','Juuni','Juuli','August','September','Oktoober','November','Detsember']
const DAY_NAMES = ['P','E','T','K','N','R','L']

export default function Calendar() {
  const navigate = useNavigate()
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(null)
  const [modalProjects, setModalProjects] = useState<Project[]>([])

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.projects || r.data || [])).catch(() => toast.error('Projektide laadimine ebaõnnestus'))
  }, [])

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
    else setCurrentMonth(m => m - 1)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
    else setCurrentMonth(m => m + 1)
  }

  function getProjectsForDay(year: number, month: number, day: number): Project[] {
    const date = new Date(year, month, day)
    return projects.filter(p => {
      if (!p.start_date || !p.end_date) return false
      const start = new Date(p.start_date)
      const end = new Date(p.end_date)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      date.setHours(12, 0, 0, 0)
      return date >= start && date <= end
    })
  }

  function handleDayClick(day: number) {
    const dayProjects = getProjectsForDay(currentYear, currentMonth, day)
    if (dayProjects.length > 0) {
      setSelectedDay({ year: currentYear, month: currentMonth, day })
      setModalProjects(dayProjects)
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {Object.entries(STATUS_COLORS).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }}></div>
                <span className="text-gray-500">{STATUS_LABELS[s] || s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600">
            ‹
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{MONTH_NAMES[currentMonth]} {currentYear}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600">
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }).map((_, idx) => {
            const dayNum = idx - firstDay + 1
            const isValid = dayNum >= 1 && dayNum <= daysInMonth
            const isToday = isValid && today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === dayNum
            const dayProjects = isValid ? getProjectsForDay(currentYear, currentMonth, dayNum) : []

            return (
              <div
                key={idx}
                onClick={() => isValid && handleDayClick(dayNum)}
                className={`min-h-[90px] p-2 border-b border-r border-gray-100 transition-colors ${isValid ? 'cursor-pointer hover:bg-blue-50' : 'bg-gray-50/50'} ${isToday ? 'bg-blue-50' : ''}`}
              >
                {isValid && (
                  <>
                    <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-gray-700'}`}>
                      {dayNum}
                    </div>
                    <div className="space-y-0.5">
                      {dayProjects.slice(0, 3).map(p => (
                        <div
                          key={p.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate text-white font-medium"
                          style={{ backgroundColor: STATUS_COLORS[p.status] || '#6B7280' }}
                          title={p.name}
                        >
                          {p.name}
                        </div>
                      ))}
                      {dayProjects.length > 3 && (
                        <div className="text-xs text-gray-400 px-1">+{dayProjects.length - 3} veel</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">
                {selectedDay.day}. {MONTH_NAMES[selectedDay.month]} {selectedDay.year}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {modalProjects.map(p => (
                <div key={p.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[p.status] || '#6B7280' }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.client_name}</div>
                    <div className="text-xs text-gray-400">
                      {p.start_date ? new Date(p.start_date).toLocaleDateString('et-EE') : ''} – {p.end_date ? new Date(p.end_date).toLocaleDateString('et-EE') : ''}
                    </div>
                    <div className="mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: STATUS_COLORS[p.status] || '#6B7280' }}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/app/projects/${p.id}`)}
                    className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark transition-colors flex-shrink-0"
                  >
                    Ava
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
