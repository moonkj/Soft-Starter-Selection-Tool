import { useEffect, useMemo, useRef, useState } from 'react'
import { catalog, type CatalogModel } from '../engine/catalog'
import { modelKey } from '../engine/model-key'
import { SERIES_ORDER } from '../engine/series-meta'
import { clearDraft, fetchPublishedOrNull, parseVisibility, readDraft, writeDraft } from '../config/visibility'
import { MAKER_LABEL, MAKER_OF_SERIES, makerLabel } from './makers'
import '../styles/results.css'
import './admin.css'

// 클라이언트 측 간단 잠금. 보안 장치가 아니다. 비밀번호는 소스에 두지 않고 사내 PC의 .env.local(VITE_ADMIN_PASSWORD)에서 읽는다.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? ''
const GATE_KEY = 'sss.admin.ok'

interface Row {
  key: string
  seriesId: string
  series: string
  code: string
  rating: string
  sortA: number
  maker: string
  order: number
}

/** 고객 추천 카드에 나오는 모델 코드와 같은 표기. 선정 때 정해지는 부분은 카드와 같은 기본값(C1)으로 두고, 전압·주파수 접미는 후보를 같이 보여준다. */
function displayCode(m: CatalogModel): string {
  return m.code
    .replace('{C1|C2}', 'C1')
    .replace('{V4|V6}', 'V4/V6')
    .replace('{V5|V7}', 'V5/V7')
    .replace('{50|60}', '50/60')
    .replace('{L|M|P}', 'L')
    .replace('{V02..V13}', 'V02~V13')
}

function ratingOf(m: CatalogModel): { text: string; a: number } {
  const r = m.ratings
  const n = (k: string) => r[k] ?? null
  if (m.series === 'lvss') {
    const a = [n('class10_A'), n('class20_A'), n('class30_A')]
    return { text: `${a.map((x) => x ?? '-').join(' / ')} A (Class 10/20/30)`, a: a[0] ?? a[1] ?? a[2] ?? 0 }
  }
  if (m.series.startsWith('ssc') || m.series.startsWith('ssm')) {
    const a = n('normal_40C_A') ?? 0
    return { text: `${a} A (Normal, 40°C)`, a }
  }
  if (m.series === 'ssh') {
    const a = n('scr_A') ?? 0
    return { text: `${a} A (SCR)`, a }
  }
  const a = n('rated_A') ?? 0
  return { text: `${a} A`, a }
}

const ROWS: Row[] = catalog.models.map((m, i) => {
  const rt = ratingOf(m)
  return {
    key: modelKey(m), seriesId: m.series, series: catalog.series[m.series].name, code: displayCode(m),
    rating: rt.text, sortA: rt.a, maker: MAKER_OF_SERIES[m.series] ?? '?', order: i,
  }
})
const SERIES_IDS: string[] = SERIES_ORDER.filter((id) => ROWS.some((r) => r.seriesId === id))
const MAKERS = [...new Set(ROWS.map((r) => r.maker))].sort()

type SortKey = 'order' | 'series' | 'code' | 'sortA' | 'maker' | 'vis'

export default function Admin() {
  const [ok, setOk] = useState(() => { try { return sessionStorage.getItem(GATE_KEY) === '1' } catch { return false } })
  const [pw, setPw] = useState('')
  const [bad, setBad] = useState(false)

  if (!ok) {
    return (
      <div className="adm"><div className="box gate">
        <h1>관리자 모드</h1>
        <p className="hint">비밀번호를 입력하세요.</p>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (ADMIN_PASSWORD !== '' && pw === ADMIN_PASSWORD) { try { sessionStorage.setItem(GATE_KEY, '1') } catch { /* 무시 */ } setOk(true) }
          else setBad(true)
        }}>
          <div className="row"><input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setBad(false) }} autoFocus aria-label="비밀번호" /></div>
          {bad && <div className="note" role="alert" style={{ marginBottom: 10 }}>비밀번호가 맞지 않아요. 다시 입력해 주세요.</div>}
          <div className="row">
            <button className="btn primary" type="submit">들어가기</button>
            <a className="btn" href="#/">일반 화면으로</a>
          </div>
        </form>
        <p className="warnbox">이 비밀번호는 화면을 가볍게 잠그는 용도예요. 브라우저에서만 확인하므로 보안 기능이 아니에요.</p>
      </div></div>
    )
  }
  return <Panel />
}

