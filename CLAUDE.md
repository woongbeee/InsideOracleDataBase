# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

사용자가 SQL 쿼리를 입력하면 Oracle Database 내부에서 일어나는 실행 과정을 시각적으로 시뮬레이션하는 교육용 앱. Oracle 인스턴스 아키텍처 다이어그램에서 각 컴포넌트(SGA, PGA, Buffer Cache, Library Cache 등)가 순차적으로 활성화되며, CBO(Cost-Based Optimizer)가 실행 계획을 생성해 보여준다.

## 명령어

```bash
npm run dev       # 개발 서버 시작 (Vite HMR)
npm run build     # TypeScript 컴파일 후 Vite 번들링 (dist/)
npm run lint      # ESLint 검사
npm run preview   # 빌드 결과물 미리보기
```

> 테스트 프레임워크 없음. lint는 `npm run lint`로 확인.

## 아키텍처

### 데이터 흐름

```
사용자 SQL 입력 (QueryInput)
  → simulationStore.startSimulation()
      → lib/optimizer/index.ts: optimize(sql)   ← CBO 실행 계획 생성
      → 15단계 시뮬레이션 루프 (각 단계마다 activeComponents 업데이트)
  → OracleDiagram (activeComponents에 따라 블록 하이라이트/애니메이션)
  → OptimizerPanel (OptimizerResult 표시)
  → QueryInput 하단 (stepLog 실시간, stepSummary 완료 후)
```

### 상태 관리 (`src/store/simulationStore.ts`)

Zustand 단일 스토어. 핵심 상태:
- `currentStep / isRunning / isComplete` — 시뮬레이션 제어
- `activeComponents: Set<string>` — OracleDiagram에서 어떤 블록을 활성화할지
- `highlightedStep` — 사용자가 stepSummary 타임라인을 클릭하면 해당 단계로 핀 고정 (null이면 현재 단계 따라감)
- `dataFlowArrows` — 컴포넌트 간 애니메이션 화살표
- `stepLog / stepSummary` — 실행 로그 및 요약
- `cachedQueries` — Library Cache에 있는 쿼리 목록 (Library Cache Hit/Miss 판단 기준)
- `optimizerResult: OptimizerResult | null` — CBO 결과
- `flushBuffers()` — DBWn+CKPT 플러시 애니메이션 단독 실행 (시뮬레이션과 무관)

### CBO 옵티마이저 (`src/lib/optimizer/`)

Oracle CBO를 모방한 순수 TypeScript 구현:
- `parser.ts` — SQL SELECT 파싱 (테이블, 컬럼, WHERE 조건, JOIN 추출)
- `stats.ts` — 12개 테이블의 시뮬레이션 통계 (NDV, numRows, numBlocks 등)
- `estimator.ts` — 선택도(selectivity) 계산, 액세스 패스 비용 추정, 조인 비용 추정
- `planGenerator.ts` — 3단계 최적화: Query Transformer → Estimator → Plan Generator
- `types.ts` — AccessPathType, JoinMethod, ExecutionPlan 등 타입 정의

### 데이터 스키마 (`src/data/`)

- `hrSchema.ts` — HR 스키마 7개 테이블 (EMPLOYEES, DEPARTMENTS 등) + 샘플 데이터
- `coSchema.ts` — CO(Customer Orders) 스키마 5개 테이블 + 샘플 데이터
- `dataset.ts` — DataPanel용 단순 `DATASET: Table[]` (스키마 무관, 별도 플랫 구조)
- `stats.ts`의 TABLE_STATS와 스키마 이름이 일치해야 CBO가 올바르게 동작

### 컴포넌트 구조

`App.tsx`가 최상위 뷰 상태(`simulator` / `erd`)와 패널 열림 상태를 로컬 state로 관리한다. 시뮬레이션 관련 상태는 전부 store에서 가져옴.

- `OracleDiagram` — Oracle 인스턴스 구조 시각화 (SGA 하위: Library Cache, Dict Cache, Buffer Cache, Redo Log Buffer; Background Processes; Disk)
- `QueryInput` — SQL 입력 + 실시간 로그(실행 중) / 요약 타임라인(완료 후) + 샘플 쿼리 버튼
- `DataPanel` — 좌측 사이드바: 스키마 정의 뷰 / 테이블 데이터 뷰 (토글)
- `SchemaDiagram` (`SchemaDiagramView` export) — React Flow 기반 ERD (FK 관계 시각화)
- `OptimizerPanel` — 우측 사이드바: CBO 3단계, 액세스 패스 후보, 조인 방법, 실행 계획 트리

## 코드 스타일

- TypeScript strict 모드, `any` 타입 금지 (ESLint에서 error)
- named export만 사용 (default export 금지 — `App.tsx`의 `export default App`은 Vite entry 요구사항 예외)
- CSS: Tailwind 유틸리티 클래스만 사용, 커스텀 CSS 파일 금지 (`index.css` 테마 변수 제외)
- React 19 자동 최적화 우선 활용, 수동 최적화는 react-scan으로 확인 후 적용
- Path alias: `@/` → `src/`

## ESLint / Prettier

- **ESLint**: TypeScript·React 문법 오류만 검사 (타입 오류, hooks 규칙, react-refresh)
- **Prettier** + `prettier-plugin-tailwindcss`: 포매팅·들여쓰기·Tailwind 클래스 자동 정렬
- `eslint-config-prettier`로 두 도구 충돌 방지

## 테마 / 스타일링

`index.css`의 CSS 변수로 전역 테마 정의:
- Sapphire(파란계열), Tangerine(주황), Gold 액센트 컬러 사용
- shadcn/ui 스타일: `base-nova`
- React Flow 커스텀 오버라이드는 `index.css` 내 `.react-flow` 셀렉터에만 허용
