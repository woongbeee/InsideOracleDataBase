import { create } from 'zustand'
import { optimize } from '@/lib/optimizer'
import type { OptimizerResult } from '@/lib/optimizer/types'

export type SimulationStep =
  | 'idle'
  | 'parsing'
  | 'library-cache-check'
  | 'library-cache-hit'
  | 'library-cache-miss'
  | 'dict-cache-lookup'
  | 'optimizing'
  | 'buffer-cache-check'
  | 'buffer-cache-hit'
  | 'buffer-cache-miss'
  | 'disk-io'
  | 'returning-results'
  | 'complete'

// Components that get highlighted per step (SGA blocks + background processes)
export const STEP_COMPONENTS: Partial<Record<SimulationStep, string[]>> = {
  parsing:               ['server-process', 'pga'],
  'library-cache-check': ['library-cache', 'pmon'],        // PMON watches session state
  'library-cache-hit':   ['library-cache'],
  'library-cache-miss':  ['library-cache', 'dict-cache'],
  'dict-cache-lookup':   ['dict-cache'],
  optimizing:            ['library-cache', 'dict-cache'],
  'buffer-cache-check':  ['buffer-cache'],
  'buffer-cache-hit':    ['buffer-cache'],
  'buffer-cache-miss':   ['buffer-cache', 'disk'],
  'disk-io':             ['disk', 'buffer-cache', 'dbwr'],  // DBWn reads from disk
  'returning-results':   ['pga', 'server-process'],
  complete:              ['ckpt', 'smon'],                  // checkpoint + cleanup
}

export interface StepSummary {
  step: SimulationStep
  label: string           // short title shown in summary timeline
  message: string         // detailed description
  result: 'hit' | 'miss' | 'info' | 'ok'
  timestamp: number
  components: string[]    // which diagram blocks to highlight
}

export interface SimulationState {
  currentStep: SimulationStep
  query: string
  isRunning: boolean
  isComplete: boolean
  activeComponents: Set<string>
  highlightedStep: SimulationStep | null   // user-clicked step for pinned highlight
  dataFlowArrows: Array<{ from: string; to: string; id: string }>
  lastQueryCached: boolean
  bufferFlushed: boolean                  // true after flushBuffers() — forces buffer miss on next query
  stepLog: Array<{ step: SimulationStep; message: string; timestamp: number }>
  stepSummary: StepSummary[]              // ordered summary built during run
  cachedQueries: string[]                 // queries in Library Cache (simulated)
  optimizerResult: OptimizerResult | null
}

interface SimulationActions {
  setQuery: (query: string) => void
  startSimulation: (query: string) => void
  resetSimulation: () => void
  setStep: (step: SimulationStep) => void
  addLog: (step: SimulationStep, message: string) => void
  setHighlightedStep: (step: SimulationStep | null) => void
  flushBuffers: () => void
}

export const STEP_PROCESS_LABEL: Partial<Record<SimulationStep, string>> = {
  parsing:               'Server Process가 SQL을 수신하고 Parse 트리 생성',
  'library-cache-check': 'PMON이 세션 상태 모니터링 중 / Library Cache Latch 획득',
  'library-cache-hit':   'Soft Parse 완료 — 실행 계획 즉시 재사용',
  'library-cache-miss':  'Hard Parse 시작 — Library Cache에 새 커서 공간 할당',
  'dict-cache-lookup':   'Data Dictionary에서 오브젝트 정의 로드',
  optimizing:            'CBO가 통계 기반으로 최저비용 실행 계획 생성 후 Library Cache에 저장',
  'buffer-cache-check':  'Buffer Cache에서 LRU 체인 탐색',
  'buffer-cache-hit':    'Logical Read 완료 — Physical I/O 없음',
  'buffer-cache-miss':   'Buffer Miss → DBWn이 Free Buffer 확보 중',
  'disk-io':             'DBWn: Data File → Buffer Cache Physical Read 수행',
  'returning-results':   'Server Process가 결과를 PGA Session Memory로 복사',
  complete:              'CKPT가 SCN 기록 / SMON이 임시 세그먼트 정리',
}

// Seed: a few "already cached" queries to show inside Library Cache
const INITIAL_CACHED_QUERIES = [
  'SELECT * FROM EMPLOYEES',
  'SELECT DEPARTMENT_ID, COUNT(*) FROM EMPLOYEES GROUP BY DEPARTMENT_ID',
  'SELECT * FROM DEPARTMENTS WHERE DEPARTMENT_ID = 10',
]