function Panel() {
  const [published, setPublished] = useState<string[] | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readDraft() ?? []))
  const [hasDraft, setHasDraft] = useState(() => readDraft() !== null)
  const [q, setQ] = useState('')
  const [fs, setFs] = useState('')
  const [fm, setFm] = useState('')
  const [onlyOff, setOnlyOff] = useState(false)
  const [group, setGroup] = useState(false)
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'order', dir: 1 })
  const [msg, setMsg] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [loadFail, setLoadFail] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    fetchPublishedOrNull().then((v) => {
      if (!alive) return
      if (!v) { setLoadFail(true); setPublished([]); return } // 못 읽으면 숨김 0개로 오해하지 않도록 경고
      setPublished(v.hidden)
      if (readDraft() === null) setHidden(new Set(v.hidden)) // 임시 저장이 없으면 배포본에서 시작
    })
    return () => { alive = false }
  }, [])

  const known = useMemo(() => new Set(ROWS.map((r) => r.key)), [])
  const commit = (next: Set<string>) => {
    setHidden(next)
    writeDraft([...next].sort())
    setHasDraft(true)
  }
  const setMany = (rows: Row[], off: boolean) => {
    const next = new Set(hidden)
    rows.forEach((r) => (off ? next.add(r.key) : next.delete(r.key)))
    commit(next)
  }
  // 필터를 바꾸면 보이지 않는 행이 선택에 남지 않도록 선택을 비운다
  useEffect(() => { setSel(new Set()) }, [q, fs, fm, onlyOff, group])
  const applySel = (off: boolean) => { setMany(selRows, off); setSel(new Set()) }
  const toggle = (r: Row) => setMany([r], !hidden.has(r.key))

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = ROWS.filter((r) =>
      (!fs || r.seriesId === fs) && (!fm || r.maker === fm) &&
      (!onlyOff || hidden.has(r.key)) && (!t || r.code.toLowerCase().includes(t)))
    const { k, dir } = sort
    const val = (r: Row): string | number =>
      k === 'vis' ? (hidden.has(r.key) ? 1 : 0) : k === 'series' ? SERIES_IDS.indexOf(r.seriesId) : k === 'code' ? r.code : k === 'sortA' ? r.sortA : k === 'maker' ? r.maker : r.order
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b)
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko', { numeric: true })
      return (c || a.order - b.order) * dir
    })
  }, [q, fs, fm, onlyOff, sort, hidden])

  const groups = useMemo(() => MAKERS.map((m) => ({ m, rows: filtered.filter((r) => r.maker === m) })).filter((g) => g.rows.length), [filtered])
  const hiddenCount = ROWS.filter((r) => hidden.has(r.key)).length
  const shownHidden = filtered.filter((r) => hidden.has(r.key)).length
  const pubSet = useMemo(() => new Set(published ?? []), [published])
  const changed = published !== null && (pubSet.size !== hidden.size || [...hidden].some((k) => !pubSet.has(k)))

  const toggleSel = (k: string) => setSel((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const toggleSelAll = (rows: Row[]) => setSel((o) => {
    const n = new Set(o)
    if (rows.every((r) => n.has(r.key))) rows.forEach((r) => n.delete(r.key)); else rows.forEach((r) => n.add(r.key))
    return n
  })
  const selRows = ROWS.filter((r) => sel.has(r.key))
  const exportFile = () => {
    if (loadFail && !window.confirm('배포된 설정 파일을 읽지 못했어요. 지금 내보내면 현재 화면 기준 파일이 만들어져요. 계속할까요?')) return
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` // 한국 시간 기준 날짜
    const body = JSON.stringify({ hidden: [...hidden].filter((k) => known.has(k)).sort(), updated: today }, null, 2) + '\n'
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'model-visibility.json'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    setMsg('model-visibility.json을 내려받았어요. public/config/ 폴더에 덮어쓰고 다시 배포해 주세요.')
  }
  const importFile = async (f: File) => {
    try {
      const v = parseVisibility(JSON.parse(await f.text()))
      if (!v) { setMsg('형식이 맞지 않는 파일이에요. { "hidden": [...] } 형태여야 해요.'); return }
      const keep = v.hidden.filter((k) => known.has(k))
      commit(new Set(keep))
      const drop = v.hidden.length - keep.length
      setMsg(`가져왔어요. 숨김 ${keep.length}개${drop ? ` (현재 목록에 없는 키 ${drop}개는 무시)` : ''}.`)
    } catch {
      setMsg('파일을 읽지 못했어요. JSON 파일인지 확인해 주세요.')
    }
  }
  const resetToPublished = () => {
    clearDraft(); setHasDraft(false); setHidden(new Set(published ?? []))
    setMsg('임시 저장을 지우고 배포된 설정으로 되돌렸어요.')
  }

  const th = (k: SortKey, label: string) => (
    <th className="s" aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: 1 }))}>
        {label}{sort.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  )
  const table = (rows: Row[]) => (
    <div className="tbl-wrap scroll">
      <table>
        <thead><tr><th style={{ width: 36 }}><input type="checkbox" aria-label="이 목록 전체 선택" checked={rows.length > 0 && rows.every((r) => sel.has(r.key))} onChange={() => toggleSelAll(rows)} /></th>{th('series', '시리즈')}{th('code', '모델명')}{th('sortA', '정격')}{th('maker', '생산처')}{th('vis', '노출')}</tr></thead>
        <tbody>
          {rows.map((r) => {
            const off = hidden.has(r.key)
            return (
              <tr key={r.key} className={off ? 'off' : ''}>
                <td><input type="checkbox" aria-label={`${r.code} 선택`} checked={sel.has(r.key)} onChange={() => toggleSel(r.key)} /></td>
                <td>{r.series}</td>
                <td className="mono code">{r.code}</td>
                <td className="mono">{r.rating}</td>
                <td>{makerLabel(r.maker)}</td>
                <td><button className="tgl" aria-pressed={!off} onClick={() => toggle(r)} aria-label={`${r.code} ${off ? '숨김, 눌러서 노출' : '노출 중, 눌러서 숨김'}`}>{off ? '숨김' : '노출'}</button></td>
              </tr>
            )
          })}
          {!rows.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>조건에 맞는 모델이 없어요.</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="adm">
      <div className="abar" style={{ justifyContent: 'space-between', marginTop: 0 }}>
        <h1>관리자 모드 · 모델 노출 설정</h1>
        <a className="btn" href="#/">일반 화면으로</a>
      </div>
      <p className="hint">숨긴 모델은 고객 화면 선정에서 빠지고, 같은 시리즈의 다음 큰 노출 모델이 대신 선정돼요. 단종·판매 중지 모델을 숨기세요.</p>

      <div className="note info" style={{ marginTop: 10 }}>
        변경은 이 브라우저에 임시 저장돼요. <a href="#/">일반 화면</a>에서 바로 확인할 수 있어요. 다른 사용자에게 적용하려면 [설정 파일 내보내기]로 받은 파일을 <b>public/config/model-visibility.json</b>에 덮어쓰고 다시 배포해야 해요.
      </div>

      {loadFail && <div className="note" role="alert">배포된 설정 파일(public/config/model-visibility.json)을 읽지 못했어요. 아래 배포본 숨김 개수는 확인되지 않은 값이에요.</div>}
      <div className="stat">
        숨김 <b className="num">{hiddenCount}</b>개 / 전체 <span className="num">{ROWS.length}</span>개
        {published !== null && <> · 배포된 설정 숨김 <span className="num">{published.length}</span>개{changed ? ' · 배포본과 달라요(내보내기 필요)' : ' · 배포본과 같아요'}</>}
        {hasDraft && <> · 이 브라우저에 임시 저장 있음</>}
      </div>

      <div className="abar">
        <input type="text" placeholder="모델명 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="모델명 검색" />
        <select value={fs} onChange={(e) => setFs(e.target.value)} aria-label="시리즈 필터">
          <option value="">시리즈 전체</option>
          {SERIES_IDS.map((id) => <option key={id} value={id}>{catalog.series[id].name}</option>)}
        </select>
        <select value={fm} onChange={(e) => setFm(e.target.value)} aria-label="생산처 필터">
          <option value="">생산처 전체</option>
          {MAKERS.map((m) => <option key={m} value={m}>{makerLabel(m)}</option>)}
        </select>
        <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={onlyOff} onChange={(e) => setOnlyOff(e.target.checked)} />숨김만</label>
        <button className="btn" aria-pressed={group} onClick={() => setGroup((g) => !g)}>회사별 그룹 보기</button>
      </div>

      <div className="abar selbar">
        <b className="num">선택 {selRows.length}개</b>
        <button className="btn" disabled={!selRows.length} onClick={() => applySel(false)}>선택 항목 노출</button>
        <button className="btn" disabled={!selRows.length} onClick={() => applySel(true)}>선택 항목 숨김</button>
        <button className="btn" disabled={!selRows.length} onClick={() => setSel(new Set())}>선택 해제</button>
        <button className="btn" onClick={() => setSel(new Set(filtered.map((r) => r.key)))}>지금 목록 전체 선택</button>
      </div>

      <div className="abar">
        <span className="hint">지금 목록 {filtered.length}개(숨김 {shownHidden})에 일괄 적용:</span>
        <button className="btn" onClick={() => setMany(filtered, false)}>모두 노출</button>
        <button className="btn" onClick={() => setMany(filtered, true)}>모두 숨김</button>
      </div>

      <details className="excluded" style={{ marginBottom: 12 }}>
        <summary>시리즈별 전체 토글</summary>
        <ul>
          {SERIES_IDS.map((id) => {
            const rows = ROWS.filter((r) => r.seriesId === id)
            const off = rows.filter((r) => hidden.has(r.key)).length
            return (
              <li key={id}>
                <b>{catalog.series[id].name} <span style={{ fontWeight: 400 }}>· {makerLabel(MAKER_OF_SERIES[id])}</span></b>
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="num">숨김 {off} / {rows.length}</span>
                  <button className="btn" style={{ padding: '3px 9px' }} onClick={() => setMany(rows, false)}>전체 노출</button>
                  <button className="btn" style={{ padding: '3px 9px' }} onClick={() => setMany(rows, true)}>전체 숨김</button>
                </span>
              </li>
            )
          })}
        </ul>
      </details>

      {group
        ? groups.map((g) => (
          <section key={g.m}>
            <h3 className="grp">{makerLabel(g.m)} <span className="hint num">{g.rows.length}개 · 숨김 {g.rows.filter((r) => hidden.has(r.key)).length}</span>
              <button className="btn" onClick={() => setMany(g.rows, false)}>이 목록 모두 노출</button>
              <button className="btn" onClick={() => setMany(g.rows, true)}>이 목록 모두 숨김</button></h3>
            {table(g.rows)}
          </section>
        ))
        : table(filtered)}

      <div className="abar" style={{ marginTop: 16 }}>
        <button className="btn primary" onClick={exportFile}>설정 파일 내보내기</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>설정 파일 가져오기</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = '' }} />
        <button className="btn" onClick={resetToPublished} disabled={!hasDraft}>임시 저장 지우기(배포본으로)</button>
        <a className="btn" href="#/">일반 화면으로</a>
      </div>
      {msg && <div className="note info" role="status">{msg}</div>}

      <p className="warnbox">
        안내: 이 화면의 비밀번호는 브라우저에서만 확인하는 간단한 잠금이라 보안 기능이 아니에요. 코드를 열어 보는 사람은 이 화면의 내용(생산처 포함)을 볼 수 있어요. 숨김 설정은 파일을 다시 배포해야 모든 사용자에게 적용돼요.
        생산처 표시명({Object.values(MAKER_LABEL).join(', ')})은 <code>src/admin/makers.ts</code>에서 바꿔요.
      </p>
    </div>
  )
}
