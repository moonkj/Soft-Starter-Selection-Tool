import { useEffect, useRef, useState } from 'react'
import type { Recommendation } from '../engine/types'
import '../styles/results.css'
import { CAT, asset } from './common'

export default function CatalogModal({ r, openKey, onClose }: { r: Recommendation | null; openKey?: number; onClose: () => void }) {
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
        // 열릴 때 닫기 버튼으로 포커스(이름 없는 영역이 먼저 잡히지 않게)
        window.setTimeout(() => d.querySelector<HTMLElement>('.x')?.focus(), 0)
      }
    } else if (d.open) d.close()
  }, [r, openKey])

  const close = () => { ref.current?.close(); onClose() }

  useEffect(() => {
    if (imgBox.current) imgBox.current.scrollTop = 0
  }, [idx, r])

  const c = r ? CAT[r.catalog] : null
  const pages = r && r.pages.length ? r.pages : [{ page: 6, label: '선택 가이드' }]
  const cur = pages[Math.min(idx, pages.length - 1)]
  const name = r ? `${r.line} ${r.seriesName}` : ''

  return (
    <dialog className="cat-dlg" ref={ref} aria-labelledby="dlg-t" onClose={onClose} onCancel={() => onClose()}
      onClick={(e) => { if (e.target === ref.current) close() }}>
      {r && c && (
        <div className="dlg">
          <aside className="dlg-side">
            <h3>{name}</h3>
            <span className="hint">{c.title}</span>
            {pages.map((p, i) => (
              <button key={p.page + p.label} type="button" className="pg" aria-current={i === idx} onClick={() => setIdx(i)}>
                {p.label}<span>{p.page}쪽</span>
              </button>
            ))}
            <a className="pg" href={asset(c.file)} target="_blank" rel="noopener" style={{ textDecoration: 'none', color: 'inherit' }}>
              전체 카탈로그<span>PDF · {c.sub}</span>
            </a>
          </aside>
          <div className="dlg-main">
            <div className="dlg-bar">
              <div className="t" id="dlg-t">{name} · {cur.label} ({cur.page}쪽)</div>
              <a className="btn primary" target="_blank" rel="noopener" href={`${asset(c.file)}#page=${cur.page}`}>PDF 원본 열기 ({cur.page}쪽)</a>
              <button className="x" type="button" aria-label="닫기" autoFocus onClick={close}>×</button>
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
