import type { Excluded } from '../engine/types'
import '../styles/results.css'
import { SERIES_META } from '../engine/series-meta'

export default function ExcludedList({ items }: { items: Excluded[] }) {
  if (!items.length) return null
  return (
    <details className="excluded">
      <summary>조건에 맞지 않는 제품 {items.length}건</summary>
      <ul>
        {items.map((e) => (
          <li key={e.seriesId}>
            <b>{e.seriesName} <span style={{ fontWeight: 400 }}>· {SERIES_META[e.seriesId]?.line ?? ''}</span></b>
            <span>{e.reason}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
