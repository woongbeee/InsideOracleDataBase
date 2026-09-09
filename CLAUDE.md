# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

사용자와 상호작용하는 Dynamic Oracle 교육서. 좌측 사이드바 목차(TOC)에서 챕터를 탐색하고, 각 섹션에서 개념 설명 + 인터랙티브 애니메이션 + 챕터별 시뮬레이터를 통해 Oracle 내부를 학습한다.

**챕터 구성 (num 0~9, `bookStructure.tsx` 기준):**

| num | id | 제목(ko) | 색상 |
|-----|-----|----------|------|
| 0 | `introduction` | 오라클이란? | `brand-navy` |
| 1 | `data-modeling` | 데이터 모델링의 이해 | `brand-navy` |
| 2 | `sql-basics` | SQL 문법 | `brand-navy` |
| 3 | `internals` | 오라클 내부 구조와 프로세스 | `blue` |
| 4 | `join` | 조인 원리와 활용 | `emerald` |
| 5 | `index` | 인덱스 원리와 활용 | `violet` |
| 6 | `partition` | 파티셔닝 | `amber` |
| 7 | `parallel` | 병렬 처리 | `teal` |
| 8 | `optimizer` | 옵티마이저 | `orange` |
| 9 | `sql-tuning` | SQL 튜닝 (쿼리 변환 + 소트 튜닝 포함) | `rose` |

## 명령어

```bash
npm run dev       # 개발 서버 시작 (Vite HMR)
npm run build     # TypeScript 컴파일 후 Vite 번들링 (dist/)
npm run lint      # ESLint 검사
npm run preview   # 빌드 결과물 미리보기
npx prettier --write .  # 코드 포매팅 (format 스크립트 없음, 직접 실행)
```

테스트 프레임워크 없음. 변경 후에는 반드시 `npm run build`로 타입 오류 확인.

**배포:** GitHub Pages — base path `/woongbeee/` (`vite.config.ts`). `__BUILD_DATE__` 전역 변수가 빌드 시 `"YYYY-MM-DD"` 문자열로 주입된다.

## 아키텍처

### 앱 진입점 및 뷰 전환

`App.tsx`가 `AppView: 'landing' | 'book'` 로컬 state로 최상위 뷰를 제어한다. `'landing'` 시 `#root`에 `.landing` 클래스가 붙어 전체 배경 스타일이 달라진다.

### Book 레이아웃 (`src/book/`)

`BookLayout`이 `activeSectionId` state를 소유하고 `TableOfContents`와 `BookContent` 양쪽에 전달한다.

`BookContent`는 `sectionId`를 받아 `bookStructure.ts`의 `getSectionById()`로 챕터를 확인한 뒤, `SectionRouter`가 섹션 ID 접두사로 챕터 컴포넌트를 결정한다(`startsWith('internals-')` 등). **새 챕터를 추가할 때 섹션 ID 접두사가 `SectionRouter`의 분기 조건과 일치해야 한다.**

챕터 페이지 컴포넌트는 `sectionId`만 prop으로 받으며, `lang`은 `useSimulationStore`(`useLangStore` alias)에서 직접 읽는다:

```ts
interface Props {
  sectionId: string   // 현재 활성 섹션 ID
}
// lang은 컴포넌트 내부에서: const lang = useSimulationStore(s => s.lang)
```

`bookStructure.ts`의 `BOOK_CHAPTERS`가 단일 진실 공급원(TOC 데이터). 새 섹션 추가 시 여기만 수정하면 TOC·breadcrumb·Prev/Next가 자동 반영된다.

`BookSection`은 `children?: BookSection[]`을 가질 수 있어 계층 구조를 지원한다. `flattenSections()`가 재귀적 `walk()`로 children을 포함해 평탄화하므로 `getSectionById()`·`getAdjacentSections()`·Prev/Next 모두 children까지 올바르게 동작한다. **임의 깊이(n단계) 지원** — SGA 하위 섹션들(깊이 4: chapter→overview→sga→buffer-cache)이 실제로 동작 중이다.

앱 첫 진입 시 활성 섹션은 `intro-overview` (Chapter 0 첫 섹션, `BookLayout.tsx`의 `useState` 초기값).