const initialState: SimulationState = {
  currentStep: 'idle',
  query: '',
  isRunning: false,
  isComplete: false,
  activeComponents: new Set(),
  highlightedStep: null,
  dataFlowArrows: [],
  lastQueryCached: false,
  bufferFlushed: false,
  stepLog: [],
  stepSummary: [],
  cachedQueries: INITIAL_CACHED_QUERIES,
  optimizerResult: null,
}

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  ...initialState,

  setQuery: (query) => set({ query }),

  setHighlightedStep: (step) => {
    if (step === null) {
      set({ highlightedStep: null, activeComponents: new Set(STEP_COMPONENTS[get().currentStep] ?? []) })
    } else {
      set({
        highlightedStep: step,
        activeComponents: new Set(STEP_COMPONENTS[step] ?? []),
        dataFlowArrows: getDataFlowArrows(step),
      })
    }
  },

  startSimulation: async (query) => {
    const store = get()
    if (store.isRunning) return

    set({
      isRunning: true,
      isComplete: false,
      query,
      stepLog: [],
      stepSummary: [],
      currentStep: 'idle',
      activeComponents: new Set(),
      dataFlowArrows: [],
      optimizerResult: null,
      highlightedStep: null,
    })

    const libraryCacheHit = store.cachedQueries
      .map((q) => q.trim().toUpperCase())
      .includes(query.trim().toUpperCase())

    // Buffer flush 이후엔 반드시 miss → disk I/O 발생
    const bufferCacheHit = !store.bufferFlushed && Math.random() > 0.5

    // Run optimizer always
    let optimizerResult: OptimizerResult | null = null
    try {
      optimizerResult = optimize(query)
    } catch {
      // silently skip on parse failure
    }

    const chosenPlan = optimizerResult?.plan
    const planDesc = chosenPlan
      ? chosenPlan.tableAccessPlans.map((ap) => `${ap.tableName}→${ap.chosen.type.replace(/_/g, ' ')}`).join(', ')
      : 'N/A'

    type StepDef = {
      step: SimulationStep
      label: string
      message: string
      result: StepSummary['result']
      duration: number
    }

    const steps: StepDef[] = [
      {
        step: 'parsing',
        label: '쿼리 파싱',
        message: 'Server Process가 SQL 수신 → Syntax 검사 → Semantic 검사 (테이블·컬럼 존재 여부)',
        result: 'info',
        duration: 800,
      },
      {
        step: 'library-cache-check',
        label: 'Library Cache 탐색',
        message: `Shared Pool → Library Cache에서 동일 쿼리(Hash값) 탐색 중…`,
        result: 'info',
        duration: 1000,
      },
      ...(libraryCacheHit
        ? [
            {
              step: 'library-cache-hit' as SimulationStep,
              label: 'Library Cache HIT',
              message: 'Soft Parse 성공 — 캐시된 실행 계획 재사용. Hard Parse 불필요',
              result: 'hit' as StepSummary['result'],
              duration: 800,
            },
          ]
        : [
            {
              step: 'library-cache-miss' as SimulationStep,
              label: 'Library Cache MISS',
              message: 'Hard Parse 시작 — 캐시에 없음. Data Dictionary Cache 참조 필요',
              result: 'miss' as StepSummary['result'],
              duration: 700,
            },
            {
              step: 'dict-cache-lookup' as SimulationStep,
              label: 'Dict Cache 조회',
              message: 'Data Dictionary Cache에서 테이블·컬럼·인덱스 메타데이터 조회',
              result: 'info' as StepSummary['result'],
              duration: 800,
            },
            {
              step: 'optimizing' as SimulationStep,
              label: 'CBO 최적화',
              message: chosenPlan
                ? `Cost-Based Optimizer 실행 계획 생성 완료 — 총 비용 ${chosenPlan.totalCost.toFixed(1)}, 예상 rows ${chosenPlan.estimatedRows} [${planDesc}]`
                : 'Cost-Based Optimizer(CBO)가 최적 실행 계획 생성 중',
              result: 'ok' as StepSummary['result'],
              duration: 1400,
            },
          ]),
      {
        step: 'buffer-cache-check',
        label: 'Buffer Cache 탐색',
        message: 'Database Buffer Cache에서 필요한 데이터 블록 탐색',
        result: 'info',
        duration: 900,
      },
      ...(bufferCacheHit
        ? [
            {
              step: 'buffer-cache-hit' as SimulationStep,
              label: 'Buffer Cache HIT',
              message: '데이터 블록이 메모리(Buffer Cache)에 존재 — 디스크 I/O 없이 반환',
              result: 'hit' as StepSummary['result'],
              duration: 700,
            },
          ]
        : [
            {
              step: 'buffer-cache-miss' as SimulationStep,
              label: 'Buffer Cache MISS',
              message: store.bufferFlushed
                ? 'Buffer Flush 이후 캐시가 비워짐 — 디스크 I/O 필요'
                : '데이터 블록이 메모리에 없음 — 디스크 I/O 발생',
              result: 'miss' as StepSummary['result'],
              duration: 600,
            },
            {
              step: 'disk-io' as SimulationStep,
              label: '디스크 I/O',
              message: 'DBWn이 Data File에서 블록 읽기 → Buffer Cache에 로드 (Physical Read)',
              result: 'info' as StepSummary['result'],
              duration: 1200,
            },
          ]),
      {
        step: 'returning-results',
        label: '결과 반환',
        message: '결과 집합(Result Set)을 PGA(세션 메모리)로 전달 → 클라이언트 응답',
        result: 'ok',
        duration: 600,
      },
      {
        step: 'complete',
        label: '실행 완료',
        message: '쿼리 실행 완료',
        result: 'ok',
        duration: 400,
      },
    ]

    for (const { step, label, message, result, duration } of steps) {
      if (step === 'optimizing' && optimizerResult) set({ optimizerResult })
      if (step === 'library-cache-hit' && optimizerResult) set({ optimizerResult })

      get().setStep(step)
      get().addLog(step, message)

      // Build summary entry
      set((state) => ({
        stepSummary: [
          ...state.stepSummary,
          {
            step,
            label,
            message,
            result,
            timestamp: Date.now(),
            components: STEP_COMPONENTS[step] ?? [],
          },
        ],
      }))

      await new Promise((r) => setTimeout(r, duration))
    }

    // Add query to Library Cache if it was a miss (now cached after hard parse)
    if (!libraryCacheHit) {
      set((state) => ({
        cachedQueries: [query, ...state.cachedQueries].slice(0, 8),
      }))
    }

    set({ isRunning: false, isComplete: true, lastQueryCached: true, bufferFlushed: false })
  },

  resetSimulation: () =>
    set({
      ...initialState,
      activeComponents: new Set(),
      cachedQueries: get().cachedQueries,
    }),

  flushBuffers: async () => {
    if (get().isRunning) return
    // Simulate DBWn + CKPT firing: highlight background processes
    set({
      activeComponents: new Set(['buffer-cache', 'dbwr', 'lgwr', 'ckpt', 'disk', 'redo-log-file']),
      dataFlowArrows: [
        { from: 'buffer-cache', to: 'disk', id: 'flush-data' },
        { from: 'redo-buffer', to: 'redo-log-file', id: 'flush-redo' },
      ],
    })
    await new Promise((r) => setTimeout(r, 600))
    set({ activeComponents: new Set(['dbwr', 'ckpt', 'disk']) })
    await new Promise((r) => setTimeout(r, 500))
    set({ activeComponents: new Set(['ckpt']) })
    await new Promise((r) => setTimeout(r, 400))
    set({ activeComponents: new Set(), dataFlowArrows: [], bufferFlushed: true })
  },

  setStep: (step) =>
    set(() => ({
      currentStep: step,
      activeComponents: new Set(STEP_COMPONENTS[step] ?? []),
      dataFlowArrows: getDataFlowArrows(step),
    })),

  addLog: (step, message) =>
    set((state) => ({
      stepLog: [...state.stepLog, { step, message, timestamp: Date.now() }],
    })),
}))

