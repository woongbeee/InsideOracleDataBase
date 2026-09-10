import { useSimulationStore } from '@/store/simulationStore'
import {
  ChapterTitle, SectionTitle, SubTitle, Prose, InfoBox, Divider, SqlBlock,
} from '../../../../shared'
import { OracleArchitectureDiagram } from '../../../shared/OracleArchitectureDiagram'
import { cn } from '@/lib/utils'
import {
  IconDatabase,
  IconSettings,
  IconServer,
  IconCpu,
  IconBolt,
} from '@tabler/icons-react'

// ── Translation strings ────────────────────────────────────────────────────

const T = {
  ko: {
    title: 'Large Pool',
    subtitle: 'RMAN·병렬 쿼리·공유 서버 UGA를 위한 선택적 SGA 메모리 영역',

    // ── What is ──
    whatTitle: 'Large Pool이 뭐예요?',
    whatP1: 'Large Pool은 SGA 안에 선택적(optional)으로 구성하는 메모리 영역이에요. Shared Pool에 할당하기엔 지나치게 큰 메모리 블록이 필요한 작업을 위해 설계됐어요.',
    whatP2: 'Shared Pool이 SQL 파싱 결과나 딕셔너리 메타데이터 같은 작은 단위를 LRU 방식으로 관리하는 것과 달리, Large Pool은 LRU 리스트가 없어요. 할당된 메모리는 세션이나 작업이 명시적으로 해제할 때까지 유지되고, 해제되는 즉시 다른 프로세스가 곧바로 재사용해요.',
    whatP3: 'Large Pool을 따로 두는 이유는 단편화(fragmentation) 방지예요. RMAN 백업이나 병렬 쿼리처럼 수 MB 단위의 버퍼가 필요한 작업이 Shared Pool 안에서 메모리를 조각낼 경우, SQL 파싱 공간이 줄어들어 Hard Parse가 폭증할 수 있어요. Large Pool은 이런 대형 할당을 격리해서 Shared Pool을 보호해요.',

    // ── Users ──
    usersTitle: 'Large Pool을 사용하는 구성 요소',
    users: [
      {
        icon: 'db',
        label: 'RMAN (Recovery Manager)',
        color: 'emerald' as const,
        desc: 'RMAN I/O 자식 프로세스가 백업·복구 작업에 사용하는 버퍼를 Large Pool에서 할당해요. 백업 스트림 하나당 수십 MB가 필요하므로 Shared Pool과 분리하는 것이 필수예요.',
      },
      {
        icon: 'cpu',
        label: '병렬 실행 (Parallel Execution)',
        color: 'blue' as const,
        desc: '병렬 쿼리 코디네이터와 병렬 서버 프로세스 간 데이터를 교환하는 메시지 버퍼를 Large Pool에서 할당해요. 병렬 도(DOP)가 높을수록 버퍼 수가 늘어나요.',
      },
      {
        icon: 'server',
        label: '공유 서버 UGA (Shared Server)',
        color: 'violet' as const,
        desc: 'Dedicated Server 모드에서는 UGA(User Global Area)가 PGA에 위치하지만, Shared Server 모드에서는 UGA를 SGA 안에 두어야 해요. Large Pool이 설정되어 있으면 UGA가 Large Pool에, 없으면 Shared Pool에 할당돼요.',
      },
      {
        icon: 'bolt',
        label: '지연 삽입 (Deferred Insert)',
        color: 'amber' as const,
        desc: 'MEMOPTIMIZE_WRITE 힌트를 사용하는 IoT(사물인터넷) 스타일의 고속 INSERT 버퍼를 Large Pool에서 관리해요. 삽입이 버퍼에 쌓이면 SMCO/Wnnn 백그라운드 프로세스가 비동기로 디스크에 써요.',
      },
    ],

    // ── vs Shared Pool ──
    vsTitle: 'Shared Pool과의 차이',
    vsDesc: 'Large Pool과 Shared Pool은 모두 SGA 안에 있지만, 메모리 관리 방식이 완전히 달라요.',
    vsRows: [
      { attr: 'LRU 리스트', shared: '있음 — 오래된 항목 자동 해제', large: '없음 — 명시 해제 전까지 유지' },
      { attr: '할당 단위', shared: '작은 단위 (SQL 커서, 딕셔너리 행 등)', large: '큰 단위 (수백 KB ~ 수십 MB)' },
      { attr: '주요 용도', shared: 'SQL 파싱, PL/SQL, 딕셔너리 캐시', large: 'RMAN, 병렬 쿼리, UGA, 지연 삽입' },
      { attr: '단편화 위험', shared: '높음 (대형 할당 시)', large: '낮음 (대형 할당 전용으로 격리)' },
      { attr: '필수 여부', shared: '필수', large: '선택 (없으면 Shared Pool 대신 사용)' },
    ],
    vsAttr: '항목',
    vsShared: 'Shared Pool',
    vsLarge: 'Large Pool',

    // ── Deferred Insert ──
    deferredTitle: '지연 삽입(Deferred Insert) 메커니즘',
    deferredDesc: 'MEMOPTIMIZE_WRITE 힌트는 IoT 기기처럼 초당 수천 건의 INSERT가 발생하는 환경에서 쓰이는 "fire-and-forget" 삽입 방식이에요.',
    deferredSteps: [
      { n: '1', label: '버퍼 할당', desc: '인스턴스 기동 후 첫 MEMOPTIMIZE_WRITE INSERT 시점에 Large Pool에서 버퍼를 할당해요.' },
      { n: '2', label: 'Large Pool에 쓰기', desc: '서버 프로세스가 데이터를 Large Pool 버퍼에 써요. 각 쓰기에 세션별 시퀀스 번호가 찍혀요.' },
      { n: '3', label: '비동기 디스크 기록', desc: 'SMCO와 Wnnn 헬퍼 프로세스가 버퍼 데이터를 표준 데이터 블록 포맷으로 비동기 기록해요.' },
    ],
    deferredNote: '지연 삽입은 자동 COMMIT되며 ROLLBACK이 불가능해요. 또한 제약 조건(constraints)과 인덱스 유지보수는 Large Pool 쓰기 시점이 아닌 디스크 기록 시점에 수행돼요. 성능 극대화를 위해 Oracle은 제약 조건 비활성화를 권장해요.',
    deferredSql: `-- MEMOPTIMIZE_WRITE 힌트 사용 예
INSERT /*+ MEMOPTIMIZE_WRITE */ INTO sensor_data
  (sensor_id, ts, value)
VALUES (:sid, :ts, :val);
-- 자동 COMMIT, ROLLBACK 불가`,

    // ── No LRU ──
    noLruTitle: 'LRU 없음 — 메모리 할당 규칙',
    noLruP1: 'Large Pool은 LRU 리스트가 없기 때문에, Oracle이 멋대로 기존 내용을 밀어내고 새 내용을 덮어쓰는 일이 없어요.',
    noLruP2: '세션이나 백그라운드 프로세스가 메모리를 해제하는 즉시 그 공간을 다른 요청이 바로 가져갈 수 있어요. 반대로 Large Pool이 꽉 찬 상태에서 추가 할당이 필요하면 ORA-04031 에러가 발생해요 — Shared Pool과 달리 자동으로 공간을 만들어주지 않거든요.',
    noLruNote: 'LARGE_POOL_SIZE가 설정되어 있지 않으면(0이거나 미설정) RMAN·병렬 쿼리·UGA가 전부 Shared Pool을 써요. 그러면 Shared Pool 단편화가 심해져서 결국 ORA-04031이 Shared Pool에서 터질 수 있어요. RMAN을 사용하거나 병렬 처리를 자주 쓴다면 Large Pool은 꼭 설정해 두세요.',

    // ── Parameters ──
    paramsTitle: '주요 파라미터',
    params: [
      { name: 'LARGE_POOL_SIZE', desc: 'Large Pool 크기를 직접 지정해요. SGA_TARGET이 설정된 경우(ASMM) Oracle이 알아서 조정해 줘요.' },
      { name: 'PARALLEL_EXECUTION_MESSAGE_SIZE', desc: '병렬 실행 메시지 버퍼 하나의 크기예요. 기본값은 16 KB이며 Large Pool에서 할당돼요.' },
      { name: 'MEMOPTIMIZE_POOL_SIZE', desc: '지연 삽입(MEMOPTIMIZE_WRITE) 전용으로 Large Pool 안에 예약해 둘 영역 크기예요.' },
    ],

    // ── Summary ──
    summaryTitle: 'Large Pool 핵심 정리',
    summaryItems: [
      'Large Pool은 선택적 SGA 영역이에요 — 없으면 해당 메모리가 Shared Pool에서 할당돼요',
      'LRU 리스트 없음 — 세션·프로세스가 직접 해제하기 전까지 메모리가 그대로 유지돼요',
      '주요 사용자: RMAN 버퍼, 병렬 쿼리 메시지 버퍼, 공유 서버 UGA, 지연 삽입 버퍼',
      'Shared Pool을 단편화로부터 보호해요 — 대형 할당을 여기서 격리하거든요',
      'RMAN·병렬 처리 환경이라면 LARGE_POOL_SIZE 설정은 필수예요',
    ],
  },

  en: {
    title: 'Large Pool',
    subtitle: 'Optional SGA area for RMAN, parallel query, and shared server UGA',

    whatTitle: 'What is the Large Pool?',
    whatP1: 'The Large Pool is an optional memory area within the SGA designed for memory allocations that are too large to be appropriate for the Shared Pool.',
    whatP2: 'Unlike the Shared Pool, which manages small units (SQL cursors, dictionary rows) with an LRU list, the Large Pool has no LRU list. Memory allocated from it is held until the session or process explicitly releases it — and as soon as it is freed, other processes can use it immediately.',
    whatP3: 'The reason for a separate Large Pool is to prevent fragmentation. Operations like RMAN backup or parallel queries require buffers of several megabytes. If those allocations were made inside the Shared Pool, they would fragment the space available for SQL parsing, potentially causing Hard Parse storms. The Large Pool isolates large allocations and protects the Shared Pool.',

    usersTitle: 'Components That Use the Large Pool',
    users: [
      {
        icon: 'db',
        label: 'RMAN (Recovery Manager)',
        color: 'emerald' as const,
        desc: 'RMAN I/O slave processes allocate their backup and recovery buffers from the Large Pool. Each backup stream may require tens of megabytes, making separation from the Shared Pool essential.',
      },
      {
        icon: 'cpu',
        label: 'Parallel Execution',
        color: 'blue' as const,
        desc: 'Message buffers exchanged between the parallel query coordinator and parallel server processes are allocated from the Large Pool. More processes (higher DOP) means more buffers.',
      },
      {
        icon: 'server',
        label: 'Shared Server UGA',
        color: 'violet' as const,
        desc: 'In Dedicated Server mode, the UGA lives in the PGA. In Shared Server mode, the UGA must reside in the SGA. If a Large Pool exists, UGA is allocated there; otherwise it falls back to the Shared Pool.',
      },
      {
        icon: 'bolt',
        label: 'Deferred Inserts',
        color: 'amber' as const,
        desc: 'Buffers for MEMOPTIMIZE_WRITE "fire-and-forget" inserts (IoT workloads) are managed in the Large Pool. Once buffered, SMCO/Wnnn background processes flush them to disk asynchronously.',
      },
    ],

    vsTitle: 'Large Pool vs Shared Pool',
    vsDesc: 'Both live inside the SGA, but their memory management models are completely different.',
    vsRows: [
      { attr: 'LRU list', shared: 'Yes — old entries aged out automatically', large: 'No — held until explicitly freed' },
      { attr: 'Allocation unit', shared: 'Small (SQL cursors, dictionary rows)', large: 'Large (hundreds of KB – tens of MB)' },
      { attr: 'Primary uses', shared: 'SQL parsing, PL/SQL, dictionary cache', large: 'RMAN, parallel query, UGA, deferred inserts' },
      { attr: 'Fragmentation risk', shared: 'High (from large allocations)', large: 'Low (large allocations isolated here)' },
      { attr: 'Required', shared: 'Mandatory', large: 'Optional (falls back to Shared Pool if absent)' },
    ],
    vsAttr: 'Attribute',
    vsShared: 'Shared Pool',
    vsLarge: 'Large Pool',

    deferredTitle: 'Deferred Insert Mechanism',
    deferredDesc: 'The MEMOPTIMIZE_WRITE hint enables "fire-and-forget" inserts for environments with thousands of inserts per second, such as IoT devices.',
    deferredSteps: [
      { n: '1', label: 'Buffer allocation', desc: 'On the first MEMOPTIMIZE_WRITE insert after instance startup, buffers are allocated from the Large Pool.' },
      { n: '2', label: 'Write to Large Pool', desc: 'The server process writes data into the Large Pool buffer, stamping each write with a session-specific sequence number.' },
      { n: '3', label: 'Async flush to disk', desc: 'SMCO and Wnnn helper processes flush the buffered data to disk asynchronously in the standard data block format.' },
    ],
    deferredNote: 'Deferred inserts are automatically committed and cannot be rolled back. Constraint validation and index maintenance occur at disk-write time, not at the Large Pool write. Oracle recommends disabling constraints for maximum performance.',
    deferredSql: `-- Using the MEMOPTIMIZE_WRITE hint
INSERT /*+ MEMOPTIMIZE_WRITE */ INTO sensor_data
  (sensor_id, ts, value)
VALUES (:sid, :ts, :val);
-- Auto-committed; ROLLBACK not possible`,

    noLruTitle: 'No LRU — Memory Allocation Rules',
    noLruP1: 'Because the Large Pool has no LRU list, Oracle never silently evicts existing content to make room for new allocations.',
    noLruP2: 'As soon as a session or background process frees memory, that space becomes immediately available to the next requester. If the Large Pool is full and a new allocation is needed, Oracle raises ORA-04031 — unlike the Shared Pool, it does not create space automatically.',
    noLruNote: 'If LARGE_POOL_SIZE is not set, RMAN, parallel query, and shared server UGA all use the Shared Pool instead. This leads to severe Shared Pool fragmentation and ORA-04031 errors in the Shared Pool. If you use RMAN or run parallel queries frequently, always configure LARGE_POOL_SIZE.',

    paramsTitle: 'Key Parameters',
    params: [
      { name: 'LARGE_POOL_SIZE', desc: 'Sets the Large Pool size explicitly. Auto-tuned by Oracle when SGA_TARGET is set (ASMM).' },
      { name: 'PARALLEL_EXECUTION_MESSAGE_SIZE', desc: 'Size of a single parallel execution message buffer. Defaults to 16 KB; allocated from the Large Pool.' },
      { name: 'MEMOPTIMIZE_POOL_SIZE', desc: 'Reserved portion of the Large Pool for deferred inserts (MEMOPTIMIZE_WRITE).' },
    ],

    summaryTitle: 'Large Pool — Key Takeaways',
    summaryItems: [
      'Optional SGA area — if absent, allocations fall back to the Shared Pool',
      'No LRU list — memory is held until explicitly released by the session or process',
      'Primary users: RMAN I/O buffers, parallel query message buffers, shared server UGA, deferred inserts',
      'Protects the Shared Pool from fragmentation by isolating large allocations',
      'Always configure LARGE_POOL_SIZE when using RMAN or parallel query',
    ],
  },
}