현재 `SectionRouter` 접두사 → 컴포넌트 매핑:
| 접두사 | 컴포넌트 | 진입점 |
|--------|----------|--------|
| `intro-` | `IntroductionPage` | `src/book/chapters/introduction/IntroductionPage.tsx` |
| `dm-` | `DataModelingPage` | `src/book/chapters/data-modeling/index.tsx` |
| `sql-basics-` | `SqlBasicsPage` | `src/book/chapters/sql-basics/index.tsx` |
| `internals-` | `InternalsPage` | `src/book/chapters/internals/index.tsx` |
| `join-` | `JoinPage` | `src/book/chapters/join/index.tsx` |
| `index-` | `IndexChapterPage` | `src/book/chapters/index-chapter/index.tsx` |
| `partition-` | `PartitionPage` | `src/book/chapters/partition/index.tsx` |
| `parallel-` | `ParallelPage` | `src/book/chapters/parallel/index.tsx` |
| `optimizer-` | `OptimizerChapterPage` | `src/book/chapters/optimizer/index.tsx` |
| `qt-` | `QueryTransformPage` | `src/book/chapters/query-transform/index.tsx` |
| `sort-` | `SortPage` | `src/book/chapters/sort/index.tsx` |
| `sql-tuning-` | `WipBanner` | 미구현 (챕터 래퍼 섹션, TOC 구조용) |

각 챕터 페이지는 `sectionId`를 받아 내부적으로 `if/switch`로 섹션별 콘텐츠를 분기한다.

새 챕터 추가 체크리스트:
1. `BOOK_CHAPTERS`에 챕터 항목 추가 (`color`는 `BookContent.tsx`의 `COLOR_MAP` 키 중 하나여야 함: `blue|violet|emerald|orange|cyan|rose|amber|teal|brand-pink|brand-navy|brand-teal|brand-orange|brand-salmon`)
2. 챕터 페이지 컴포넌트 생성 (`src/book/chapters/`)
3. `BookContent.tsx`의 `SectionRouter`에 접두사 분기 추가
4. 시뮬레이터 섹션(전체 높이 레이아웃이 필요한 섹션)은 `BookContent.tsx`의 `SectionRouter`에서 별도 처리 필요 (레이아웃 wrapper 없이 직접 렌더링)

### 시뮬레이션 데이터 흐름

```
사용자 SQL 입력 (QueryInput)
  → internalsStore.startSimulation()
      → lib/optimizer/index.ts: optimize(sql)   ← CBO 실행 계획 생성
      → 13단계 시뮬레이션 루프 (각 단계마다 activeComponents 업데이트)
  → OracleDiagram (activeComponents에 따라 블록 하이라이트/애니메이션)
  → OptimizerPanel (OptimizerResult 표시)
  → QueryInput 하단 (stepLog 실시간, stepSummary 완료 후)
```

### 상태 관리 (`src/store/`)

스토어가 두 개로 분리되어 있다:

**`simulationStore.ts` — 전역 앱 상태**
- `lang: 'ko' | 'en'` + `setLang` 만 포함
- 정식 export 이름은 `useLangStore`. `useSimulationStore`는 하위 호환용 alias — **새 코드에서는 `useLangStore`를 사용할 것**
- 모든 챕터 페이지·레이아웃·GlossaryPanel이 이 스토어에서 `lang`을 읽음

**`internalsStore.ts` — Internals Simulator 전용 상태**
- `currentStep / isRunning / isComplete` — 시뮬레이션 제어
- `activeComponents: Set<string>` — OracleDiagram에서 어떤 블록을 활성화할지
- `highlightedStep` — stepSummary 타임라인 클릭 시 해당 단계로 핀 고정 (null이면 현재 단계 따라감)
- `cachedQueries` — Library Cache 쿼리 목록 (최대 8개, FIFO). 3개 시드 쿼리로 초기화
- `bufferFlushed` — `flushBuffers()` 호출 후 `true`가 되어 다음 시뮬레이션에서 반드시 Buffer Miss 발생; 시뮬레이션 완료 시 자동 `false` 리셋

`startSimulation()`은 실행 시점에 `useLangStore.getState().lang`으로 현재 언어를 가져온다.

Library Cache Hit 판단: `trim().toUpperCase()` 정규화 후 `cachedQueries`와 완전 일치 비교. Buffer Cache Hit 판단: `bufferFlushed`가 false이면 `Math.random() > 0.5`로 무작위 결정.

### CBO 옵티마이저 (`src/lib/optimizer/`)

Oracle CBO를 모방한 순수 TypeScript 구현:
- `parser.ts` — SQL SELECT 파싱 (테이블, 컬럼, WHERE 조건, JOIN 추출)
- `stats.ts` — 12개 테이블의 시뮬레이션 통계 (NDV, numRows, numBlocks 등)
- `estimator.ts` — 선택도(selectivity) 계산, 액세스 패스 비용 추정, 조인 비용 추정
- `planGenerator.ts` — 3단계 최적화: Query Transformer → Estimator → Plan Generator

`stats.ts`의 `TABLE_STATS` 테이블 이름이 `hrSchema.ts`·`coSchema.ts`의 스키마 이름과 일치해야 CBO가 올바르게 동작한다.

### 데이터 스키마 (`src/data/`)