function getDataFlowArrows(step: SimulationStep) {
  const map: Partial<Record<SimulationStep, Array<{ from: string; to: string; id: string }>>> = {
    parsing:               [{ from: 'query-input', to: 'server-process', id: 'q-sp' }],
    'library-cache-check': [{ from: 'server-process', to: 'library-cache', id: 'sp-lc' }],
    'library-cache-hit':   [{ from: 'library-cache', to: 'server-process', id: 'lc-sp' }],
    'library-cache-miss':  [{ from: 'library-cache', to: 'dict-cache', id: 'lc-dc' }],
    'dict-cache-lookup':   [{ from: 'library-cache', to: 'dict-cache', id: 'lc-dc' }],
    optimizing:            [{ from: 'dict-cache', to: 'library-cache', id: 'dc-lc' }],
    'buffer-cache-check':  [{ from: 'server-process', to: 'buffer-cache', id: 'sp-bc' }],
    'buffer-cache-hit':    [{ from: 'buffer-cache', to: 'pga', id: 'bc-pga' }],
    'buffer-cache-miss':   [{ from: 'buffer-cache', to: 'disk', id: 'bc-d' }],
    'disk-io':             [{ from: 'disk', to: 'buffer-cache', id: 'd-bc' }],
    'returning-results':   [{ from: 'buffer-cache', to: 'pga', id: 'bc-pga' }],
  }
  return map[step] ?? []
}
