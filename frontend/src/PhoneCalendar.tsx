import { useState } from 'react'
import { siteDate, siteYear } from './siteDate'

const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const weekdays = Array.from({ length: 7 }, (_, index) => dayFormat.format(new Date(siteYear, 0, 1 + index)))

export default function PhoneCalendar() {
  const [today] = useState(() => siteDate(new Date()))
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const offset = month.getDay()
  const cellCount = Math.ceil((offset + days) / 7) * 7

  function moveMonth(step: number) {
    setMonth((current) => new Date(siteYear, (current.getMonth() + step + 12) % 12, 1))
  }

  return (
    <section className="phone-calendar" aria-label="Calendar">
      <header>
        <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
        <h1 aria-live="polite">{monthFormat.format(month)}</h1>
        <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
      </header>
      <table aria-label={monthFormat.format(month)}>
        <thead><tr>{weekdays.map((day, index) => <th key={index} scope="col">{day}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: cellCount / 7 }, (_, week) => (
            <tr key={week}>{Array.from({ length: 7 }, (_, column) => {
              const day = week * 7 + column - offset + 1
              const current = day === today.getDate() && monthIndex === today.getMonth() && year === today.getFullYear()
              return <td key={column} aria-current={current ? 'date' : undefined}>{day > 0 && day <= days ? day : ''}</td>
            })}</tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