- `types.ts` — 공유 TypeScript 인터페이스: `SchemaTable`, `Schema`, `ColumnDef`, `ForeignKey`, `RowData`
- `hrSchema.ts` — HR 스키마 7개 테이블 + 샘플 데이터 (원본 스키마)
- `coSchema.ts` — CO(Customer Orders) 스키마 5개 테이블 + 샘플 데이터
- `hr.ts` — **쿼리 예시용 EMPLOYEES 데이터셋.** `hrSchema.ts` 에서 1회 파생. 챕터에서 쿼리문 예시를 보여줄 때 쓰는 공용 `Employee` 타입(7필드 축약 뷰), `EMPLOYEES` 배열, `EMPLOYEE_COLUMNS`(컬럼 순서 단일 기준), `employeeCell(emp, col)` 헬퍼(셀 값 → 문자열, NULL 처리). **각 섹션이 데이터 타입·컬럼 배열을 매번 새로 정의하지 말고 여기서 import.** 서브셋이 필요하면 `Pick<Employee, ...>`.
- `largeDataGenerator.ts` — 대용량 가상 데이터 생성기 (Mulberry32 PRNG, 시드 기반). 모듈 import 시 1회 생성 후 캐시됨
- `index.ts` — 배럴 파일. `SCHEMAS`, `SAMPLE_QUERIES`, 두 스키마, `EMPLOYEES`/`Employee`/`EMPLOYEE_COLUMNS`/`employeeCell`(from `hr.ts`), `largeDataGenerator`를 re-export

**sql-basics `dml-more/` 공유 모듈** (구 `shared.ts` 를 역할별로 분리):
- `sqlEngine.ts` — 예시 쿼리 문자열을 파싱해 `EMPLOYEES` 위에서 흉내 실행하는 순수 유틸(`parseAndExecute`, WHERE/ORDER/GROUP 평가, `ParsedQuery`/`GroupRow` 타입). `ExecutionSection`·`MiniSimulator` 공유.
- `clauseDemos.ts` — SQL 절 구문 데모 데이터(`CLAUSE_DEMOS`, `ClauseDemo`/`ClauseVariant` 타입, `CLAUSE_COLOR`). `commands/DMLSection`·`dml-more/ClausesSection` 공유.
- `executionQueries.ts` — `ExecutionSection` **전용** 데이터: `EXAMPLE_QUERIES`, 실행 단계(`*_STEPS`), `STEP_COLOR`, `ExampleQuery`/`ExecStep` 타입.

### 용어 사전 (`src/data/glossary.ts`, `src/book/GlossaryPanel.tsx`)

`GLOSSARY` 배열이 전체 용어 목록의 단일 진실 공급원. `GlossaryTerm` 인터페이스: `term`, `definition: { ko, en }`, `sectionIds: string[]`. 용어 추가 시 `glossary.ts`의 `GLOSSARY`에만 항목을 추가하고 `sectionIds`에 해당 섹션 ID를 나열하면 패널에 자동 반영된다.

`GlossaryPanel`은 우측 고정 사이드 패널. `GlossaryBody`는 `key={sectionId}`로 마운트되어 섹션 변경 시 검색·확장 상태가 리셋된다.

### 챕터 내 이중 언어 문자열 패턴

모든 챕터 페이지는 컴포넌트 최상단에 `T` 객체로 ko/en 문자열을 인라인 정의한다:

```ts
const T = {
  ko: { title: '...', desc: '...' },
  en: { title: '...', desc: '...' },
}
// 사용: const t = T[lang]  →  t.title
```

번역이 필요한 UI 문자열은 모두 이 패턴으로 관리하며, 별도 i18n 라이브러리 없음.

### 1페이지 = 1파일 규칙 (Page-per-File)

**TOC의 트리 구조와 디렉토리 트리 구조가 일치해야 한다.** TOC에 독립 섹션 ID로 등록된 모든 페이지는 반드시 자신만의 파일을 가진다.

- **1개의 섹션 ID → 1개의 `.tsx` 파일.** 여러 섹션을 하나의 파일에 함수로 묶지 않는다.
- **디렉토리 = TOC 부모 노드.** TOC에서 부모-자식 관계인 섹션들은 `parent/child/ChildSection.tsx` 형태로 디렉토리를 생성한다.
  - 예: `optimizer-fundamentals-sql-processing` → `fundamentals/sql-processing/SqlProcessingSection.tsx`
  - 예: `optimizer-execution-plans-intro` → `execution-plans/intro/IntroSection.tsx`
- **라우터 파일(index.tsx / XxxSection.tsx)은 import + 분기만 담당.** T 데이터와 컴포넌트 JSX는 해당 섹션 파일로 이동한다.
- **랜딩 페이지(부모 섹션 클릭 시 표시)는 라우터 파일 안에 인라인으로** 둔다 (내용이 ConceptGrid 수준으로 단순한 경우).

