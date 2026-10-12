import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchPublished, readDraft } from './config/visibility'
import { select } from './engine/select'
import { LHVS_DEFAULTS, LSFS_DEFAULTS, SSH_DEFAULTS, type Conditions, type Recommendation, type SelectResult } from './engine/types'
import ConditionPanel, { type FormState } from './components/ConditionPanel'
import Readout from './components/Readout'
import ResultCard from './components/ResultCard'
import ExcludedList from './components/ExcludedList'
import CompareTable from './components/CompareTable'
import QuoteBox from './components/QuoteBox'
import Library from './components/Library'
import CatalogModal from './components/CatalogModal'

// 관리자 모드는 사내 PC 빌드(.env.local의 VITE_ADMIN=1)에서만 켜진다. 공개 빌드에는 관리자 코드·생산처·비밀번호가 들어가지 않는다.
const ADMIN_ON = import.meta.env.VITE_ADMIN === '1'
const Admin = ADMIN_ON ? lazy(() => import('./admin/Admin')) : null
const isAdminHash = () => ADMIN_ON && window.location.hash === '#/admin'

const EMPTY: SelectResult = { amp: 0, kw: null, formula: '', ok: [], excluded: [] }

export default function App() {
  const [admin, setAdmin] = useState(isAdminHash)
  const [published, setPublished] = useState<string[]>([])
  const [draft, setDraft] = useState<string[] | null>(readDraft)
  useEffect(() => {
    let alive = true
    fetchPublished().then((v) => { if (alive) setPublished(v.hidden) })
    const onHash = () => { setAdmin(isAdminHash()); setDraft(readDraft()) }
    window.addEventListener('hashchange', onHash)
    return () => { alive = false; window.removeEventListener('hashchange', onHash) }
  }, [])
  const hidden = useMemo(() => new Set(draft ?? published), [draft, published])

  const [f, setF] = useState<FormState>({
    volt: 380, hz: 60, cap: '55', unit: 'kW', cls: 10, control: '', panel: '', ssh: SSH_DEFAULTS, lsfs: LSFS_DEFAULTS, lhvs: LHVS_DEFAULTS, amb: '', starts: '', conn: '', na: false, bp: false, pr: false,
  })
  // 한 단계 위로 올려 보는 시리즈 (시리즈ID -> 단계). 입력 조건이 바뀌면 처음으로 돌린다.
  const [steps, setSteps] = useState<Record<string, number>>({})
  // 비교에 담은 모델은 그 시점의 결과를 복사해 둔다. 조건이 바뀌면 숨기고, 조건이 돌아오면 다시 보여준다.
  const [cmp, setCmp] = useState<{ sig: string; r: Recommendation }[]>([])
  const [catId, setCatId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const tt = useRef<number | undefined>(undefined)

  const set = useCallback((p: Partial<FormState>) => setF((o) => ({ ...o, ...p })), [])
  const toast = useCallback((m: string) => {
    setToastMsg(m)
    window.clearTimeout(tt.current)
    tt.current = window.setTimeout(() => setToastMsg(''), 2200)
  }, [])

  const capNum = +f.cap || 0
  const baseKey = `${f.volt}|${f.hz}|${f.cap}|${f.unit}|${f.cls}`
  useEffect(() => { setSteps({}) }, [baseKey])
  const cond = useMemo<Conditions>(() => ({
      volt: f.volt, hz: f.hz, cap: capNum, unit: f.unit, cls: f.cls, control: f.control, panel: f.panel, ssh: f.ssh, lsfs: f.lsfs, lhvs: f.lhvs,
      // 고르지 않은 조건(-)은 기준 조건(40°C 이하, 3회 이하, In-line)으로 계산하되 경고·제외는 하지 않는다
      amb: f.amb === '' ? 40 : f.amb, starts: f.starts === '' ? 3 : f.starts, conn: f.conn === 'delta' ? 'delta' : 'line', na: f.na, bp: f.bp, pr: f.pr,
  }), [f, capNum])
  const sig = useMemo(() => JSON.stringify(cond) + '|' + hidden.size, [cond, hidden])
  const res: SelectResult = useMemo(() => {
    if (!(capNum > 0)) return EMPTY
    const r = select({ ...cond, steps }, { hidden })
    // 올려 본 결과 목록 끝을 넘어 사라진 시리즈는 단계를 되돌려서 다시 계산한다
    const lost = Object.keys(steps).filter((id) => steps[id] > 0 && !r.ok.some((o) => o.seriesId === id))
    if (!lost.length) return r
    const back = { ...steps }
    lost.forEach((id) => delete back[id])
    return select({ ...cond, steps: back }, { hidden })
  }, [cond, steps, capNum, hidden])

  const empty = !(capNum > 0) || !(res.amp > 0)
  const selCmp = cmp.filter((x) => x.sig === sig).map((x) => x.r)
  const inCmp = (r: Recommendation) => selCmp.some((x) => x.seriesId === r.seriesId && x.model === r.model)
  const pick = selCmp.length ? selCmp : res.ok.slice(0, 1)
  const catRec = catId ? res.ok.find((r) => r.seriesId === catId) ?? null : null

  const toggleCmp = (r: Recommendation) => {
    if (inCmp(r)) { setCmp(cmp.filter((x) => !(x.sig === sig && x.r.seriesId === r.seriesId && x.r.model === r.model))); return }
    if (selCmp.length >= 4) { toast('비교는 4개까지 담을 수 있어요.'); return }
    setCmp([...cmp.filter((x) => x.sig === sig), { sig, r }])
  }
  const stepBy = (id: string, d: number) => setSteps((o) => ({ ...o, [id]: Math.max(0, (o[id] ?? 0) + d) }))

  if (admin && Admin) {
    return (
      <Suspense fallback={<div className="wrap"><div className="empty" style={{ marginTop: 24 }}>불러오는 중이에요.</div></div>}>
        <Admin />
      </Suspense>
    )
  }

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="brand"><b>Soft Starter Selection Tool</b></div>
          <span className="spacer" />
          {ADMIN_ON && <a className="btn" href="#/admin">관리자</a>}
        </div>
      </header>

      {draft && (
        <div className="wrap" style={{ paddingBlock: '12px 0' }}>
          <div className="note">이 브라우저에는 관리자 미리보기 설정이 적용돼 있어요. 숨긴 모델 {draft.length}개가 빠진 결과예요. 다른 사용자에게는 보이지 않아요.</div>
        </div>
      )}
      <div className="wrap">
        <div className="grid">
          <ConditionPanel s={f} set={set} />
          <main style={{ minWidth: 0 }}>
            <Readout s={f} amp={empty ? 0 : res.amp} formula={res.formula} />

            <div className="sec-h">
              <h2>추천 모델 <span className="num" style={{ color: 'var(--muted)', fontWeight: 500 }}>{!empty && res.ok.length ? `${res.ok.length}건` : ''}</span></h2>
              <span className="hint">정격 여유가 작은 순서예요. 카드마다 해당 카탈로그 페이지를 바로 볼 수 있어요.</span>
            </div>
            <div className="cards">
              {empty ? (
                <div className="empty">모터 용량을 넣으면 추천이 나와요.</div>
              ) : res.ok.length ? (
                res.ok.map((r, i) => (
                  <ResultCard key={r.seriesId} r={r} best={i === 0}
                    inCmp={inCmp(r)} onStep={(d) => stepBy(r.seriesId, d)}
                    onCat={() => setCatId(r.seriesId)} onCmp={() => toggleCmp(r)} />
                ))
              ) : (
                <div className="empty">조건에 맞는 제품이 없어요. 아래 제외 사유를 보고 조건을 조정하거나 기술상담으로 문의해 주세요.</div>
              )}
            </div>
            {!empty && <ExcludedList items={res.excluded} />}

            <div className="sec-h">
              <h2>모델 비교</h2>
              <span className="hint">{selCmp.length ? `${selCmp.length}개 모델 · 최대 4개까지 담을 수 있어요.` : "카드에서 '비교에 담기'를 누르면 여기에 나란히 보여요."}</span>
            </div>
            <CompareTable sel={selCmp} />

            <div className="sec-h"><h2>견적 문의</h2></div>
            <QuoteBox s={f} amp={empty ? 0 : res.amp} pick={empty ? [] : pick} toast={toast} />

            <div className="sec-h"><h2>카탈로그 자료실</h2><span className="hint">원본 PDF 전체를 새 탭에서 열어요.</span></div>
            <Library />

            <footer>
              정격값은 첨부 카탈로그(Motorsol 2018, LVSS BeyondX, SSC·SSM·SSH 2023.05) 기준이에요. kW를 전류로 바꿀 때는 효율×역률 근사값을 써서 실제 명판 전류와 차이가 날 수 있어요. 최종 선정은 기술상담으로 확인해 주세요.
            </footer>
          </main>
        </div>
      </div>

      <footer className="site-foot">
        <div className="site-foot-in">
          <span><b>Soft Starter Selection Tool</b> · 참고용 안내</span>
          <span>최종 선정과 견적은 기술상담으로 확인해 주세요.</span>
        </div>
      </footer>

      <CatalogModal r={catRec} onClose={() => setCatId(null)} />
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  )
}
