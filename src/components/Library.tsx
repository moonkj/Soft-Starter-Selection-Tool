import '../styles/results.css'
import { CAT, asset } from './common'

export default function Library() {
  return (
    <div className="lib">
      {Object.values(CAT).map((c) => (
        <a key={c.file} href={asset(c.file)} target="_blank" rel="noopener">
          <span className="pdf">PDF</span>
          <span style={{ minWidth: 0 }}><b>{c.title}</b><small>{c.sub}</small></span>
          <span className="hint">열기 ↗</span>
        </a>
      ))}
    </div>
  )
}