새 섹션 추가 체크리스트:
1. `bookStructure.tsx`의 `BOOK_CHAPTERS`에 섹션 항목 추가
2. 해당 섹션의 디렉토리와 파일 생성 (`parent-dir/child-dir/ChildSection.tsx`)
3. 부모 라우터 파일에 import + `sectionId === '...'` 분기 추가
4. 파일 안에 T 객체(ko/en 번역 문자열) + export 컴포넌트 작성

### 챕터별 파일 구조

각 챕터의 구체적인 섹션→파일 매핑은 해당 챕터의 `index.tsx`(또는 라우터 파일)를 직접 읽는 것이 가장 정확하다. 대표 패턴만 기록한다.

**TOC 활성화 범위:** `TableOfContents.tsx`에서 `isReady = chapter.num <= N`으로 제어. 현재 `chapter.num <= 7` (Chapter 0~7)가 활성화되어 있다. 콘텐츠 완성 시 이 숫자를 올린다.

**`WipBanner`** — 미완성 섹션 최상단에 배치. 현재 `BitmapSection`, `CompositeSection`에 적용 중.

**Internals 챕터 특이사항:**
- **`shared/OracleArchitectureDiagram.tsx` — Oracle 내부 구조 다이어그램의 공통 컴포넌트.** 프로그램 전체에서 이걸 쓴다. Instance 안에 SGA·PGA·Background Processes 가 올바르게 중첩되고(공식 "Database Instance" 그림), Server Process ↔ 메모리 영역 접근 관계(owns PGA / reads·writes SGA)까지 표현한다. `variant` prop 으로 두 모드:
  - `variant="simple"` — 이름표만. 각 영역이 클릭 이벤트를 받는다 (`onSelect(id: ArchComponentId)` 콜백 또는 부모의 `data-arch-id` 위임). **클릭 시 동작은 각 페이지가 정의한다** (예: `OverviewSection` 은 클릭 시 아래에 해설 카드를 띄움).
  - `variant="detail"` — 각 영역에 한 줄 설명이 인라인으로 들어감. 클릭 없음(비인터랙티브).
  - 기타 props: `highlightIds`(영역+자식 강조, 나머지 dim — 단계 애니메이션용), `hideClient`, `hideDatabase`, `callout`
- 기존 `OracleInstanceMap.tsx` 는 그대로 유지 — buffer-cache DBWn 플로우·`SgaPositionDiagram`·`MapPanel(shared.tsx)` 이 아직 쓴다. 새 코드에서 Oracle 인스턴스 전체 구조를 그릴 땐 `OracleArchitectureDiagram` 을 쓸 것.
- `overview/sga/shared/SgaPositionDiagram.tsx`의 `SgaPositionDiagram`을 SGA 하위 4개 페이지가 공유 (`activeId: SgaComponentId` prop) — 내부적으로 `OracleMemoryDiagram(scope="sga")` 래퍼
- `StorageSection.tsx`: 각 계층(Block·Extent·Segment·Tablespace)은 `AccordionSection` 안에 전용 Diagram 컴포넌트 + `Prose` + `Table` 구조

**Index 챕터 특이사항:**
- `ScanDiagram.tsx` (`ScanConfig` 타입) — Index Scan 방법별 페이지들이 공유하는 시각화 컴포넌트
- `index-simulator` 섹션은 `IndexLayout` 없이 `PageContainer`로 직접 렌더링
- `IndexPage.tsx`는 dead code — 실제 진입점은 `index.tsx`의 `IndexChapterPage`

**Optimizer 챕터 특이사항:**
- `shared/diagrams.tsx`에 `ExplainPlanTable`, `PlanRow` 타입 등 공유 다이어그램 컴포넌트 위치
- `OptimizerSimulator`는 `BookContent`의 `SectionRouter`에서 레이아웃 wrapper 없이 직접 렌더링
- `fundamentals/WhatIsOptimizerSection.tsx`가 `optimizer-fundamentals` 분기의 라우터 역할. `FundamentalsSection.tsx`는 삭제됨
- `join/` 하위 디렉토리에 `JoinOverviewSection`, `NestedLoopSection`, `HashJoinSection`, `SortMergeSection` 위치 (`optimizer-join-*` 섹션 ID 처리)
- `optimizer-join` 섹션 ID는 `OptimizerJoinOverviewPage`로 fallthrough됨 (랜딩 페이지 겸용)

