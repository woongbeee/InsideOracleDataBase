import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'
import {
  ChapterTitle, SectionTitle, Prose, InfoBox, Divider, SubTitle, SqlBlock,
} from '../../../../shared'
import { cn } from '@/lib/utils'
import { OracleArchitectureDiagram } from '../../../shared/OracleArchitectureDiagram'
import {
  IconBolt,
  IconSearch,
  IconTable,
  IconBox,
} from '@tabler/icons-react'

// ── Translation strings ────────────────────────────────────────────────────

const T = {
  ko: {
    title: 'Shared Pool',
    subtitle: 'SQL 파싱 결과와 메타데이터를 모든 세션이 공유하는 SGA 구성 요소',

    // ── What is ──
    whatTitle: 'Shared Pool이 뭐예요?',
    whatP1: 'Shared Pool은 SGA 안에서 Buffer Cache 다음으로 중요한 메모리 영역이에요. 핵심 역할은 딱 하나예요 — "같은 SQL을 두 번 파싱하지 않는다."',
    whatP2: 'Oracle이 SQL 문장을 처음 받으면 문법 검사 → 권한 확인 → 실행 계획 수립 과정을 거쳐야 해요. 이걸 Hard Parse라고 부르는데 CPU를 꽤 많이 써요. Shared Pool은 그 결과물(파싱된 커서·실행 계획)을 캐시해 두었다가, 똑같은 SQL이 다시 오면 이 캐시를 그대로 재사용(Soft Parse)해요.',
    whatP3: '단순히 SQL만 캐시하는 게 아니에요. 테이블·컬럼·권한 같은 데이터 딕셔너리 메타데이터, 쿼리 결과, PL/SQL 코드까지 하나의 공유 메모리 풀 안에서 함께 관리돼요.',

    // ── Components ──
    componentsTitle: 'Shared Pool의 구성',

    libTitle: 'Library Cache',
    libDesc: '파싱된 SQL 커서와 실행 계획을 저장하는 핵심 영역이에요. Shared SQL Area, PL/SQL 컴파일 코드, Java 클래스 등이 여기 들어와요. 모든 세션이 같은 커서를 공유하기 때문에, 100개 세션이 동시에 같은 SQL을 실행해도 메모리에 실행 계획은 하나만 있으면 돼요.',

    dictTitle: 'Data Dictionary Cache (Row Cache)',
    dictDesc: '테이블 정의, 컬럼 목록, 권한, 인덱스 정보 같은 데이터 딕셔너리를 행(Row) 단위로 캐시해요. SQL을 파싱할 때 "이 테이블이 진짜 있나? 이 컬럼 맞나?" 확인하려면 반드시 필요해요. Row Cache라고도 불러요.',

    resultTitle: 'Server Result Cache',
    resultDesc: '쿼리의 실행 결과 자체를 캐시해요. 똑같은 쿼리가 다시 오면 SQL을 다시 실행하지 않고 저장된 결과를 바로 돌려줘요. 참조하는 객체가 바뀌면 자동으로 무효화돼요.',

    reservedTitle: 'Reserved Pool',
    reservedDesc: '5 KB 이상의 큰 메모리 덩어리가 필요할 때(대형 PL/SQL 패키지, 복잡한 실행 계획 등)를 위해 미리 예약해 둔 영역이에요. 일반 Shared Pool 영역이 단편화되더라도 큰 할당이 실패하지 않도록 보호해 줘요.',

    // ── Parse lifecycle ──
    parseTitle: 'SQL은 어떻게 처리될까요? — Hard Parse vs Soft Parse',
    parseDesc: 'SQL이 Oracle에 도착하면 Library Cache를 먼저 뒤져봐요. 거기서 뭘 찾느냐에 따라 완전히 다른 길을 가요.',

    hardTitle: 'Hard Parse — 처음 보는 SQL',
    hardDesc: 'Library Cache에 맞는 커서가 없을 때 처음부터 전부 파싱하는 과정이에요. CPU를 꽤 많이 써요.',
    hardSteps: [
      { n: '1', label: '문법 검사 (Syntax Check)', desc: 'SELECT, FROM, WHERE 같은 SQL 문법이 올바른지 확인해요.' },
      { n: '2', label: '의미 검사 (Semantic Check)', desc: '테이블·컬럼이 실제로 있는지, 접근 권한은 있는지 Data Dictionary Cache에서 확인해요.' },
      { n: '3', label: '실행 계획 생성 (Optimization)', desc: 'CBO(Cost-Based Optimizer, 비용 기반 옵티마이저)가 통계 정보를 바탕으로 여러 실행 계획의 비용을 비교해서 가장 좋은 걸 골라요.' },
      { n: '4', label: 'Library Cache에 저장', desc: '완성된 커서(파싱 트리 + 실행 계획)를 Shared SQL Area에 저장해요. 이후 같은 SQL이 오면 다시 꺼내 써요.' },
    ],

    softTitle: 'Soft Parse — 이미 캐시된 SQL',
    softDesc: 'Library Cache에 똑같은 SQL이 있으면 1~3단계를 건너뛰고 저장된 커서를 바로 재사용해요. CPU 비용이 거의 없어요.',
    softNote: 'Soft Parse가 되려면 SQL 문자열이 대소문자·공백·줄바꿈까지 완전히 똑같아야 해요. "SELECT * FROM EMP"와 "select * from emp"는 Oracle 눈에 서로 다른 SQL이라 각각 따로 Hard Parse돼요.',

    // ── Shared vs Private ──
    sharedPrivateTitle: 'Shared SQL Area vs Private SQL Area',
    sharedPrivateDesc: 'SQL 하나가 실행될 때 두 가지 메모리 영역이 동시에 쓰여요. SGA의 Shared SQL Area는 모든 세션이 함께 쓰고, PGA의 Private SQL Area는 세션마다 따로 존재해요.',
    sharedAreaLabel: 'Shared SQL Area',
    sharedAreaDesc: '파싱 트리, 실행 계획, 최적화 정보 — 모든 세션이 공유하는 읽기 전용 영역이에요. Library Cache에 저장돼요.',
    privateAreaLabel: 'Private SQL Area',
    privateAreaDesc: '바인드 변수 값, 쿼리 실행 상태(Persistent Area + Runtime Area) — 각 서버 프로세스의 PGA에 저장돼요.',
    sharedPrivateNote: '100개 세션이 같은 SQL을 실행하면 Shared SQL Area는 딱 1개, Private SQL Area는 세션마다 하나씩 100개가 생겨요. Shared Pool 덕분에 메모리를 훨씬 효율적으로 쓸 수 있어요.',

    // ── Child cursor ──
    childCursorTitle: 'Parent Cursor와 Child Cursor',
    childCursorDesc: 'Library Cache의 커서는 두 단계로 이루어져 있어요. Parent Cursor는 SQL 텍스트 자체를 키로 갖는 해시 버킷 항목이에요. 그런데 같은 SQL 텍스트라도 실행 환경이 다르면(다른 스키마, 다른 옵티마이저 파라미터, 다른 바인드 타입 등) 실행 계획이 달라질 수 있어요. 이런 경우 Oracle은 같은 Parent 아래에 별도의 Child Cursor를 하나 더 달아줘요.',
    childCursorItems: [
      { label: 'Parent Cursor', desc: 'SQL 텍스트의 해시값으로 찾는 항목이에요. 텍스트가 같으면 항상 같은 Parent를 가리켜요.' },
      { label: 'Child Cursor #0', desc: '첫 번째 Hard Parse로 만들어진 실행 계획이에요. 대부분은 여기서 끝나요.' },
      { label: 'Child Cursor #N', desc: '스키마·파라미터·바인드 타입 등이 달라서 실행 계획이 바뀔 때 추가로 붙어요.' },
    ],
    childCursorNote: 'Child Cursor가 너무 많이 생기는 현상(Version Count 급증)은 Hard Parse가 폭증하고 있다는 신호예요. V$SQL의 VERSION_COUNT 컬럼으로 확인할 수 있어요.',

    // ── Bind variables ──
    bindTitle: '바인드 변수와 Shared Pool',
    bindDesc: 'Shared Pool을 효율적으로 쓰려면 바인드 변수(:v1, :p1 등)를 활용해야 해요.',
    bindBadSql: `-- Hard Parse 3번 발생 (리터럴 값이 다름)
SELECT * FROM employees WHERE employee_id = 100;
SELECT * FROM employees WHERE employee_id = 101;
SELECT * FROM employees WHERE employee_id = 102;`,
    bindGoodSql: `-- Soft Parse 2번 재사용 (바인드 변수로 통일)
SELECT * FROM employees WHERE employee_id = :id;
-- :id = 100 → Soft Parse
-- :id = 101 → Soft Parse
-- :id = 102 → Soft Parse`,
    bindNote: '리터럴 값(100, 101, 102)이 SQL 안에 그대로 들어가면 Oracle은 각각을 완전히 다른 SQL로 보고 매번 Hard Parse해요. 바인드 변수로 바꾸면 SQL 텍스트가 항상 같아지니까 처음 한 번만 Hard Parse하고 그 이후는 전부 Soft Parse로 재사용할 수 있어요.',

    // ── Result Cache ──
    resultCacheTitle: 'Server Result Cache — 쿼리 결과까지 캐시',
    resultCacheP1: 'Library Cache가 실행 계획을 캐시한다면, Result Cache는 쿼리의 최종 결과 데이터 자체를 캐시해요. 똑같은 쿼리가 다시 오면 SQL을 아예 실행하지 않고 캐시된 결과를 바로 돌려줘요.',
    resultCacheP2: '참조하는 테이블이 바뀌면 Oracle이 자동으로 해당 캐시를 무효화해요. 자주 조회되지만 잘 안 바뀌는 집계 쿼리나 코드 테이블 조회 같은 경우에 특히 효과적이에요.',
    resultCacheSql: `-- RESULT_CACHE 힌트로 결과 캐시 요청
SELECT /*+ RESULT_CACHE */ dept_id, COUNT(*) AS cnt
FROM   employees
GROUP  BY dept_id;`,
    resultCacheNote: 'RESULT_CACHE_MODE = FORCE로 설정하면 모든 쿼리에 자동으로 적용돼요. V$RESULT_CACHE_OBJECTS 뷰에서 캐시 현황을 확인할 수 있어요.',

    // ── Parameters ──
    paramsTitle: '주요 파라미터',
    params: [
      { name: 'SHARED_POOL_SIZE', desc: 'Shared Pool 전체 크기예요. ASMM(SGA_TARGET 설정) 환경에서는 Oracle이 자동으로 조정해 줘요.' },
      { name: 'SHARED_POOL_RESERVED_SIZE', desc: '예약 풀 크기예요. 보통 SHARED_POOL_SIZE의 10~30% 정도로 설정해요.' },
      { name: 'RESULT_CACHE_MODE', desc: 'Result Cache 동작 방식이에요. OFF(기본) / MANUAL(힌트 사용) / FORCE(항상 캐시) 중 하나를 고를 수 있어요.' },
    ],

    // ── Summary ──
    summaryTitle: 'Shared Pool 핵심 정리',
    summaryItems: [
      'Library Cache: 파싱된 SQL 커서와 실행 계획을 캐시해요 — Hard Parse를 Soft Parse로 바꿔줘요',
      'Data Dictionary Cache: 테이블·컬럼·권한 메타데이터를 행 단위로 캐시해요',
      'Server Result Cache: 쿼리 결과 자체를 캐시해요 — 재실행 없이 바로 돌려줄 수 있어요',
      'Reserved Pool: 큰 메모리 할당을 위해 예약해 둔 공간이에요 — 단편화로 인한 실패를 막아줘요',
      '바인드 변수 사용이 Shared Pool 효율의 핵심이에요 — 리터럴 SQL은 Hard Parse를 계속 유발해요',
    ],
  },

  en: {
    title: 'Shared Pool',
    subtitle: 'The SGA component that lets all sessions share parsed SQL and metadata',

    whatTitle: 'What is the Shared Pool?',
    whatP1: 'The Shared Pool is the second most important memory area in the SGA after the Buffer Cache. Its core job is simple: "never re-parse the same SQL."',
    whatP2: 'When Oracle first receives a SQL statement it must go through syntax checking, privilege verification, and execution plan generation — a process called Hard Parse that is CPU-intensive. The Shared Pool caches the result (the parsed cursor and execution plan) so that when the identical SQL arrives again, Oracle can skip all that work and reuse the cache (Soft Parse).',
    whatP3: "It's not just SQL that gets cached. Table and column definitions, privileges, data dictionary metadata, query results, and PL/SQL code are all managed within this single shared memory pool.",

    componentsTitle: 'Shared Pool Components',

    libTitle: 'Library Cache',
    libDesc: 'The core area storing parsed SQL cursors and execution plans. Contains Shared SQL Areas, compiled PL/SQL code, and Java classes. Because every session shares the same cursor, 100 sessions running the same SQL result in only one execution plan stored in memory.',

    dictTitle: 'Data Dictionary Cache (Row Cache)',
    dictDesc: 'Caches data dictionary information — table definitions, column lists, privileges, index metadata — at the row level. This is consulted every time SQL is parsed to answer "does this table exist? do I have permission?" Also known as the Row Cache.',

    resultTitle: 'Server Result Cache',
    resultDesc: 'Caches the actual result set of a query. When the same query arrives again, Oracle returns the stored result immediately without re-executing. Automatically invalidated when any referenced object changes.',

    reservedTitle: 'Reserved Pool',
    reservedDesc: 'Reserved space for allocations larger than 5 KB — large PL/SQL packages, complex execution plans, etc. Protects large allocations from failing due to fragmentation in the general Shared Pool area.',

    parseTitle: 'How is SQL processed? — Hard Parse vs Soft Parse',
    parseDesc: 'When a SQL statement arrives, Oracle searches the Library Cache first. The path that follows depends entirely on what it finds.',

    hardTitle: 'Hard Parse — a SQL seen for the first time',
    hardDesc: 'The full parsing cycle performed when no matching cursor exists in the Library Cache. CPU-intensive.',
    hardSteps: [
      { n: '1', label: 'Syntax Check', desc: 'Verifies that the SQL uses correct grammar: valid keywords, balanced parentheses, proper clause order.' },
      { n: '2', label: 'Semantic Check', desc: 'Confirms that referenced tables and columns actually exist and that the session has permission to access them — all looked up in the Data Dictionary Cache.' },
      { n: '3', label: 'Optimization', desc: 'The CBO estimates the cost of multiple execution plans using statistics and selects the cheapest.' },
      { n: '4', label: 'Store in Library Cache', desc: 'The finished cursor (parse tree + execution plan) is stored in the Shared SQL Area for reuse by any future matching SQL.' },
    ],

    softTitle: 'Soft Parse — SQL already in the cache',
    softDesc: 'When the Library Cache contains a matching SQL, Oracle skips steps 1–3 and reuses the stored cursor directly. CPU cost is negligible.',
    softNote: 'For a Soft Parse to occur, the SQL text must match exactly — including case, whitespace, and line breaks. "SELECT * FROM EMP" and "select * from emp" are treated as different statements, each triggering its own Hard Parse.',

    sharedPrivateTitle: 'Shared SQL Area vs Private SQL Area',
    sharedPrivateDesc: 'Every SQL execution uses two memory areas simultaneously. The Shared SQL Area in the SGA is shared by all sessions; the Private SQL Area in each PGA is independent per session.',
    sharedAreaLabel: 'Shared SQL Area',
    sharedAreaDesc: 'Parse tree, execution plan, optimization metadata — a read-only area shared by all sessions. Stored in the Library Cache.',
    privateAreaLabel: 'Private SQL Area',
    privateAreaDesc: 'Bind variable values and query execution state (Persistent Area + Runtime Area) — stored in each server process\'s PGA.',
    sharedPrivateNote: 'When 100 sessions run the same SQL, there is 1 Shared SQL Area and 100 Private SQL Areas (one per session). The Shared Pool makes SQL execution dramatically more memory-efficient.',

    // ── Child cursor ──
    childCursorTitle: 'Parent Cursor and Child Cursor',
    childCursorDesc: 'Cursors in the Library Cache are two-level structures. A Parent Cursor is the hash-bucket entry keyed on the SQL text. However, even if the SQL text is identical, the execution plan may differ based on execution environment — different schema, different optimizer parameters, different bind variable types. In those cases, Oracle adds a new Child Cursor under the same Parent.',
    childCursorItems: [
      { label: 'Parent Cursor', desc: 'The entry found by hashing the SQL text. Same text always maps to the same Parent.' },
      { label: 'Child Cursor #0', desc: 'The execution plan created by the first Hard Parse. In most cases this is the only child.' },
      { label: 'Child Cursor #N', desc: 'Added when schema, parameters, or bind types differ enough to require a separate execution plan.' },
    ],
    childCursorNote: 'A rapidly growing child cursor count (high Version Count) is a signal of Hard Parse storms. Check V$SQL.VERSION_COUNT to diagnose.',

    bindTitle: 'Bind Variables and the Shared Pool',
    bindDesc: 'To use the Shared Pool efficiently, use bind variables (:v1, :p1, etc.).',
    bindBadSql: `-- 3 Hard Parses (each literal value is a different SQL)
SELECT * FROM employees WHERE employee_id = 100;
SELECT * FROM employees WHERE employee_id = 101;
SELECT * FROM employees WHERE employee_id = 102;`,
    bindGoodSql: `-- 1 Hard Parse, then Soft Parse for every subsequent call
SELECT * FROM employees WHERE employee_id = :id;
-- :id = 100 → Soft Parse
-- :id = 101 → Soft Parse
-- :id = 102 → Soft Parse`,
    bindNote: 'Literal values embedded in SQL (100, 101, 102) cause Oracle to treat each as a distinct statement, triggering a Hard Parse every time. Switching to a bind variable makes the SQL text identical, so only the first execution Hard Parses — all subsequent calls are Soft Parses.',

    resultCacheTitle: 'Server Result Cache — caching the result itself',
    resultCacheP1: 'While the Library Cache stores execution plans, the Result Cache stores the actual result data from a query. When the same query arrives again, Oracle skips execution entirely and returns the cached result immediately.',
    resultCacheP2: 'If any table the query references is modified, Oracle automatically invalidates the relevant cache entry. Most effective for frequently read, rarely changed queries such as aggregate reports and lookup table scans.',
    resultCacheSql: `-- Request result caching with the RESULT_CACHE hint
SELECT /*+ RESULT_CACHE */ dept_id, COUNT(*) AS cnt
FROM   employees
GROUP  BY dept_id;`,
    resultCacheNote: 'Set RESULT_CACHE_MODE = FORCE to apply caching automatically to all queries. Check current cache entries in V$RESULT_CACHE_OBJECTS.',

    paramsTitle: 'Key Parameters',
    params: [
      { name: 'SHARED_POOL_SIZE', desc: 'Total Shared Pool size. Auto-tuned when ASMM is active (SGA_TARGET set).' },
      { name: 'SHARED_POOL_RESERVED_SIZE', desc: 'Reserved Pool size. Typically 10–30% of SHARED_POOL_SIZE.' },
      { name: 'RESULT_CACHE_MODE', desc: 'Result Cache behavior: OFF (default) / MANUAL (use hint) / FORCE (always cache).' },
    ],

    summaryTitle: 'Shared Pool — Key Takeaways',
    summaryItems: [
      'Library Cache: caches parsed cursors and execution plans — converts Hard Parses into Soft Parses',
      'Data Dictionary Cache: caches table/column/privilege metadata at row granularity',
      'Server Result Cache: caches the actual query result — returns it without re-executing',
      'Reserved Pool: reserved space for large allocations — prevents fragmentation failures',
      'Bind variables are the key to Shared Pool efficiency — literal SQL causes repeated Hard Parses',
    ],
  },
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ComponentCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  color: 'violet' | 'slate' | 'amber' | 'emerald'
}) {
  const cls = {
    violet: { bg: 'bg-purple/5', border: 'border-purple/30', badge: 'bg-purple/10 text-purple' },
    slate:  { bg: 'bg-paper-sunk',  border: 'border-line',  badge: 'bg-paper-sunk text-ink' },
    amber:  { bg: 'bg-amber/5',  border: 'border-amber/30',  badge: 'bg-amber/10 text-amber' },
    emerald:{ bg: 'bg-green/5',border: 'border-green/30',badge: 'bg-green/10 text-green' },
  }[color]

  return (
    <div className={cn('rounded-panel border p-4', cls.bg, cls.border)}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-card', cls.badge)}>{icon}</span>
        <span className="text-sm font-bold">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-ink-2">{desc}</p>
    </div>
  )
}

