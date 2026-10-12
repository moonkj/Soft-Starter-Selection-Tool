// 원본 data/catalog.json의 odm 필드로 관리자 화면 전용 src/admin/odm.json을 만든다.
// 이 파일은 관리자 청크에서만 import 한다(일반 화면 코드는 읽지 않는다).
import { readFileSync, writeFileSync } from 'node:fs'
const src = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'))
const out = Object.fromEntries(Object.entries(src.series).map(([id, s]) => [id, s.odm]))
writeFileSync(new URL('../src/admin/odm.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
console.log('wrote src/admin/odm.json', out)