**Data Modeling 챕터 (`src/book/chapters/data-modeling/`):**
- 최상위 섹션(`dm-overview`, `dm-entity`, `dm-attribute`, `dm-relationship`, `dm-identifier`)은 챕터 루트에 파일
- `dm-sql` 그룹 하위 5개 섹션은 `sql/` 서브디렉토리에 파일 (`NormalizationSection.tsx` 등)
- `RelationshipSection.tsx`에 IE/바커 표기법 SVG 다이어그램 포함 — SVG 기호 공간 상수: `SYM=20px` (엔터티 경계 ↔ 선 끝 갭), `sym1R = E1x+EW+SYM` (왼쪽 기호 우측 끝 = 선 시작), `sym2L = E2x-SYM` (오른쪽 기호 좌측 끝 = 선 끝)

**Sort·Parallel 챕터:** 단일 `index.tsx` 파일에 모든 섹션 포함. `sql-tuning` 챕터의 하위 섹션으로 TOC에 배치됨.

**SQL Basics 챕터 특이사항:**
- `dml-more/JoinSection.tsx` (`sql-basics-join`) — JOIN 종류 선택 UI + `SqlHighlight` SQL 블록 + 벤/격자 다이어그램(`JoinDiagram`, 이 파일 전용 구현)을 조합. 실제 조인 애니메이션은 공용 `@/components/join-sim`의 `JoinSimulator` 사용.
- `dml-more/HierarchySection.tsx` (`sql-basics-hierarchy`, MERGE INTO 다음 섹션) — CONNECT BY 계층형 질의 전용 페이지. 이전엔 `JoinSection.tsx`에 탭으로 통합돼 있었으나 별도 섹션으로 분리됨.

### 챕터 공통 UI (`src/book/chapters/shared.tsx`)

> **새 UI를 만들기 전에 반드시 이 목록을 먼저 확인하라.** SQL 코드 블록, 단계 목록, 아코디언, 표, 정보 박스 등은 모두 이미 정의되어 있다. 직접 `div`/`ul`을 만들지 말고 공통 컴포넌트를 쓴다.

모든 공통 레이아웃 프리미티브는 `src/book/chapters/shared.tsx`에 있다. 챕터 페이지에서 `import { ... } from '../../shared'`(깊이에 따라 조정)로 가져다 쓴다.

#### 컴포넌트 용도 빠른 참조

| 컴포넌트 | 언제 쓰나 | 핵심 prop / 비고 |
|----------|-----------|------|
| `PageContainer` | 모든 페이지 최외곽 래퍼 | `mx-auto max-w-4xl` 적용 |
| `ChapterTitle` | 페이지 최상단 제목 | `icon`(`size={36}`), `title`, `subtitle`. `mb-5` 내장 |
| `SectionTitle` | 섹션 구분 제목 (h2) | `mt-8 mb-4` 내장 |
| `SubTitle` | 소제목 (h3) | `mb-2` 내장 |
| `Prose` | 본문 단락 텍스트 | `whitespace-pre-line` — `\n`으로 줄바꿈. `mb-4` 내장 |
| `Divider` | 섹션 사이 구분선 | `my-8` 내장. `ChapterTitle` 직후에는 쓰지 않음 |
| `InfoBox` | 참고/주의/팁 강조 박스 | `variant`: `tip`\|`note`\|`warning`\|`usage`\|`summary`\|`danger` |
| `Table` | 행/열 데이터 표 | `headers: string[]`, `rows: string[][]`. `mb-6` 내장 |
| `ConceptGrid` | 개념 카드 격자 (2열) | `items: { icon, title, desc }[]`. 아이콘 `size={20}`. `mb-6` 내장 |
| `SqlBlock` | SQL/코드 블록 | `sql` prop. `badge`/`desc` 추가 시 헤더 카드 형태 |
| `StepList` | 번호 배지가 있는 단계 목록 | `steps: { title, desc }[]`. `activeIndex`/`onStepClick`으로 인터랙티브 가능 |
| `AccordionSection` | 클릭해서 펼치는 섹션 | `title`, `defaultOpen` prop |
| `WipBanner` | 작성 중인 페이지 상단 경고 | 미완성 섹션에 표시 |
| `SimulatorPlaceholder` | 시뮬레이터 예정 자리 | `label`, `color` prop |
| `TermPopup` | 인라인 용어 팝업 | 클릭 시 말풍선. `open`/`onOpen`/`onClose` state 필요 |

`OracleArchitectureDiagram` (`src/book/chapters/internals/shared/OracleArchitectureDiagram.tsx`) — **Oracle 인스턴스 내부 구조 다이어그램의 공통 컴포넌트** (프로그램 전체 공용). `variant="simple"`(이름표+클릭 이벤트) / `variant="detail"`(영역별 인라인 설명, 클릭 없음). props: `variant`, `onSelect?`, `highlightIds?: ArchComponentId[]`, `hideClient?`, `hideDatabase?`, `callout?`. 자세한 설명은 위 "Internals 챕터 특이사항" 참고.

