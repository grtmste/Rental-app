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

interface CalendarGridProps {
  year: number
  month: number
  projects: Project[]
  today: Date
  onDayClick: (year: number, month: number, day: number) => void
}

function CalendarGrid({ year, month, projects, today, onDayClick }: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  function getProjectsForDay(d: number): Project[] {
    const date = new Date(year, month, d)
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-center px-6 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-base font-semibold text-gray-900">{MONTH_NAMES[month]} {year}</h2>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const dayNum = idx - firstDay + 1
          const isValid = dayNum >= 1 && dayNum <= daysInMonth
          const isToday = isValid && today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum
          const dayProjects = isValid ? getProjectsForDay(dayNum) : []

          return (
            <div
              key={idx}
              onClick={() => isValid && onDayClick(year, month, dayNum)}
              className={`min-h-[80px] p-1.5 border-b border-r border-gray-100 transition-colors ${isValid ? 'cursor-pointer hover:bg-blue-50' : 'bg-gray-50/50'} ${isToday ? 'bg-blue-50' : ''}`}
            >
              {isValid && (
                <>
                  <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-gray-700'}`}>
                    {dayNum}
                  </div>
                  <div className="space-y-0.5">
                    {dayProjects.slice(0, 3).map(p => (
                      <div
                        key={p.id}
                        className="text-xs px-1 py-0.5 rounded truncate text-white font-medium"
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
  )
}

export default function Calendar() {
  const navigate = useNavigate()
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [monthCount, setMonthCount] = useState(1)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(null)
  const [modalProjects, setModalProjects] = useState<Project[]>([])

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.projects || r.data || [])).catch(() => toast.error('Projektide laadimine ebaõnnestus'))
  }, [])

  function prevPeriod() {
    let m = currentMonth - monthCount
    let y = currentYear
    while (m < 0) { m += 12; y -= 1 }
    setCurrentYear(y)
    setCurrentMonth(m)
  }

  function nextPeriod() {
    let m = currentMonth + monthCount
    let y = currentYear
    while (m > 11) { m -= 12; y += 1 }
    setCurrentYear(y)
    setCurrentMonth(m)
  }

  function handleDayClick(year: number, month: number, day: number) {
    const date = new Date(year, month, day)
    const dayProjects = projects.filter(p => {
      if (!p.start_date || !p.end_date) return false
      const start = new Date(p.start_date)
      const end = new Date(p.end_date)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      date.setHours(12, 0, 0, 0)
      return date >= start && date <= end
    })
    if (dayProjects.length > 0) {
      setSelectedDay({ year, month, day })
      setModalProjects(dayProjects)
    }
  }

  // Generate array of { year, month } for all visible months
  const visibleMonths: { year: number; month: number }[] = []
  for (let i = 0; i < monthCount; i++) {
    let m = currentMonth + i
    let y = currentYear
    while (m > 11) { m -= 12; y += 1 }
    visibleMonths.push({ year: y, month: m })
  }

  // Title: range of months
  const firstVisible = visibleMonths[0]
  const lastVisible = visibleMonths[visibleMonths.length - 1]
  const rangeTitle = firstVisible.year === lastVisible.year
    ? `${MONTH_NAMES[firstVisible.month]}${monthCount > 1 ? ' – ' + MONTH_NAMES[lastVisible.month] : ''} ${firstVisible.year}`
    : `${MONTH_NAMES[firstVisible.month]} ${firstVisible.year} – ${MONTH_NAMES[lastVisible.month]} ${lastVisible.year}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            {Object.entries(STATUS_COLORS).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1 mr-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }}></div>
                <span className="text-gray-500">{STATUS_LABELS[s] || s}</span>
              </div>
            ))}
          </div>
          {/* Month count toggle */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setMonthCount(n)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${monthCount === n ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {n} {n === 1 ? 'kuu' : 'kuud'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <button onClick={prevPeriod} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600 text-xl font-bold">‹</button>
        <span className="text-base font-semibold text-gray-900">{rangeTitle}</span>
        <button onClick={nextPeriod} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600 text-xl font-bold">›</button>
      </div>

      {/* Calendar grids */}
      <div className={`grid gap-6 ${monthCount === 1 ? 'grid-cols-1' : monthCount === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {visibleMonths.map(({ year, month }) => (
          <CalendarGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            projects={projects}
            today={today}
            onDayClick={handleDayClick}
          />
        ))}
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