type ParseMode = 'hard' | 'soft'

function ParseSection({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  const [mode, setMode] = useState<ParseMode>('hard')

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(['hard', 'soft'] as ParseMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-card border px-4 py-2 text-xs font-bold transition-all',
              mode === m
                ? m === 'hard'
                  ? 'border-red/50 bg-red text-paper '
                  : 'border-green/50 bg-green text-paper '
                : 'border-line bg-paper text-ink-2 hover:text-ink',
            )}
          >
            {m === 'hard' ? t.hardTitle : t.softTitle}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden rounded-panel border bg-paper"
        >
          {mode === 'hard' ? (
            <>
              <div className="flex items-center gap-2.5 border-b bg-red/5 px-5 py-3">
                <span className="rounded bg-red px-2.5 py-0.5 text-xs font-bold text-paper">Hard Parse</span>
                <span className="text-sm font-bold text-ink">{t.hardDesc}</span>
              </div>
              <div className="space-y-0 divide-y divide-line/50">
                {t.hardSteps.map((s) => (
                  <div key={s.n} className="flex items-start gap-4 px-5 py-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red font-mono text-[11px] font-bold text-paper">
                      {s.n}
                    </span>
                    <div>
                      <div className="mb-0.5 text-sm font-semibold text-ink">{s.label}</div>
                      <div className="text-xs leading-relaxed text-ink-2">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 border-b bg-green/5 px-5 py-3">
                <span className="rounded bg-green px-2.5 py-0.5 text-xs font-bold text-paper">Soft Parse</span>
                <span className="text-sm font-bold text-ink">{t.softDesc}</span>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3 rounded-card border border-green/30 bg-green/5 px-4 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green font-mono text-[11px] font-bold text-paper">✓</span>
                  <span className="text-sm text-ink-2">{lang === 'ko' ? 'Library Cache 검색 → 커서 발견 → 재사용' : 'Library Cache search → cursor found → reuse'}</span>
                </div>
                <div className="rounded-card bg-rail px-4 py-3 text-xs text-ink-2 leading-relaxed">
                  💡 {t.softNote}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// SVG layout constants
const SP_W = 680
const SP_H = 420

// SGA box (left side)
const SGA_X = 24
const SGA_Y = 24
const SGA_W = 240
const SGA_H = 300

// Shared SQL Area inside SGA
const SHARED_X = SGA_X + 16
const SHARED_Y = SGA_Y + 44
const SHARED_W = SGA_W - 32
const SHARED_H = 220

// Parse tree + plan blocks inside Shared SQL Area
const BLOCK_Y1 = SHARED_Y + 44
const BLOCK_Y2 = SHARED_Y + 112
const BLOCK_Y3 = SHARED_Y + 168
const BLOCK_X = SHARED_X + 12
const BLOCK_W = SHARED_W - 24
const BLOCK_H = 36

// PGA boxes (right side) — 3 sessions
const PGA_X = 420
const PGA_W = 220
const PGA_H = 96
const PGA_GAP = 20
const PGA_SESSIONS = [
  { y: 24,                         label: 'Session 1' },
  { y: 24 + PGA_H + PGA_GAP,      label: 'Session 2' },
  { y: 24 + (PGA_H + PGA_GAP) * 2, label: 'Session 3' },
]

// Private SQL Area inside each PGA
const PRIV_X = PGA_X + 12
const PRIV_W = PGA_W - 24

// Arrow endpoints
const SHARED_RIGHT_X = SHARED_X + SHARED_W
const SHARED_MID_Y = SHARED_Y + SHARED_H / 2

function SharedPrivateSection({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  const isKo = lang === 'ko'

  return (
    <div className="space-y-4">
      {/* SVG Diagram */}
      <div className="overflow-x-auto rounded-panel border bg-paper">
        <svg
          viewBox={`0 0 ${SP_W} ${SP_H}`}
          width="100%"
          style={{ maxWidth: SP_W, display: 'block', margin: '0 auto' }}
        >
          <defs>
            <marker id="spArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--color-purple)" />
            </marker>
          </defs>

          {/* ── SGA box ── */}
          <rect x={SGA_X} y={SGA_Y} width={SGA_W} height={SGA_H} rx={10}
            fill="var(--color-paper-sunk)" stroke="var(--color-purple)" strokeWidth={1.5} strokeDasharray="6 3" />
          <text x={SGA_X + 12} y={SGA_Y + 22} fontFamily="var(--font-sans-active)" fontSize={9}
            fontWeight="bold" fill="var(--color-purple)" letterSpacing={1}>SGA — Library Cache</text>

          {/* ── Shared SQL Area box ── */}
          <rect x={SHARED_X} y={SHARED_Y} width={SHARED_W} height={SHARED_H} rx={7}
            fill="var(--color-rail)" stroke="var(--color-purple)" strokeWidth={1.5} />
          <text x={SHARED_X + 10} y={SHARED_Y + 18} fontFamily="var(--font-sans-active)" fontSize={8.5}
            fontWeight="bold" fill="var(--color-purple)">{t.sharedAreaLabel}</text>
          <text x={SHARED_X + 10} y={SHARED_Y + 30} fontFamily="var(--font-sans-active)" fontSize={7.5}
            fill="var(--color-purple)" opacity={0.7}>{isKo ? '(모든 세션 공유 · 읽기 전용)' : '(shared · read-only)'}</text>

          {/* Parse tree block */}
          <rect x={BLOCK_X} y={BLOCK_Y1} width={BLOCK_W} height={BLOCK_H} rx={4}
            fill="var(--color-rail)" stroke="var(--color-purple)" strokeWidth={1} />
          <text x={BLOCK_X + BLOCK_W / 2} y={BLOCK_Y1 + 17} fontFamily="var(--font-sans-active)" fontSize={8}
            fontWeight="bold" fill="var(--color-purple)" textAnchor="middle">
            {isKo ? 'Parse Tree (파싱 트리)' : 'Parse Tree'}
          </text>

          {/* Execution plan block */}
          <rect x={BLOCK_X} y={BLOCK_Y2} width={BLOCK_W} height={BLOCK_H} rx={4}
            fill="var(--color-rail)" stroke="var(--color-purple)" strokeWidth={1} />
          <text x={BLOCK_X + BLOCK_W / 2} y={BLOCK_Y2 + 17} fontFamily="var(--font-sans-active)" fontSize={8}
            fontWeight="bold" fill="var(--color-purple)" textAnchor="middle">
            {isKo ? 'Execution Plan (실행 계획)' : 'Execution Plan'}
          </text>

          {/* Optimization metadata block */}
          <rect x={BLOCK_X} y={BLOCK_Y3} width={BLOCK_W} height={BLOCK_H} rx={4}
            fill="var(--color-rail)" stroke="var(--color-purple)" strokeWidth={1} />
          <text x={BLOCK_X + BLOCK_W / 2} y={BLOCK_Y3 + 17} fontFamily="var(--font-sans-active)" fontSize={8}
            fontWeight="bold" fill="var(--color-purple)" textAnchor="middle">
            {isKo ? 'Optimization Info' : 'Optimization Info'}
          </text>

          {/* ── PGA boxes + Private SQL Areas ── */}
          {PGA_SESSIONS.map((sess, i) => {
            const privY = sess.y + 32
            const privH = PGA_H - 40
            const privMidY = privY + privH / 2

            // Arrow: from left edge of private area → right edge of shared area
            const arrowStartX = PRIV_X
            const arrowStartY = privMidY
            const arrowEndX = SHARED_RIGHT_X + 2
            const arrowEndY = SHARED_MID_Y + (i - 1) * 28

            // Cubic bezier: control points curve through the middle
            const cp1x = arrowStartX - 60
            const cp1y = arrowStartY
            const cp2x = arrowEndX + 60
            const cp2y = arrowEndY

            return (
              <g key={sess.label}>
                {/* PGA outer box */}
                <rect x={PGA_X} y={sess.y} width={PGA_W} height={PGA_H} rx={8}
                  fill="var(--color-rail)" stroke="var(--color-blue)" strokeWidth={1.5} strokeDasharray="5 3" />
                <text x={PGA_X + 12} y={sess.y + 18} fontFamily="var(--font-sans-active)" fontSize={8.5}
                  fontWeight="bold" fill="var(--color-blue)">PGA — {sess.label}</text>

                {/* Private SQL Area inner box */}
                <rect x={PRIV_X} y={privY} width={PRIV_W} height={privH} rx={5}
                  fill="var(--color-rail)" stroke="var(--color-blue)" strokeWidth={1} />
                <text x={PRIV_X + PRIV_W / 2} y={privY + 13} fontFamily="var(--font-sans-active)" fontSize={7.5}
                  fontWeight="bold" fill="var(--color-blue)" textAnchor="middle">{t.privateAreaLabel}</text>
                <text x={PRIV_X + PRIV_W / 2} y={privY + 25} fontFamily="var(--font-sans-active)" fontSize={7}
                  fill="var(--color-blue)" textAnchor="middle">
                  {isKo ? 'bind vars · exec state' : 'bind vars · exec state'}
                </text>

                {/* Arrow from Private → Shared */}
                <path
                  d={`M ${arrowStartX},${arrowStartY} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${arrowEndX},${arrowEndY}`}
                  fill="none"
                  stroke="var(--color-purple)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  markerEnd="url(#spArrow)"
                />

                {/* Pointer label on arrow */}
                <text
                  x={(arrowStartX + arrowEndX) / 2}
                  y={(arrowStartY + arrowEndY) / 2 - 5}
                  fontFamily="var(--font-sans-active)"
                  fontSize={7}
                  fill="var(--color-purple)"
                  textAnchor="middle"
                >
                  {isKo ? '포인터' : 'pointer'}
                </text>
              </g>
            )
          })}

          {/* ── Legend ── */}
          <rect x={SGA_X} y={376} width={14} height={8} rx={2}
            fill="var(--color-rail)" stroke="var(--color-purple)" strokeWidth={1} />
          <text x={SGA_X + 18} y={384} fontFamily="var(--font-sans-active)" fontSize={8}
            fill="var(--color-ink-2)">{isKo ? 'Shared SQL Area (1개)' : 'Shared SQL Area (×1)'}</text>

          <rect x={PGA_X} y={376} width={14} height={8} rx={2}
            fill="var(--color-rail)" stroke="var(--color-blue)" strokeWidth={1} />
          <text x={PGA_X + 18} y={384} fontFamily="var(--font-sans-active)" fontSize={8}
            fill="var(--color-ink-2)">{isKo ? 'Private SQL Area (세션마다 1개)' : 'Private SQL Area (×1 per session)'}</text>
        </svg>
      </div>

      {/* Description cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-card border-2 border-purple/30 bg-purple/5 px-4 py-3">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-purple">SGA · Library Cache</div>
          <div className="mb-1 text-sm font-bold text-purple">{t.sharedAreaLabel}</div>
          <p className="text-xs leading-relaxed text-ink-2">{t.sharedAreaDesc}</p>
        </div>
        <div className="rounded-card border-2 border-blue/30 bg-blue/5 px-4 py-3">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-blue">PGA · per session</div>
          <div className="mb-1 text-sm font-bold text-blue">{t.privateAreaLabel}</div>
          <p className="text-xs leading-relaxed text-ink-2">{t.privateAreaDesc}</p>
        </div>
      </div>

      <div className="rounded-card bg-purple/5 px-4 py-2.5 text-xs leading-relaxed text-ink-2 border border-purple/30">
        💡 {t.sharedPrivateNote}
      </div>
    </div>
  )
}

function ChildCursorSection({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  const isKo = lang === 'ko'

  // SVG layout
  const W = 640
  const H = 220

  // Parent cursor box
  const PAR_X = 40
  const PAR_Y = 40
  const PAR_W = 160
  const PAR_H = 48

  // Child cursor boxes
  const CHILD_Y = 140
  const CHILD_H = 48
  const CHILD_W = 140
  const children = [
    { x: 24,  label: 'Child #0', color: 'var(--color-purple)', bg: 'var(--color-rail)', border: 'var(--color-purple)', desc: isKo ? '기본 실행 계획' : 'default plan' },
    { x: 200, label: 'Child #1', color: 'var(--color-blue)', bg: 'var(--color-rail)', border: 'var(--color-blue)', desc: isKo ? '다른 스키마' : 'diff schema' },
    { x: 376, label: 'Child #2', color: 'var(--color-green)', bg: 'var(--color-line)', border: 'var(--color-green)', desc: isKo ? '다른 파라미터' : 'diff params' },
    { x: 490, label: 'Child #N', color: 'var(--color-red)', bg: 'var(--color-rail)', border: 'var(--color-red)', desc: isKo ? '…' : '…' },
  ]

  return (
    <div className="space-y-4">
      <Prose>{t.childCursorDesc}</Prose>

      {/* SVG */}
      <div className="overflow-x-auto rounded-panel border bg-paper">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0 auto' }}>
          <defs>
            <marker id="childArrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="var(--color-purple)" opacity={0.7} />
            </marker>
          </defs>

          {/* SQL text hash label */}
          <text x={PAR_X} y={PAR_Y - 10} fontFamily="var(--font-sans-active)" fontSize={8} fill="var(--color-ink-3)">
            hash({isKo ? 'SQL 텍스트' : 'SQL text'})
          </text>

          {/* Parent cursor box */}
          <rect x={PAR_X} y={PAR_Y} width={PAR_W} height={PAR_H} rx={7}
            fill="var(--color-rail)" stroke="var(--color-purple)" strokeWidth={2} />
          <text x={PAR_X + PAR_W / 2} y={PAR_Y + 18} fontFamily="var(--font-sans-active)" fontSize={9}
            fontWeight="bold" fill="var(--color-purple)" textAnchor="middle">Parent Cursor</text>
          <text x={PAR_X + PAR_W / 2} y={PAR_Y + 32} fontFamily="var(--font-sans-active)" fontSize={7.5}
            fill="var(--color-purple)" textAnchor="middle">
            {isKo ? '"SELECT * FROM emp WHERE …"' : '"SELECT * FROM emp WHERE …"'}
          </text>

          {/* Lines from parent to each child */}
          {children.map((c) => {
            const childMidX = c.x + CHILD_W / 2
            const parMidX = PAR_X + PAR_W / 2
            return (
              <line
                key={c.label}
                x1={parMidX} y1={PAR_Y + PAR_H}
                x2={childMidX} y2={CHILD_Y}
                stroke="var(--color-purple)" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.6}
                markerEnd="url(#childArrow)"
              />
            )
          })}

          {/* "Child Cursors" label */}
          <text x={PAR_X + PAR_W + 16} y={CHILD_Y + CHILD_H / 2 + 4} fontFamily="var(--font-sans-active)"
            fontSize={8} fill="var(--color-ink-3)" transform={`rotate(-90, ${PAR_X + PAR_W + 16}, ${CHILD_Y + CHILD_H / 2 + 4})`}>
          </text>

          {/* Child cursor boxes */}
          {children.map((c) => (
            <g key={c.label}>
              <rect x={c.x} y={CHILD_Y} width={CHILD_W} height={CHILD_H} rx={6}
                fill={c.bg} stroke={c.border} strokeWidth={1.5} />
              <text x={c.x + CHILD_W / 2} y={CHILD_Y + 18} fontFamily="var(--font-sans-active)" fontSize={8.5}
                fontWeight="bold" fill={c.color} textAnchor="middle">{c.label}</text>
              <text x={c.x + CHILD_W / 2} y={CHILD_Y + 32} fontFamily="var(--font-sans-active)" fontSize={7.5}
                fill={c.color} textAnchor="middle" opacity={0.8}>{c.desc}</text>
            </g>
          ))}

          {/* VERSION_COUNT label */}
          <text x={W - 12} y={CHILD_Y + CHILD_H / 2 + 4} fontFamily="var(--font-sans-active)" fontSize={7.5}
            fill="var(--color-ink-2)" textAnchor="end">
            {isKo ? '→ VERSION_COUNT (V$SQL)' : '→ VERSION_COUNT (V$SQL)'}
          </text>
        </svg>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {t.childCursorItems.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-card border bg-paper px-4 py-2.5">
            <code className="mt-0.5 shrink-0 rounded bg-purple/10 px-2 py-0.5 font-mono text-[10px] font-bold text-purple">
              {item.label}
            </code>
            <p className="text-xs leading-relaxed text-ink-2">{item.desc}</p>
          </div>
        ))}
      </div>

      <InfoBox variant="warning">{t.childCursorNote}</InfoBox>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function SharedPoolSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]

  return (
    <div className="mx-auto max-w-screen-2xl px-10 py-10">
      <ChapterTitle title={t.title} subtitle={t.subtitle} />

      <OracleArchitectureDiagram scope="sga" highlightIds={['shared-pool']} />

      {/* ── What is Shared Pool ── */}
      <SectionTitle>{t.whatTitle}</SectionTitle>
      <div className="space-y-2 mb-6">
        <Prose>{t.whatP1}</Prose>
        <Prose>{t.whatP2}</Prose>
        <Prose>{t.whatP3}</Prose>
      </div>

      <Divider />

      {/* ── Components ── */}
      <SectionTitle>{t.componentsTitle}</SectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ComponentCard
          icon={<IconSearch size={14} stroke={1.5} />}
          title={t.libTitle}
          desc={t.libDesc}
          color="violet"
        />
        <ComponentCard
          icon={<IconTable size={14} stroke={1.5} />}
          title={t.dictTitle}
          desc={t.dictDesc}
          color="slate"
        />
        <ComponentCard
          icon={<IconBolt size={14} stroke={1.5} />}
          title={t.resultTitle}
          desc={t.resultDesc}
          color="amber"
        />
        <ComponentCard
          icon={<IconBox size={14} stroke={1.5} />}
          title={t.reservedTitle}
          desc={t.reservedDesc}
          color="emerald"
        />
      </div>

      <Divider />

      {/* ── Parse lifecycle ── */}
      <SectionTitle>{t.parseTitle}</SectionTitle>
      <Prose className="mb-4">{t.parseDesc}</Prose>
      <ParseSection lang={lang} />

      <Divider />

      {/* ── Shared vs Private SQL Area ── */}
      <SectionTitle>{t.sharedPrivateTitle}</SectionTitle>
      <Prose className="mb-4">{t.sharedPrivateDesc}</Prose>
      <SharedPrivateSection lang={lang} />

      <Divider />

      {/* ── Child Cursor ── */}
      <SectionTitle>{t.childCursorTitle}</SectionTitle>
      <ChildCursorSection lang={lang} />

      <Divider />

      {/* ── Bind variables ── */}
      <SectionTitle>{t.bindTitle}</SectionTitle>
      <Prose className="mb-4">{t.bindDesc}</Prose>
      <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SqlBlock
          badge={lang === 'ko' ? '비권장' : 'Avoid'}
          badgeColor="rose"
          desc={lang === 'ko' ? '리터럴 값 → Hard Parse 반복' : 'Literal values → repeated Hard Parse'}
          sql={t.bindBadSql}
        />
        <SqlBlock
          badge={lang === 'ko' ? '권장' : 'Preferred'}
          badgeColor="emerald"
          desc={lang === 'ko' ? '바인드 변수 → Soft Parse 재사용' : 'Bind variables → Soft Parse reuse'}
          sql={t.bindGoodSql}
        />
      </div>
      <InfoBox variant="note">{t.bindNote}</InfoBox>

      <Divider />

      {/* ── Result Cache ── */}
      <SectionTitle>{t.resultCacheTitle}</SectionTitle>
      <Prose className="mb-2">{t.resultCacheP1}</Prose>
      <Prose className="mb-4">{t.resultCacheP2}</Prose>
      <SqlBlock sql={t.resultCacheSql} />
      <div className="mt-3">
        <InfoBox variant="tip">{t.resultCacheNote}</InfoBox>
      </div>

      <Divider />

      {/* ── Parameters ── */}
      <SectionTitle>{t.paramsTitle}</SectionTitle>
      <div className="mb-6 overflow-hidden rounded-panel border bg-paper">
        {t.params.map((p, i) => (
          <div key={p.name} className={cn('flex items-start gap-4 px-5 py-3', i > 0 && 'border-t')}>
            <code className="mt-0.5 shrink-0 rounded bg-purple/10 px-2 py-0.5 font-mono text-[11px] font-bold text-purple">
              {p.name}
            </code>
            <p className="text-xs leading-relaxed text-ink-2">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Summary ── */}
      <div className="rounded-panel border border-line border-l-[3px] border-l-purple bg-paper-sunk px-6 py-5">
        <div className="mb-3"><SubTitle>{t.summaryTitle}</SubTitle></div>
        <ul className="space-y-1.5">
          {t.summaryItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
