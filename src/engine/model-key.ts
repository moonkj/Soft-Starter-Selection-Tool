// 모델 행 키. catalog.json 모델 행 하나를 가리키는 안정적인 식별자.
// 형식: `${series}|${code}` (code는 catalog.json의 원본 값 그대로).
// 예) 'lvss|LS-LVSS-505-1' 과 'lvss|LS-LVSS-505-2' (LVSS는 -1/-2가 각각의 행),
//     'ssce|SSCe-018', 'ssmi|SSMi-0024B', 'ssh|SSH-0070', 'lhvs|LHVS 3 0350', 'lsfs-s|LSFS 3056 S'
//     (SSC/SSM/SSH/LHVS/LSFS는 기본 모델 행. 전압·제어전원·옵션·주파수는 형명 조합기가 입력 조건으로 붙이므로 행이 아니다).
// 카탈로그에 행이 추가/삭제되지 않는 한 바뀌지 않는다. 시리즈 안에서 code는 유일하다(테스트로 확인).
export const modelKey = (m: { series: string; code: string }): string => `${m.series}|${m.code}`