// ── Sub-components ─────────────────────────────────────────────────────────

const ICON_MAP = {
  db:     <IconDatabase size={14} stroke={1.5} />,
  cpu:    <IconCpu size={14} stroke={1.5} />,
  server: <IconServer size={14} stroke={1.5} />,
  bolt:   <IconBolt size={14} stroke={1.5} />,
  settings: <IconSettings size={14} stroke={1.5} />,
}

const COLOR_CLS = {
  emerald: { bg: 'bg-green/5', border: 'border-green/30', badge: 'bg-green/10 text-green' },
  blue:    { bg: 'bg-blue/5',    border: 'border-blue/30',    badge: 'bg-blue/10 text-blue' },
  violet:  { bg: 'bg-purple/5',  border: 'border-purple/30',  badge: 'bg-purple/10 text-purple' },
  amber:   { bg: 'bg-amber/5',   border: 'border-amber/30',   badge: 'bg-amber/10 text-amber' },
}

function UserCard({
  icon, label, desc, color,
}: {
  icon: string
  label: string
  desc: string
  color: keyof typeof COLOR_CLS
}) {
  const cls = COLOR_CLS[color]
  return (
    <div className={cn('rounded-panel border p-4', cls.bg, cls.border)}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-card', cls.badge)}>
          {ICON_MAP[icon as keyof typeof ICON_MAP]}
        </span>
        <span className="text-sm font-bold">{label}</span>
      </div>
      <p className="text-xs leading-relaxed text-ink-2">{desc}</p>
    </div>
  )
}

