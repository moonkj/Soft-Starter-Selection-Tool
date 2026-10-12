import { useEffect, useRef, useState } from 'react'
import type { Recommendation } from '../engine/types'
import '../styles/results.css'
import { CAT, asset } from './common'

export default function CatalogModal({ r, onClose }: { r: Recommendation | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const imgBox = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (r) {
      setIdx(0)
      if (!d.open) {
        if (typeof d.showModal === 'function') d.showModal()
        else d.setAttribute('open', '')
      }
    } else if (d.open) d.close()
  }, [r])

  useEffect(() => {
    if (imgBox.current) imgBox.current.scrollTop = 0
  }, [idx, r])

  const c = r ? CAT[r.catalog] : null
  const pages = r && r.pages.length ? r.pages : [{ page: 6, label: '선택 가이드' }]
  const cur = pages[Math.min(idx, pages.length - 1)]
  const name = r ? `${r.line} ${r.seriesName}` : ''

  return (
    <dialog className="cat-dlg" ref={ref} aria-labelledby="dlg-t" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close() }}>
      {r && c && (
        <div className="dlg">
          <aside className="dlg-side">
            <h3>{name}</h3>
            <span className="hint">{c.title}</span>
            {pages.map((p, i) => (
              <button key={p.page + p.label} type="button" className="pg" aria-current={i === idx} onClick={() => setIdx(i)}>
                {p.label}<span>p.{p.page}</span>
              </button>
            ))}
            <a className="pg" href={asset(c.file)} target="_blank" rel="noopener" style={{ textDecoration: 'none', color: 'inherit' }}>
              전체 카탈로그<span>PDF · {c.sub}</span>
            </a>
          </aside>
          <div className="dlg-main">
            <div className="dlg-bar">
              <div className="t" id="dlg-t">{name} · {cur.label} (p.{cur.page})</div>
              <a className="btn primary" target="_blank" rel="noopener" href={`${asset(c.file)}#page=${cur.page}`}>PDF 원본 열기 (p.{cur.page})</a>
              <button className="x" type="button" aria-label="닫기" onClick={() => ref.current?.close()}>×</button>
            </div>
            <div className="dlg-img" ref={imgBox}>
              <img src={asset(`pages/${c.img}-${cur.page}.jpg`)} alt={`${c.title} ${cur.page}쪽 ${cur.label}`} />
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