`OracleInstanceMap` (`src/book/chapters/internals/shared/OracleInstanceMap.tsx`) — **레거시**. Internals 챕터 전용, 좁은 사이드바·DBWn 애니메이션 용도로만 잔존. props: `highlightIds: InstanceComponentId[]`, `hideClient?`, `horizontal?`, `callout?`. 새 코드는 `OracleArchitectureDiagram` 사용.

#### InfoBox variant 선택 기준

- `tip` — 고급 내용·심화 팁 ("더 알아보기")
- `note` — 보조 설명·조건 안내 ("참고")
- `warning` — 흔한 실수·함정 ("주의")
- `usage` — 적용 사례 ("어디서 사용할까?")
- `summary` — 페이지 마지막 요약 ("핵심 정리")
- `danger` — 데이터 손실·장애 가능성 ("위험")

#### SqlBlock 사용 패턴

```tsx
{/* 단순 코드 블록 — SqlBlock 앞에 항상 div mt-4 래퍼 */}
<div className="mt-4"><SqlBlock sql={t.mySql} /></div>

{/* 레이블이 있는 카드 형태 */}
<SqlBlock sql={t.mySql} badge="예시" badgeColor="blue" desc="설명 텍스트" />
```

`SqlHighlight` (`sql-basics/dml-more/SqlHighlight.tsx`) — `--` 이후를 회색 이탤릭 주석으로 처리. `shared.tsx`가 이 파일을 직접 import함.

**`src/components/join-sim/`** — 챕터 경계를 넘어 재사용되는 조인 시뮬레이션 컴포넌트. `<JoinSimulator type="left" queryDesc="..." />` 형태로 사용하며 employees ⋈ departments 결합 과정을 단계별 애니메이션(재생/이전/다음/초기화)으로 보여준다. **SQL 코드 블록과 벤/격자 다이어그램은 포함하지 않는다** — 각 사용처(`sql-basics/dml-more/JoinSection.tsx`, `join/overview/OverviewSection.tsx`)가 `JOIN_SQL`(barrel에서 export)과 자체 다이어그램 구현을 옆에 직접 배치한다. 조인 결과 테이블은 `shared.tsx`의 `ResultTable`을 사용하고, 소스 테이블(EMPLOYEES/DEPARTMENTS)은 행 하이라이트 애니메이션이 핵심이라 raw `<table>` + framer-motion 유지 (단, `ResultTable`과 시각적으로 통일된 스타일).

#### StepList 사용 예시

순서가 있는 단계(실행 흐름, 작동 방식 등)를 보여줄 때 `ol/li` 대신 사용:
```tsx
<StepList steps={[
  { title: '① 파싱', desc: '구문 검사 → Shared Pool 확인' },
  { title: '② 최적화', desc: '통계 기반 실행 계획 생성' },
]} />
```

### 챕터 페이지 레이아웃 규칙

모든 챕터 페이지는 아래 구조와 간격 규칙을 따른다.

```
<PageContainer>
  <ChapterTitle icon={...} title={...} subtitle={...} />   ← 항상 최상단, Divider 없음

  <SectionTitle>첫 번째 섹션 제목</SectionTitle>
  <Prose>설명</Prose>
  <ConceptGrid items={...} />   ← 있을 경우

  <Divider />   ← 섹션 사이에만, ChapterTitle 직후에는 넣지 않음

  <SectionTitle>두 번째 섹션 제목</SectionTitle>
  ...

  <div className="mt-8">
    <InfoBox variant="summary">...</InfoBox>   ← 마지막 요약은 mt-8 wrapper
  </div>
</PageContainer>
```

**레이아웃 규칙 요약:**
- `<Divider />`는 섹션과 섹션 사이에만. `ChapterTitle` 직후·마지막 섹션 뒤에는 넣지 않는다.
- `<Divider />` 바로 뒤에 `<div className="mt-N">` wrapper를 추가하지 않는다 — `SectionTitle`의 `mt-8`이 이미 충분.
- `SectionTitle` 위에 추가 `mt-N`을 붙이지 않는다.
- 비교가 필요한 경우 — 탭 토글이 아니라 **전체 3컬럼 표** (항목 | A | B) 사용.

### SVG 렌더링 주의사항

SVG는 DOM 순서 = z-order. 인터랙티브 다이어그램에서 특정 요소가 항상 위에 표시되어야 하면 **루프 바깥으로 꺼내 마지막에 렌더**한다.

SVG 레이아웃 상수는 **의존 관계 순서대로** 선언한다 — 버킷 행 위치를 먼저 계산한 뒤 외곽 박스 높이를 역산(`BC_H = (BUCK_ROWS[3] - BC_Y) + BUCK_R + padding`).

