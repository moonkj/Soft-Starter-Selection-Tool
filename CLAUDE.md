# CLAUDE.md

이 프로젝트는 Soft Starter 선정 웹 도구다. 먼저 `SPEC.md`를 끝까지 읽고 시작한다.

## 작업 원칙

- 기준은 `prototype/index.html`이다. 화면 구성, 문구, 디자인 토큰, 선정 로직(`calc()`, `evaluate()`)을 그대로 옮긴다. 더 좋아 보이는 방향이 있으면 바꾸기 전에 먼저 제안한다.
- 정격 데이터는 `data/catalog.json`에만 둔다. 코드에 숫자를 하드코딩하지 않는다.
- 선정 로직은 UI와 분리된 순수 함수로 만들고, `tests/selection-cases.json`을 그대로 읽는 테스트를 먼저 작성한다.
- 카탈로그 값이 애매하면 추측하지 않는다. `catalogs/`의 원본 PDF에서 확인하고, 그래도 모르겠으면 TODO로 남기고 질문한다.
- UI 문구는 한국어다. 쉬운 일상어로, 짧게 쓴다.

## 시작 순서

1. `SPEC.md`와 `prototype/index.html` 읽기
2. 프로젝트 생성 (Vite + React + TS 권장)
3. `src/engine/` 선정 로직과 테스트 작성 → C1~C7 통과 확인
4. 화면 구현 → 프로토타입과 나란히 비교
5. 카탈로그 모달과 PDF 링크 확인, 400px 모바일 확인