// SVG diagram: Shared Pool (top) vs Large Pool (bottom), stacked layout
function LargePoolDiagram({ lang }: { lang: 'ko' | 'en' }) {
  const isKo = lang === 'ko'

  // ── layout — all heights computed bottom-up so nothing clips ──────────
  const W    = 600
  const PAD  = 16
  const BOX_X = PAD + 12
  const BOX_W = W - PAD * 2 - 24

  // Shared Pool block
  const SP_Y       = PAD + 36   // room for SGA label
  const SP_INNER_H = 56
  const SP_H       = 24 + 16 + SP_INNER_H + 20  // title + subtitle + inner + padding = 116

  const GAP = 14

  // Large Pool block
  const LP_Y       = SP_Y + SP_H + GAP
  const LP_ROW_H   = 30
  const LP_ROW_GAP = 8
  const LP_ROWS = [
    { label: isKo ? 'RMAN 버퍼'      : 'RMAN buffers',       color: 'var(--color-line)', stroke: 'var(--color-green)' },
    { label: isKo ? '병렬 쿼리 버퍼'  : 'Parallel msg buf',   color: 'var(--color-rail)', stroke: 'var(--color-blue)' },
    { label: isKo ? '공유 서버 UGA'   : 'Shared Server UGA',  color: 'var(--color-rail)', stroke: 'var(--color-purple)' },
    { label: isKo ? '지연 삽입'       : 'Deferred Insert',    color: 'var(--color-amber)', stroke: 'var(--color-amber)' },
  ]
  const LP_ROWS_H = LP_ROWS.length * LP_ROW_H + (LP_ROWS.length - 1) * LP_ROW_GAP  // 156
  const LP_H      = 24 + 16 + LP_ROWS_H + 24   // title + subtitle + rows + padding = 220

  // note line
  const NOTE_Y = LP_Y + LP_H + 18

  // SGA outer & total SVG height
  const SGA_H = NOTE_Y + 14 - PAD
  const H     = SGA_H + PAD + 10

  return (
    <div className="overflow-x-auto rounded-panel border bg-paper">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0 auto' }}>

        {/* SGA outer */}
        <rect x={PAD} y={PAD} width={W - PAD * 2} height={SGA_H} rx={12}
          fill="var(--color-paper-sunk)" stroke="var(--color-ink-3)" strokeWidth={1.5} strokeDasharray="7 4" />
        <text x={PAD + 14} y={PAD + 22} fontFamily="var(--font-sans-active)" fontSize={11}
          fontWeight="bold" fill="var(--color-ink-2)" letterSpacing={1}>SGA</text>

        {/* ── Shared Pool ── */}
        <rect x={BOX_X} y={SP_Y} width={BOX_W} height={SP_H} rx={8}
          fill="var(--color-rail)" stroke="var(--color-purple)" strokeWidth={2} />
        <text x={BOX_X + 16} y={SP_Y + 22} fontFamily="var(--font-sans-active)" fontSize={13}
          fontWeight="bold" fill="var(--color-purple)">Shared Pool</text>
        <text x={BOX_X + 16} y={SP_Y + 38} fontFamily="var(--font-sans-active)" fontSize={10}
          fill="var(--color-purple)" opacity={0.85}>
          {isKo ? 'SQL 커서 · 딕셔너리 · PL/SQL' : 'SQL cursors · dictionary · PL/SQL'}
        </text>
        {/* LRU inner block */}
        <rect x={BOX_X + 16} y={SP_Y + 48} width={BOX_W - 32} height={SP_INNER_H} rx={5}
          fill="var(--color-rail)" stroke="var(--color-purple)" strokeWidth={1} />
        <text x={BOX_X + BOX_W / 2} y={SP_Y + 48 + SP_INNER_H / 2 - 6} fontFamily="var(--font-sans-active)"
          fontSize={12} fontWeight="bold" fill="var(--color-purple)" textAnchor="middle">
          LRU list
        </text>
        <text x={BOX_X + BOX_W / 2} y={SP_Y + 48 + SP_INNER_H / 2 + 12} fontFamily="var(--font-sans-active)"
          fontSize={10} fill="var(--color-purple)" textAnchor="middle">
          {isKo ? '오래된 항목 자동 해제' : 'old entries aged out automatically'}
        </text>

        {/* ── Large Pool ── */}
        <rect x={BOX_X} y={LP_Y} width={BOX_W} height={LP_H} rx={8}
          fill="var(--color-rail)" stroke="var(--color-green)" strokeWidth={2} />
        <text x={BOX_X + 16} y={LP_Y + 22} fontFamily="var(--font-sans-active)" fontSize={13}
          fontWeight="bold" fill="var(--color-green)">Large Pool</text>
        {/* No LRU badge */}
        <rect x={BOX_X + BOX_W - 90} y={LP_Y + 8} width={74} height={22} rx={5}
          fill="var(--color-line)" stroke="var(--color-green)" strokeWidth={1.5} />
        <text x={BOX_X + BOX_W - 53} y={LP_Y + 23} fontFamily="var(--font-sans-active)" fontSize={10}
          fontWeight="bold" fill="var(--color-green)" textAnchor="middle">No LRU</text>
        <text x={BOX_X + 16} y={LP_Y + 40} fontFamily="var(--font-sans-active)" fontSize={10}
          fill="var(--color-green)" opacity={0.85}>
          {isKo ? '세션·프로세스가 해제할 때까지 유지' : 'held until session / process frees it'}
        </text>
        {/* rows */}
        {LP_ROWS.map((row, i) => {
          const ry = LP_Y + 52 + i * (LP_ROW_H + LP_ROW_GAP)
          return (
            <g key={row.label}>
              <rect x={BOX_X + 16} y={ry} width={BOX_W - 32} height={LP_ROW_H} rx={5}
                fill={row.color} stroke={row.stroke} strokeWidth={1.2} />
              <text x={BOX_X + BOX_W / 2} y={ry + LP_ROW_H / 2 + 5} fontFamily="var(--font-sans-active)"
                fontSize={11} fontWeight="bold" fill="var(--color-ink)" textAnchor="middle">
                {row.label}
              </text>
            </g>
          )
        })}

        {/* note */}
        <text x={BOX_X} y={NOTE_Y} fontFamily="var(--font-sans-active)" fontSize={9.5} fill="var(--color-ink-3)">
          {isKo
            ? '* LARGE_POOL_SIZE 미설정 시 위 항목들이 모두 Shared Pool에서 할당됨'
            : '* Without LARGE_POOL_SIZE, all items above are allocated from the Shared Pool'}
        </text>
      </svg>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function LargePoolSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]

  return (
    <div className="mx-auto max-w-screen-2xl px-10 py-10">
      <ChapterTitle title={t.title} subtitle={t.subtitle} />

      <OracleArchitectureDiagram scope="sga" highlightIds={['large-pool']} />

      {/* ── What is ── */}
      <SectionTitle>{t.whatTitle}</SectionTitle>
      <div className="mb-6 space-y-2">
        <Prose>{t.whatP1}</Prose>
        <Prose>{t.whatP2}</Prose>
        <Prose>{t.whatP3}</Prose>
      </div>

      <Divider />

      {/* ── Users ── */}
      <SectionTitle>{t.usersTitle}</SectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {t.users.map((u) => (
          <UserCard key={u.label} icon={u.icon} label={u.label} desc={u.desc} color={u.color} />
        ))}
      </div>

      <Divider />

      {/* ── vs Shared Pool ── */}
      <SectionTitle>{t.vsTitle}</SectionTitle>
      <Prose className="mb-4">{t.vsDesc}</Prose>
      <LargePoolDiagram lang={lang} />
      <div className="mt-4 mb-6 overflow-hidden rounded-panel border bg-paper">
        {/* Header */}
        <div className="grid grid-cols-3 border-b bg-rail px-4 py-2">
          {[t.vsAttr, t.vsShared, t.vsLarge].map((h) => (
            <div key={h} className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-2">{h}</div>
          ))}
        </div>
        {t.vsRows.map((row, i) => (
          <div key={row.attr} className={cn('grid grid-cols-3 px-4 py-2.5 text-xs', i > 0 && 'border-t')}>
            <div className="font-semibold text-ink">{row.attr}</div>
            <div className="text-ink-2">{row.shared}</div>
            <div className="font-medium text-green">{row.large}</div>
          </div>
        ))}
      </div>

      <Divider />

      {/* ── No LRU ── */}
      <SectionTitle>{t.noLruTitle}</SectionTitle>
      <div className="mb-2 space-y-2">
        <Prose>{t.noLruP1}</Prose>
        <Prose>{t.noLruP2}</Prose>
      </div>
      <InfoBox variant="warning">{t.noLruNote}</InfoBox>

      <Divider />

      {/* ── Deferred Insert ── */}
      <SectionTitle>{t.deferredTitle}</SectionTitle>
      <Prose className="mb-4">{t.deferredDesc}</Prose>

      <div className="mb-4 overflow-hidden rounded-panel border bg-paper">
        {t.deferredSteps.map((s, i) => (
          <div key={s.n} className={cn('flex items-start gap-4 px-5 py-3.5', i > 0 && 'border-t')}>
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber font-mono text-[11px] font-bold text-paper">
              {s.n}
            </span>
            <div>
              <div className="mb-0.5 text-sm font-semibold text-ink">{s.label}</div>
              <div className="text-xs leading-relaxed text-ink-2">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <SqlBlock sql={t.deferredSql} />
      <div className="mt-3">
        <InfoBox variant="note">{t.deferredNote}</InfoBox>
      </div>

      <Divider />

      {/* ── Parameters ── */}
      <SectionTitle>{t.paramsTitle}</SectionTitle>
      <div className="mb-6 overflow-hidden rounded-panel border bg-paper">
        {t.params.map((p, i) => (
          <div key={p.name} className={cn('flex items-start gap-4 px-5 py-3', i > 0 && 'border-t')}>
            <code className="mt-0.5 shrink-0 rounded bg-green/10 px-2 py-0.5 font-mono text-[11px] font-bold text-green">
              {p.name}
            </code>
            <p className="text-xs leading-relaxed text-ink-2">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Summary ── */}
      <div className="rounded-panel border border-line border-l-[3px] border-l-green bg-paper-sunk px-6 py-5">
        <div className="mb-3"><SubTitle>{t.summaryTitle}</SubTitle></div>
        <ul className="space-y-1.5">
          {t.summaryItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