**`react-scan` SVG 오버레이 금지:** `react-scan`은 개발 서버에서 named React 컴포넌트 위에 레이블 오버레이를 렌더링한다. SVG 내부에서 `function EntityBox(...)`, `function IEEnd(...)` 같은 named 헬퍼를 `<EntityBox />` 형태로 호출하면 오버레이가 SVG 위에 겹친다. **SVG 안에서는 named 서브컴포넌트를 쓰지 말고 모든 SVG 요소를 인라인 JSX로 직접 렌더**하거나, 변수에 JSX를 할당해 `{myVar}` 형태로 삽입한다.

**Internals 다이어그램 설계 규칙:**
- **ROW_GAP ≥ 26px**: 행 간격이 26px 미만이면 화살표 + 레이블이 겹친다.
- **레이블이 있는 화살표**: L자형 polyline 사용 — `<polyline points="x1,y1 midX,y1 midX,y2 x2,y2">` + 레이블을 꺾임 모서리에 배치.
- **SGA 같은 큰 영역 레이블**: 내부 요소에 가려지므로 SVG 마지막에 흰 배경 `<rect>`와 함께 렌더:
  ```tsx
  <rect x={SGA_X + 4} y={SGA_Y - 8} width={32} height={14} rx={3} fill="#f0fdf4" />
  <text x={SGA_X + 8} y={SGA_Y + 2} ...>SGA</text>
  ```

## 코드 스타일

- TypeScript strict 모드, `any` 타입 금지 (ESLint에서 error)
- named export만 사용 (`App.tsx`의 `export default App`은 Vite entry 요구사항 예외)
- CSS: Tailwind 유틸리티 클래스만 사용, 커스텀 CSS 파일 금지 (`index.css`·`src/styles/tokens.css` 제외)
- 색 hex·`font-family` 리터럴은 `src/styles/tokens.css` 에만. 컴포넌트에서 로컬 색상 맵(`Record<…,{bg,text,border}>`)을 만들지 말고 `@/lib/theme` 에서 import (아래 "테마 / 스타일링")
- Path alias: `@/` → `src/`

### TypeScript 엄격 플래그 주의사항

`tsconfig.app.json`에 아래 플래그가 모두 활성화되어 있다:
- `noUnusedLocals` / `noUnusedParameters` — 사용하지 않는 변수·매개변수는 컴파일 에러
- `erasableSyntaxOnly` — `const enum`, `namespace` 사용 불가. `enum` 대신 `const` 객체 + `as const` 패턴 사용
- `verbatimModuleSyntax` — 타입 import는 반드시 `import type { ... }` 형태로 분리

## ESLint / Prettier

- **ESLint**: TypeScript·React 문법 오류만 검사 (타입 오류, hooks 규칙, react-refresh)
- **Prettier** + `prettier-plugin-tailwindcss`: 포매팅·들여쓰기·Tailwind 클래스 자동 정렬
- `eslint-config-prettier`로 두 도구 충돌 방지

## 주요 의존성

- `zustand` — 전역 상태 관리
- `@xyflow/react` — ERD React Flow 기반 그래프 렌더링 (`SchemaDiagram`)
- `framer-motion` — 시뮬레이션 애니메이션 (화살표, 컴포넌트 하이라이트 전환)
- `@tabler/icons-react` — **기본 아이콘 라이브러리**. `ChapterTitle`은 `size={36}`, `ConceptGrid`·데이터 배열 내 아이콘은 `size={20}`, 인라인 소형 아이콘은 `size={16}`. 모두 `stroke={1.5}` 기본값 사용
- `lucide-react` — 일부 구형 컴포넌트에서 잔존. **새 코드에서는 Tabler 사용**
- `@base-ui/react` + `shadcn` — UI 컴포넌트 기반
- `tailwindcss` v4 — CSS-first 설정 방식 (`@import "tailwindcss"` in `index.css`)
- `react-scan` — 개발 전용 렌더링 성능 모니터. 프로덕션 빌드에 포함되지 않도록 주의

## 테마 / 스타일링 — 디자인 소스 단일화

**색·폰트 값의 유일한 원본은 `src/styles/tokens.css` 한 파일.** 전체 디자인 스펙(색표·타입 스케일·컴포넌트 사양·Phase 2~4 마이그레이션 계획)은 리포 루트의 **`DESIGN.md`**.

