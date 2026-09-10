import { useSimulationStore } from '@/store/simulationStore'
import {
  ChapterTitle, SectionTitle, SubTitle, Prose, InfoBox, Divider,
} from '../../../shared'
import { cn } from '@/lib/utils'
import { OracleArchitectureDiagram } from '../../shared/OracleArchitectureDiagram'
import {
  IconDatabase,
  IconSortAscending,
  IconArrowMerge,
  IconStack2,
  IconServer,
  IconUsers,
} from '@tabler/icons-react'

// ── Translation strings ────────────────────────────────────────────────────

const T = {
  ko: {
    title: 'PGA',
    subtitle: '서버 프로세스가 혼자 쓰는 전용 메모리 영역',

    whatTitle: 'PGA가 뭐예요?',
    whatP1: 'PGA(Program Global Area)는 서버 프로세스나 백그라운드 프로세스 하나가 독차지하는 비공개 메모리 영역이에요. SGA가 모든 세션이 함께 쓰는 공용 메모리라면, PGA는 프로세스마다 독립적으로 주어지는 나만의 전용 작업 공간이에요.',
    whatP2: '직원이 자기 책상 한쪽을 비워 임시 작업대로 쓰는 것처럼, 서버 프로세스는 SQL을 처리하는 동안 PGA를 쓰다가 세션이 끊기면 OS에 돌려줘요. 다른 프로세스는 이 공간에 절대 접근할 수 없어요.',
    whatP3: '인스턴스 안의 PGA를 전부 합친 걸 Instance PGA라고 불러요. 초기화 파라미터 PGA_AGGREGATE_TARGET으로 전체 크기 목표치를 설정하면, 개별 PGA 크기는 Oracle이 알아서 자동으로 조정해 줘요.',

    componentsTitle: 'PGA 구성 요소',
    components: [
      {
        icon: 'stack',
        color: 'violet' as const,
        label: 'Private SQL Area',
        desc: '파싱된 SQL과 세션별 실행 정보를 저장하는 영역이에요. Persistent Area(바인드 변수 값)와 Runtime Area(실행 상태)로 나뉩니다.',
      },
      {
        icon: 'sort',
        color: 'blue' as const,
        label: 'SQL Work Area',
        desc: 'ORDER BY·GROUP BY(Sort Area), Hash Join(Hash Area), 복합 Bitmap 인덱스 스캔(Bitmap Merge Area) 등 메모리가 많이 필요한 연산을 처리하는 공간이에요.',
      },
      {
        icon: 'db',
        color: 'teal' as const,
        label: 'UGA (User Global Area)',
        desc: '세션 변수, 로그인 정보, 세션 상태를 저장해요. Dedicated Server 모드에서는 PGA 안에 위치하고, Shared Server 모드에서는 SGA(Large Pool)로 자리를 옮겨요.',
      },
    ],

    privateSqlTitle: 'Private SQL Area 구조',
    privateSqlDesc: 'Private SQL Area는 커서(Cursor) 하나가 쓰는 개인 공간으로, 두 부분으로 나뉩니다.',
    persistentLabel: 'Persistent Area',
    persistentDesc: '바인드 변수 값을 저장해요. 커서가 닫혀야 비로소 해제돼요.',
    runtimeLabel: 'Runtime Area',
    runtimeDesc: '쿼리 실행 상태(지금까지 읽은 행 수, 페치 위치 등)를 저장해요. DML의 경우 실행 첫 단계에서 생성되고, SQL이 닫히면 해제돼요.',
    privateSqlNote: '같은 SQL을 20개 세션이 각각 실행하면, SGA의 Shared SQL Area(실행 계획)는 딱 1개지만 Private SQL Area는 세션마다 1개씩 총 20개가 생겨요. OPEN_CURSORS 파라미터로 클라이언트 하나가 동시에 열 수 있는 Private SQL Area 수를 제한할 수 있어요.',

    workAreaTitle: 'SQL Work Area',
    workAreaDesc: 'Work Area는 메모리를 많이 쓰는 SQL 연산을 처리하는 PGA 내 전용 공간이에요. 메모리가 부족하면 임시 테이블스페이스(Temp)로 스필(Spill, 흘러넘침)이 발생해요.',
    workAreas: [
      { icon: 'sort',   color: 'blue' as const,    label: 'Sort Area',         desc: 'ORDER BY, GROUP BY, ROLLUP, 인덱스 빌드 등 정렬 연산에 사용돼요' },
      { icon: 'merge',  color: 'emerald' as const,  label: 'Hash Area',         desc: 'Hash Join에서 작은 테이블(build input)을 해시 테이블 형태로 메모리에 올릴 때 사용돼요' },
      { icon: 'bitmap', color: 'amber' as const,    label: 'Bitmap Merge Area', desc: '여러 Bitmap Index 스캔 결과를 하나로 병합할 때 사용돼요' },
    ],
    workAreaNote: 'PGA_AGGREGATE_TARGET을 설정하면 Work Area 크기를 Oracle이 자동으로 관리해요(자동 PGA 관리). V$SQL_WORKAREA_ACTIVE 뷰로 현재 활성 Work Area 목록을 확인할 수 있어요.',
    spillTitle: 'Work Area 스필(Spill)',
    spillDesc: 'Work Area가 필요한 메모리보다 작으면 Oracle은 중간 결과를 임시 테이블스페이스(Temp)에 씁니다. 이걸 "디스크로 스필"이라고 하는데, 성능이 크게 떨어집니다.',
    spillModes: [
      { label: 'Optimal',    color: 'emerald' as const, desc: 'Work Area가 충분해요 → 모든 처리가 메모리에서 끝나요. 제일 빠른 모드예요.' },
      { label: 'One-Pass',   color: 'amber' as const,   desc: 'Work Area가 부족해요 → 데이터를 Temp에 딱 한 번만 써요. 중간 성능이에요.' },
      { label: 'Multi-Pass', color: 'rose' as const,    desc: 'Work Area가 매우 부족해요 → Temp를 여러 번 읽고 써요. 매우 느려요.' },
    ],

    dedicatedSharedTitle: 'Dedicated Server vs Shared Server',
    dedicatedSharedDesc: '서버 연결 모드에 따라 PGA 구조와 메모리 위치가 달라집니다.',

    paramsTitle: '주요 파라미터',
    params: [
      { name: 'PGA_AGGREGATE_TARGET', desc: '인스턴스 전체 PGA의 목표 크기예요. Oracle이 이 범위 안에서 개별 Work Area 크기를 자동으로 조정해요.' },
      { name: 'PGA_AGGREGATE_LIMIT',  desc: 'PGA 사용량의 상한선(하드 한도)이에요. 초과하면 PGA를 가장 많이 쓰는 세션의 SQL이 강제 종료돼요.' },
      { name: 'OPEN_CURSORS',         desc: '세션 하나가 동시에 열 수 있는 커서(Private SQL Area) 최대 수.' },
    ],

    monitorTitle: '모니터링 뷰',
    monitors: [
      { name: 'V$PGASTAT',              desc: '인스턴스 전체 PGA 통계 (총 할당량, 스필 횟수 등)' },
      { name: 'V$PGA_TARGET_ADVICE',    desc: 'PGA_AGGREGATE_TARGET 값을 바꿀 때 예상 성능 영향' },
      { name: 'V$SQL_WORKAREA_ACTIVE',  desc: '현재 실행 중인 Work Area 목록 및 상태' },
      { name: 'V$SQL_WORKAREA',         desc: 'SQL 커서별 Work Area 사용 통계' },
    ],

    summaryTitle: 'PGA 핵심 정리',
    summaryItems: [
      '프로세스 전용 비공개 메모리 — SGA와 달리 다른 프로세스가 접근할 수 없어요',
      'Private SQL Area: 바인드 변수(Persistent) + 실행 상태(Runtime) 저장',
      'SQL Work Area: 정렬·해시 조인·비트맵 병합 등 메모리를 많이 쓰는 연산을 처리',
      'Work Area 부족 시 Temp로 스필 → Optimal > One-Pass > Multi-Pass 순으로 성능이 떨어짐',
      'PGA_AGGREGATE_TARGET으로 인스턴스 전체 PGA 크기를 자동으로 관리',
    ],
  },

  en: {
    title: 'PGA',
    subtitle: 'Non-shared memory region exclusive to each server process',

    whatTitle: 'What is the PGA?',
    whatP1: 'The PGA (Program Global Area) is a non-shared memory region used exclusively by a single server process or background process. While the SGA is shared by all sessions, each PGA is a private workspace allocated per process.',
    whatP2: 'Like a file clerk clearing a section of a countertop as a temporary workspace, a server process uses its PGA while processing SQL and returns it to the OS when the session ends. No other process can access this memory.',
    whatP3: 'The sum of all individual PGAs in an instance is called the Instance PGA. The initialization parameter PGA_AGGREGATE_TARGET sets the target maximum size for the whole instance. Individual PGA sizes cannot be configured manually — Oracle tunes them automatically.',

    componentsTitle: 'PGA Components',
    components: [
      {
        icon: 'stack',
        color: 'violet' as const,
        label: 'Private SQL Area',
        desc: 'Stores the parsed SQL statement and per-session execution information. Divided into Persistent Area (bind variable values) and Runtime Area (execution state).',
      },
      {
        icon: 'sort',
        color: 'blue' as const,
        label: 'SQL Work Area',
        desc: 'Memory for CPU-intensive operations: Sort Area (ORDER BY, GROUP BY), Hash Area (hash joins), Bitmap Merge Area (merging bitmap index scans).',
      },
      {
        icon: 'db',
        color: 'teal' as const,
        label: 'UGA (User Global Area)',
        desc: 'Stores session variables, logon information, and session state. In Dedicated Server mode it lives here in the PGA; in Shared Server mode it moves to the SGA (Large Pool).',
      },
    ],

    privateSqlTitle: 'Private SQL Area Structure',
    privateSqlDesc: 'A Private SQL Area is the personal space used by one cursor, divided into two parts.',
    persistentLabel: 'Persistent Area',
    persistentDesc: 'Holds bind variable values. Released only when the cursor is closed.',
    runtimeLabel: 'Runtime Area',
    runtimeDesc: 'Holds query execution state (rows fetched so far, fetch position, etc.). For DML, created at the first execute step and freed when the SQL statement is closed.',
    privateSqlNote: 'If 20 sessions each execute the same SQL, there is 1 Shared SQL Area (execution plan) in the SGA, but 20 Private SQL Areas — one per session. The OPEN_CURSORS parameter limits how many Private SQL Areas a single client can open at once.',

    workAreaTitle: 'SQL Work Area',
    workAreaDesc: 'Work Areas are dedicated PGA allocations for memory-intensive SQL operations. When memory is insufficient, Oracle spills intermediate results to the temporary tablespace (Temp).',
    workAreas: [
      { icon: 'sort',   color: 'blue' as const,    label: 'Sort Area',         desc: 'Used for ORDER BY, GROUP BY, ROLLUP, and index builds' },
      { icon: 'merge',  color: 'emerald' as const,  label: 'Hash Area',         desc: 'Builds the in-memory hash table from the smaller input in a hash join' },
      { icon: 'bitmap', color: 'amber' as const,    label: 'Bitmap Merge Area', desc: 'Merges results from scans of multiple bitmap indexes' },
    ],
    workAreaNote: 'Work Area sizes are managed automatically by Oracle when PGA_AGGREGATE_TARGET is set (Automatic PGA Management). Use V$SQL_WORKAREA_ACTIVE to inspect currently active work areas.',
    spillTitle: 'Work Area Spill',
    spillDesc: 'When a Work Area is smaller than the operation requires, Oracle writes intermediate results to the temporary tablespace. This is called a "disk spill" and degrades performance significantly.',
    spillModes: [
      { label: 'Optimal',    color: 'emerald' as const, desc: 'Work Area large enough → all processing in memory. Fastest.' },
      { label: 'One-Pass',   color: 'amber' as const,   desc: 'Work Area too small → data written to Temp once. Moderate performance.' },
      { label: 'Multi-Pass', color: 'rose' as const,    desc: 'Work Area very small → Temp written and read multiple times. Very slow.' },
    ],

    dedicatedSharedTitle: 'Dedicated Server vs Shared Server',
    dedicatedSharedDesc: 'The PGA structure and memory location change depending on the server connection mode.',

    paramsTitle: 'Key Parameters',
    params: [
      { name: 'PGA_AGGREGATE_TARGET', desc: 'Target size for the total instance PGA. Oracle automatically sizes individual Work Areas to stay within this limit.' },
      { name: 'PGA_AGGREGATE_LIMIT',  desc: 'Hard cap on total PGA usage. When exceeded, Oracle terminates the SQL of the session consuming the most PGA.' },
      { name: 'OPEN_CURSORS',         desc: 'Maximum number of cursors (Private SQL Areas) a single session can have open simultaneously.' },
    ],

    monitorTitle: 'Monitoring Views',
    monitors: [
      { name: 'V$PGASTAT',              desc: 'Instance-wide PGA statistics (total allocated, spill count, etc.)' },
      { name: 'V$PGA_TARGET_ADVICE',    desc: 'Estimated performance impact of changing PGA_AGGREGATE_TARGET' },
      { name: 'V$SQL_WORKAREA_ACTIVE',  desc: 'Currently active work areas and their status' },
      { name: 'V$SQL_WORKAREA',         desc: 'Work area usage statistics per SQL cursor' },
    ],

    summaryTitle: 'PGA — Key Takeaways',
    summaryItems: [
      'Process-exclusive non-shared memory — no other process can access it',
      'Private SQL Area: bind variables (Persistent) + execution state (Runtime)',
      'SQL Work Area: handles sort, hash join, bitmap merge operations in memory',
      'Work Area spill to Temp when insufficient: Optimal > One-Pass > Multi-Pass',
      'PGA_AGGREGATE_TARGET lets Oracle auto-manage the total instance PGA size',
    ],
  },
}

