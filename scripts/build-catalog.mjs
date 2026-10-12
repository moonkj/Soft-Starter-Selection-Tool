// data/catalog.original.json(회사에서 받은 원본, 생산처 포함)에서 웹용 src/data/catalog.json 과 data/catalog.json 을 만든다.
// 모델 행은 '기본 모델'(용량/크기) 단위. 전압·조작전원·옵션은 형명 조합기(src/engine/select.ts)가 입력 조건으로 조합한다.
//  - SSC/SSM/SSH/LHVS : 형명 템플릿({V4|V6}, {C1|C2}, {L|M|P}, {V02..V13}, {50|60}Hz)을 뗀 기본 모델 행 (SSH는 용량 22행)
//  - LVSS : 공급 품목 목록대로 -1(AC110V) / -2(AC220V)를 각각의 행으로 (307 이후)
//  - LSFS : 원본 그대로
// 사용: node scripts/build-catalog.mjs   (웹용 사본에서는 생산처(odm)를 뺀다)
import { readFileSync, writeFileSync } from 'node:fs'
const src = JSON.parse(readFileSync(new URL('../data/catalog.original.json', import.meta.url), 'utf8'))
const strip = (m) => {
  let code = m.code.replace(/-\{V4\|V6\}-\{C1\|C2\}$/, '').replace(/-\{V5\|V7\}-\{C1\|C2\}$/, '').replace(/ \{50\|60\}Hz$/, '')
  const ssh = /^SSH-\{L\|M\|P\}-(\d{4})-\{V02\.\.V13\}$/.exec(m.code)
  if (ssh) code = `SSH-${ssh[1]}`
  // SSH: 원본 메모의 '2.3/4.16kV는 1000A까지'는 카탈로그(22~23쪽)에 없는 내용이라 뺀다
  const notes = m.series === 'ssh' ? '' : m.notes
  return { ...m, code, notes, ratings: { ...m.ratings } }
}
const models = []
for (const m of src.models) {
  const g = /^(LS-LVSS-\d{3})-1 \/ -2$/.exec(m.code)
  if (m.series === 'lvss' && g) for (const s of ['1', '2']) models.push({ ...m, code: `${g[1]}-${s}`, ratings: { ...m.ratings } })
  else models.push(strip(m))
}
const full = { ...src, models }
writeFileSync(new URL('../data/catalog.json', import.meta.url), JSON.stringify(full, null, 1))
const web = JSON.parse(JSON.stringify(full))
for (const k in web.series) delete web.series[k].odm
writeFileSync(new URL('../src/data/catalog.json', import.meta.url), JSON.stringify(web, null, 1))
const n = {}; models.forEach((m) => (n[m.series] = (n[m.series] || 0) + 1))
console.log(models.length, n)