- **`src/styles/tokens.css`** — `@theme` 블록, 세 층:
  - **§1 레거시** — shadcn 중립 HSL(`--background` 등), 시뮬레이터 상태색(`--active-*`/`--warn-*`/`--ok-*`), `--sapphire-*`/`--tangerine`/`--gold*` 별칭. `body`·react-flow·생 Tailwind 색 클래스 2,500여 곳이 아직 참조 → **값 불변**. Phase 3에서 삭제 예정.
  - **§2a/2b** — `--color-ios-*`(5색×3) / `--color-brand-*`(5색×3). `shared.tsx`의 `INFOBOX_VARIANT`·`ACCENT_COLORS` 클래스 문자열이 참조 중.
  - **§2c** — 목표 디자인 시스템(Claude Design 캔버스 "Database Learning Book", **다크 우선**): `--color-accent`, `--color-ok|warn|danger|info|coral`, `--color-data-1..8`, `--color-code-*`, `--radius-chip|btn|card|hero`(Tailwind 기본 `--radius-*` 안 건드림), 테마 종속 `--color-canvas|surface|chrome|ink|ink-muted|line|line-strong|chip|field|hover|track|thead`. **아직 소비처 없음** — Phase 2에서 연결.
  - **§3** — `:root[data-theme="light"]`가 §2c 서피스 토큰을 라이트로 override.
- **`src/lib/theme.tsx`** (구 `theme.ts` — JSX 아이콘 때문에 `.tsx`) — 색을 다루는 **유일한 TS 매핑 모듈**: `ACCENT_COLORS`(챕터 액센트 클래스 세트), `INFOBOX_VARIANT`+`INFOBOX_LEGACY_COLOR`, `CONCEPT_TINT`, `SIMULATOR_TINT`, `STEP_COLORS`, `DIAGRAM`/`DATA_PALETTE`/`CODE`(SVG용 `var(--color-*)` 문자열). importer: `shared.tsx`, `BookContent.tsx`, `IntroductionPage.tsx`, `bookStructure.tsx`.
- **`src/index.css`** — `@import` 3줄(tailwindcss, `./styles/tokens.css`, tw-animate-css) + 구조 규칙(`body`, `#root`, `.react-flow__*` 오버라이드)만. React Flow 커스텀은 여기 `.react-flow__*` 셀렉터에만.
- **폰트** — UI/제목/라벨: KO=`Noto Sans KR`, EN=`Inter`. 장문 본문: KO=`Noto Sans KR`, EN=`Newsreader`(세리프). 코드·수치·표·뱃지: `JetBrains Mono`. `index.html`의 Google Fonts `<link>`로 로드. 원본 스택은 `tokens.css`의 `--font-ui-ko`/`--font-ui-en`/`--font-read-ko`/`--font-read-en`/`--font-mono-stack`(`:root`, `@theme` 밖)에 정의되고, `@theme` 블록 안의 `--font-sans`/`--font-read`/`--font-mono`가 그 값을 재참조해서 Tailwind `font-sans`/`font-read`/`font-mono` 유틸을 생성한다. `App.tsx`가 `<html lang>`을 `useLangStore`와 동기화 → `:root:lang(en)`이 `--font-sans-active`/`--font-read-active` 스왑.
  - ⚠ **`@theme` 안에서 변수를 자기 자신으로 참조하지 말 것** (`--font-mono: var(--font-mono);` 같은 패턴) — CSS 커스텀 프로퍼티 순환으로 간주되어 guaranteed-invalid 처리되고, 해당 Tailwind 유틸 전체가 조용히 브라우저 기본값으로 폴백된다. 실제 값은 항상 다른 이름의 변수(`-active`/`-stack` 접미사 등)에 두고 `@theme`에서는 그 이름을 참조한다.
- shadcn 스타일 프리셋: `base-nova` (`components.json`).

**진행 상태:** 디자인 리팩터링 Phase 0/1 완료(토큰 구조·`shared.tsx` 배선·폰트 교체). **앱 화면은 아직 라이트로 렌더**되고(`body`가 shadcn HSL 참조), 다크 우선 전환·`body`↔`--color-*` 연결·2,500여 클래스 이관·테마 토글은 **Phase 2+** (`DESIGN.md §7·§9`).

## 문장·말투·번역 지침

한국어 콘텐츠를 작성하거나 번역할 때 아래 지침을 따른다:

1. 직역 금지. 문맥과 의역을 최우선으로 한다.
2. 전문 용어가 확실하지 않으면 영어를 그대로 쓰거나 가장 대중적인 용어를 쓴다.
3. 영어 축약어가 나올 때는 풀어쓴 명칭(full word)을 괄호 안에 함께 표기한다.
4. 말투는 친근하고 친절하게. 초등학교 5학년 아이에게 설명하듯 쉽게 풀어 쓴다. (`~해요`, `~거예요`, `~거든요` 스타일)
5. 원본이 영어 문서라는 사실이 드러나지 않도록 자연스러운 한국어를 구사한다.