// ── Icons / colors ─────────────────────────────────────────────────────────

const ICON_MAP = {
  stack:  <IconStack2 size={14} stroke={1.5} />,
  sort:   <IconSortAscending size={14} stroke={1.5} />,
  merge:  <IconArrowMerge size={14} stroke={1.5} />,
  bitmap: <IconDatabase size={14} stroke={1.5} />,
  db:     <IconDatabase size={14} stroke={1.5} />,
  server: <IconServer size={14} stroke={1.5} />,
  users:  <IconUsers size={14} stroke={1.5} />,
}

const COLOR_CLS = {
  violet:  { bg: 'bg-purple/5',  border: 'border-purple/30',  badge: 'bg-purple/10 text-purple'  },
  blue:    { bg: 'bg-blue/5',    border: 'border-blue/30',    badge: 'bg-blue/10 text-blue'      },
  teal:    { bg: 'bg-green/5',    border: 'border-green/30',    badge: 'bg-green/10 text-green'      },
  emerald: { bg: 'bg-green/5', border: 'border-green/30', badge: 'bg-green/10 text-green'},
  amber:   { bg: 'bg-amber/5',   border: 'border-amber/30',   badge: 'bg-amber/10 text-amber'    },
  rose:    { bg: 'bg-red/5',    border: 'border-red/30',    badge: 'bg-red/10 text-red'      },
  slate:   { bg: 'bg-paper-sunk',   border: 'border-line',   badge: 'bg-paper-sunk text-ink'    },
}

function ComponentCard({
  icon, label, desc, color,
}: {
  icon: string; label: string; desc: string; color: keyof typeof COLOR_CLS
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



// ── SVG: Dedicated vs Shared Server ───────────────────────────────────────

function DedicatedSharedDiagram({ lang }: { lang: 'ko' | 'en' }) {
  const isKo = lang === 'ko'
  const W = 600
  const H = 310
  const PAD = 16
  const HALF_W = (W - PAD * 3) / 2

  // Left: Dedicated
  const DED_X = PAD
  const DED_Y = PAD + 28

  // Right: Shared
  const SHR_X = PAD * 2 + HALF_W
  const SHR_Y = PAD + 28

  const BOX_H = H - DED_Y - PAD - 20

  // Session boxes inside dedicated (3 stacked PGA)
  const PGA_H = 64
  const PGA_GAP = 8

  // SGA box for shared side
  const SGA_Y_SHR = SHR_Y + 60
  const SGA_H_SHR = BOX_H - 68

  return (
    <div className="overflow-x-auto rounded-panel border bg-paper">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0 auto' }}>

        {/* column headers */}
        <text x={DED_X + HALF_W / 2} y={PAD + 16} fontFamily="var(--font-sans-active)" fontSize={11}
          fontWeight="bold" fill="var(--color-blue)" textAnchor="middle">
          {isKo ? 'Dedicated Server' : 'Dedicated Server'}
        </text>
        <text x={SHR_X + HALF_W / 2} y={PAD + 16} fontFamily="var(--font-sans-active)" fontSize={11}
          fontWeight="bold" fill="var(--color-green)" textAnchor="middle">
          {isKo ? 'Shared Server' : 'Shared Server'}
        </text>

        {/* divider */}
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD}
          stroke="var(--color-rail)" strokeWidth={1.5} strokeDasharray="4 3" />

        {/* ── Dedicated side: 3 PGAs ── */}
        {[0, 1, 2].map((i) => {
          const py = DED_Y + i * (PGA_H + PGA_GAP)
          const sessionLabel = isKo ? `세션 ${i + 1}` : `Session ${i + 1}`
          return (
            <g key={i}>
              {/* PGA box */}
              <rect x={DED_X + 8} y={py} width={HALF_W - 16} height={PGA_H} rx={7}
                fill="var(--color-paper-sunk)" stroke="var(--color-purple)" strokeWidth={1.5} strokeDasharray="5 3" />
              <text x={DED_X + 18} y={py + 16} fontFamily="var(--font-sans-active)" fontSize={9.5}
                fontWeight="bold" fill="var(--color-purple)">PGA — {sessionLabel}</text>
              {/* UGA inside PGA */}
              <rect x={DED_X + 18} y={py + 24} width={(HALF_W - 36) * 0.52} height={28} rx={4}
                fill="var(--color-line)" stroke="var(--color-green)" strokeWidth={1} />
              <text x={DED_X + 18 + ((HALF_W - 36) * 0.52) / 2} y={py + 42}
                fontFamily="var(--font-sans-active)" fontSize={9} fontWeight="bold" fill="var(--color-green)" textAnchor="middle">UGA</text>
              {/* Work Area */}
              <rect x={DED_X + 18 + (HALF_W - 36) * 0.52 + 6} y={py + 24} width={(HALF_W - 36) * 0.44} height={28} rx={4}
                fill="var(--color-rail)" stroke="var(--color-blue)" strokeWidth={1} />
              <text x={DED_X + 18 + (HALF_W - 36) * 0.52 + 6 + ((HALF_W - 36) * 0.44) / 2} y={py + 42}
                fontFamily="var(--font-sans-active)" fontSize={9} fontWeight="bold" fill="var(--color-blue)" textAnchor="middle">Work Area</text>
            </g>
          )
        })}

        {/* ── Shared side ── */}
        {/* Server processes (shared, small) */}
        <rect x={SHR_X + 8} y={SHR_Y} width={HALF_W - 16} height={44} rx={7}
          fill="var(--color-rail)" stroke="var(--color-ink-3)" strokeWidth={1.5} />
        <text x={SHR_X + HALF_W / 2} y={SHR_Y + 16} fontFamily="var(--font-sans-active)" fontSize={9.5}
          fontWeight="bold" fill="var(--color-ink-2)" textAnchor="middle">
          {isKo ? '공유 서버 프로세스 (여러 세션 처리)' : 'Shared Server Processes (multi-session)'}
        </text>
        <text x={SHR_X + HALF_W / 2} y={SHR_Y + 30} fontFamily="var(--font-sans-active)" fontSize={8.5}
          fill="var(--color-ink-3)" textAnchor="middle">PGA → {isKo ? 'Work Area만 포함' : 'Work Area only'}</text>

        {/* SGA box on shared side */}
        <rect x={SHR_X + 8} y={SGA_Y_SHR} width={HALF_W - 16} height={SGA_H_SHR} rx={7}
          fill="var(--color-paper-sunk)" stroke="var(--color-ink-3)" strokeWidth={1.5} strokeDasharray="6 3" />
        <text x={SHR_X + 18} y={SGA_Y_SHR + 18} fontFamily="var(--font-sans-active)" fontSize={10}
          fontWeight="bold" fill="var(--color-ink-2)">SGA — Large Pool</text>

        {/* UGA blocks inside SGA */}
        {[0, 1, 2].map((i) => {
          const uy = SGA_Y_SHR + 28 + i * 36
          return (
            <g key={i}>
              <rect x={SHR_X + 18} y={uy} width={HALF_W - 36} height={26} rx={4}
                fill="var(--color-line)" stroke="var(--color-green)" strokeWidth={1} />
              <text x={SHR_X + 18 + (HALF_W - 36) / 2} y={uy + 17} fontFamily="var(--font-sans-active)"
                fontSize={9} fontWeight="bold" fill="var(--color-green)" textAnchor="middle">
                UGA — {isKo ? `세션 ${i + 1}` : `Session ${i + 1}`}
              </text>
            </g>
          )
        })}

        {/* legend */}
        <rect x={DED_X + 8} y={H - 18} width={10} height={8} rx={2} fill="var(--color-line)" stroke="var(--color-green)" strokeWidth={1} />
        <text x={DED_X + 22} y={H - 11} fontFamily="var(--font-sans-active)" fontSize={8.5} fill="var(--color-ink-2)">UGA</text>
        <rect x={DED_X + 60} y={H - 18} width={10} height={8} rx={2} fill="var(--color-rail)" stroke="var(--color-blue)" strokeWidth={1} />
        <text x={DED_X + 74} y={H - 11} fontFamily="var(--font-sans-active)" fontSize={8.5} fill="var(--color-ink-2)">Work Area</text>
      </svg>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function PgaSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]

  return (
    <div className="mx-auto max-w-screen-2xl px-10 py-10">
      <ChapterTitle title={t.title} subtitle={t.subtitle} />

      {/* ── What is PGA ── */}
      <SectionTitle>{t.whatTitle}</SectionTitle>
      <div className="mb-6 space-y-2">
        <Prose>{t.whatP1}</Prose>
        <Prose>{t.whatP2}</Prose>
        <Prose>{t.whatP3}</Prose>
      </div>

      <Divider />

      {/* ── Components overview ── */}
      <SectionTitle>{t.componentsTitle}</SectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {t.components.map((c) => (
          <ComponentCard key={c.label} icon={c.icon} label={c.label} desc={c.desc} color={c.color} />
        ))}
      </div>
      <OracleArchitectureDiagram scope="pga" />

      <Divider />

      {/* ── Private SQL Area ── */}
      <SectionTitle>{t.privateSqlTitle}</SectionTitle>
      <Prose className="mb-4">{t.privateSqlDesc}</Prose>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-panel border-2 border-purple/30 bg-purple/5 p-4">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-purple">Persistent Area</div>
          <p className="text-xs leading-relaxed text-ink-2">{t.persistentDesc}</p>
        </div>
        <div className="rounded-panel border-2 border-purple/30 bg-purple/5 p-4">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-purple">Runtime Area</div>
          <p className="text-xs leading-relaxed text-ink-2">{t.runtimeDesc}</p>
        </div>
      </div>
      <InfoBox variant="note">{t.privateSqlNote}</InfoBox>

      <Divider />

      {/* ── Work Area ── */}
      <SectionTitle>{t.workAreaTitle}</SectionTitle>
      <Prose className="mb-4">{t.workAreaDesc}</Prose>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {t.workAreas.map((wa) => (
          <ComponentCard key={wa.label} icon={wa.icon} label={wa.label} desc={wa.desc} color={wa.color} />
        ))}
      </div>
      <InfoBox variant="tip">{t.workAreaNote}</InfoBox>

      <div className="mt-4">
        <SubTitle>{t.spillTitle}</SubTitle>
        <Prose>{t.spillDesc}</Prose>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {t.spillModes.map((m) => {
            const cls = COLOR_CLS[m.color]
            return (
              <div key={m.label} className={cn('rounded-panel border p-4', cls.bg, cls.border)}>
                <div className={cn('mb-1.5 inline-block rounded-full px-2.5 py-0.5 font-mono text-xs font-bold', cls.badge)}>
                  {m.label}
                </div>
                <p className="text-xs leading-relaxed text-ink-2">{m.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <Divider />

      {/* ── Dedicated vs Shared ── */}
      <SectionTitle>{t.dedicatedSharedTitle}</SectionTitle>
      <Prose className="mb-4">{t.dedicatedSharedDesc}</Prose>
      <DedicatedSharedDiagram lang={lang} />

      <Divider />

      {/* ── Parameters ── */}
      <SectionTitle>{t.paramsTitle}</SectionTitle>
      <div className="mb-4 overflow-hidden rounded-panel border bg-paper">
        {t.params.map((p, i) => (
          <div key={p.name} className={cn('flex items-start gap-4 px-5 py-3', i > 0 && 'border-t')}>
            <code className="mt-0.5 shrink-0 rounded bg-purple/10 px-2 py-0.5 font-mono text-[11px] font-bold text-purple">
              {p.name}
            </code>
            <p className="text-xs leading-relaxed text-ink-2">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Monitoring ── */}
      <SectionTitle>{t.monitorTitle}</SectionTitle>
      <div className="mb-6 overflow-hidden rounded-panel border bg-paper">
        {t.monitors.map((m, i) => (
          <div key={m.name} className={cn('flex items-start gap-4 px-5 py-3', i > 0 && 'border-t')}>
            <code className="mt-0.5 shrink-0 rounded bg-blue/10 px-2 py-0.5 font-mono text-[11px] font-bold text-blue">
              {m.name}
            </code>
            <p className="text-xs leading-relaxed text-ink-2">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Summary ── */}
      <div className="mt-8 rounded-panel border border-line border-l-[3px] border-l-purple bg-paper-sunk px-6 py-5">
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
