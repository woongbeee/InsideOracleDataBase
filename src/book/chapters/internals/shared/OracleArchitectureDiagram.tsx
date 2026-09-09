import type { ReactNode } from 'react'
import { IconArrowNarrowRight, IconArrowNarrowDown } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useSimulationStore } from '@/store/simulationStore'

// ─────────────────────────────────────────────────────────────────────────────
// Oracle Database Instance 아키텍처 다이어그램 — 프로그램 전체 공용.
//
// Oracle 공식 "Database Instance" / "Memory Structures" 그림의 중첩 관계를
// 그대로 옮긴다:
//
//   Client Process ─▶ Server Process
//                         │ owns              ┌─────── Instance ───────┐
//                         ▼                   │  ┌─ SGA (공유 메모리) ─┐ │
//   Server Process ─ r/w ─┼──────────────────▶│  │ Shared Pool …       │ │
//                         │                   │  └────────────────────┘ │
//                         │                   │  ┌─ PGA (전용 메모리) ─┐ │
//                         └── owns ───────────▶│  │ Private SQL Area … │ │
//                                             │  └────────────────────┘ │
//                                             │  ┌ Background Processes ┐│
//                             r/w SGA ◀───────┼──┤ PMON SMON DBWn LGWR …││
//                                             │  └────────────────────┘ │
//                                             └────────────────────────┘
//                                                        │ DBWn/LGWR/CKPT/ARCn
//                                                        ▼
//                                             Database { Data · Redo · Control · Archive }
//
// 핵심: PGA 도 SGA 도 **Instance 안**에 있다. Server Process 는 Instance 경계에
// 걸쳐 있고(자기 PGA 를 소유 + SGA 를 공유 접근), Background Process 는 Instance
// 안에서 SGA 를 읽고 쓰며 디스크 파일에 기록한다.
//
// 두 가지 모드:
//   variant="simple"  — 이름표만. 각 영역이 클릭 이벤트를 받는다(onSelect / 부모의
//                        data-arch-id 위임). 클릭 시 동작은 각 페이지가 정의한다.
//   variant="detail"  — 각 영역에 한 줄 설명이 함께 들어간다. 클릭 없음.
//
// 폰트: 이름 = font-sans, 약어(PMON·SGA…) = font-mono. 색: --color-viz-* / 토큰.
// ─────────────────────────────────────────────────────────────────────────────

export type ArchComponentId =
  | 'client'
  | 'server-process'
  | 'instance'
  // ── SGA
  | 'sga'
  | 'shared-pool'
  | 'library-cache'
  | 'dict-cache'
  | 'buffer-cache'
  | 'redo-buffer'
  | 'large-pool'
  | 'java-pool'
  | 'fixed-sga'
  // ── PGA
  | 'pga'
  | 'private-sql'
  | 'sql-work-area'
  | 'session-memory'
  // ── Background processes
  | 'bg-processes'
  | 'pmon'
  | 'smon'
  | 'dbwr'
  | 'lgwr'
  | 'ckpt'
  | 'arcn'
  // ── Database (disk)
  | 'database'
  | 'data-file'
  | 'redo-log-file'
  | 'control-file'
  | 'archive-log'

type Variant = 'simple' | 'detail'

interface Props {
  /** 'simple' — 이름표 + 클릭 이벤트 / 'detail' — 인라인 설명 포함, 클릭 없음 */
  variant?: Variant
  /** simple 모드: 영역 클릭 콜백. 부모에서 data-arch-id 로 직접 잡아도 된다. */
  onSelect?: (id: ArchComponentId) => void
  /** 강조할 영역들 (그룹을 넘기면 소속 자식도 함께 강조). 비면 전체 기본색. */
  highlightIds?: ArchComponentId[]
  /** Client / Server Process 행을 숨긴다 (좁은 사이드바 등) */
  hideClient?: boolean
  /** 다이어그램 위 한 줄 안내 문구 */
  callout?: string
  /** Database(디스크) 블록을 숨긴다 — 메모리 구조에만 집중하고 싶을 때 */
  hideDatabase?: boolean
  className?: string
}

// ── 그룹 → 소속 id (그룹 강조 시 소속도 함께 강조) ─────────────────────────────
const GROUP: Partial<Record<ArchComponentId, ArchComponentId[]>> = {
  instance: [
    'sga', 'shared-pool', 'library-cache', 'dict-cache', 'buffer-cache', 'redo-buffer',
    'large-pool', 'java-pool', 'fixed-sga',
    'pga', 'private-sql', 'sql-work-area', 'session-memory',
    'bg-processes', 'pmon', 'smon', 'dbwr', 'lgwr', 'ckpt', 'arcn',
  ],
  sga: ['shared-pool', 'library-cache', 'dict-cache', 'buffer-cache', 'redo-buffer', 'large-pool', 'java-pool', 'fixed-sga'],
  'shared-pool': ['library-cache', 'dict-cache'],
  pga: ['private-sql', 'sql-work-area', 'session-memory'],
  'bg-processes': ['pmon', 'smon', 'dbwr', 'lgwr', 'ckpt', 'arcn'],
  database: ['data-file', 'redo-log-file', 'control-file', 'archive-log'],
}

type Hue = 'blue' | 'amber' | 'green' | 'purple' | 'slate'

const HUE: Record<Hue, { text: string; base: string; lit: string; hover: string; accent: string; ring: string }> = {
  blue:   { text: 'text-viz-blue',   base: 'border-viz-blue/50',   lit: 'border-viz-blue bg-viz-blue/10',     hover: 'hover:bg-viz-blue/5',   accent: 'border-l-viz-blue',   ring: 'ring-viz-blue/40' },
  amber:  { text: 'text-viz-amber',  base: 'border-viz-amber/50',  lit: 'border-viz-amber bg-viz-amber/10',   hover: 'hover:bg-viz-amber/5',  accent: 'border-l-viz-amber',  ring: 'ring-viz-amber/40' },
  green:  { text: 'text-viz-green',  base: 'border-viz-green/50',   lit: 'border-viz-green bg-viz-green/10',   hover: 'hover:bg-viz-green/5',  accent: 'border-l-viz-green',  ring: 'ring-viz-green/40' },
  purple: { text: 'text-viz-purple', base: 'border-viz-purple/50',  lit: 'border-viz-purple bg-viz-purple/10', hover: 'hover:bg-viz-purple/5', accent: 'border-l-viz-purple', ring: 'ring-viz-purple/40' },
  slate:  { text: 'text-ink-2',      base: 'border-line-2',         lit: 'border-ink-3 bg-rail',               hover: 'hover:bg-ink/[0.03]',   accent: 'border-l-line-2',     ring: 'ring-line-2' },
}

type State = 'lit' | 'base' | 'dim'

// ── 클릭 가능한 이름표 박스 ──────────────────────────────────────────────────
function Box({
  id, label, note, mono, hue, state, variant, onSelect, className,
}: {
  id: ArchComponentId
  label: string
  note?: string
  mono?: boolean
  hue: Hue
  state: State
  variant: Variant
  onSelect?: (id: ArchComponentId) => void
  className?: string
}) {
  const h = HUE[hue]
  const clickable = variant === 'simple'
  return (
    <button
      type="button"
      data-arch-id={id}
      onClick={clickable ? () => onSelect?.(id) : undefined}
      aria-hidden={!clickable}
      tabIndex={clickable ? 0 : -1}
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-card border px-2.5 py-2 text-center transition-all',
        state === 'dim'
          ? 'border-line opacity-40'
          : state === 'lit'
            ? h.lit
            : cn('bg-paper', h.base, clickable && h.hover),
        clickable ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
    >
      <span
        className={cn(
          'leading-tight',
          mono ? 'font-mono text-[11px] font-bold tracking-wide' : 'font-sans text-[11.5px] font-semibold',
          state === 'dim' ? 'text-ink-3' : h.text,
        )}
      >
        {label}
      </span>
      {variant === 'detail' && note && (
        <span className={cn('font-sans text-[9.5px] font-normal leading-snug', state === 'dim' ? 'text-ink-3/70' : 'text-ink-2')}>
          {note}
        </span>
      )}
    </button>
  )
}

// ── 라벨 붙은 외곽 프레임 (SGA / PGA / Background Processes / Instance / Database) ─
function Frame({
  id, kicker, note, hue, state, variant, onSelect, children, className,
}: {
  id?: ArchComponentId
  kicker: string
  note?: string
  hue: Hue
  state: State
  variant: Variant
  onSelect?: (id: ArchComponentId) => void
  children: ReactNode
  className?: string
}) {
  const h = HUE[hue]
  const clickable = variant === 'simple' && !!id && !!onSelect
  return (
    <div
      data-arch-id={id}
      onClick={clickable ? () => onSelect?.(id!) : undefined}
      className={cn(
        'rounded-panel border border-l-[3px] bg-paper p-3 transition-all',
        state === 'dim' ? 'border-line border-l-line opacity-40' : cn('border-line', h.accent),
        state === 'lit' && cn('ring-1 ring-inset', h.ring),
        clickable ? 'cursor-pointer' : '',
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn('font-mono text-[9px] font-bold uppercase tracking-[0.12em]', state === 'dim' ? 'text-ink-3/60' : 'text-ink-3')}>
          {kicker}
        </span>
        {variant === 'detail' && note && (
          <span className={cn('font-sans text-[9.5px] leading-snug', state === 'dim' ? 'text-ink-3/60' : 'text-ink-2')}>
            {note}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ── 접근 관계 한 줄 (Server Process ─owns▶ PGA 등) ─────────────────────────────
function AccessLine({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 font-sans text-[8.5px] leading-none text-ink-3">
      {children}
    </span>
  )
}

export function OracleArchitectureDiagram({
  variant = 'simple',
  onSelect,
  highlightIds = [],
  hideClient = false,
  hideDatabase = false,
  callout,
  className,
}: Props) {
  const lang = useSimulationStore((s) => s.lang)
  const isKo = lang === 'ko'
  const lbl = (ko: string, en: string) => (isKo ? ko : en)

  // 강조 집합 = 넘어온 id + 각 id 의 그룹 소속까지 펼침
  const hlSet = new Set<ArchComponentId>(highlightIds)
  for (const id of highlightIds) for (const m of GROUP[id] ?? []) hlSet.add(m)
  const anyHl = highlightIds.length > 0
  const on = (...ids: ArchComponentId[]) =>
    ids.some((id) => hlSet.has(id) || (GROUP[id] ?? []).some((m) => hlSet.has(m)))
  const st = (hit: boolean): State => (!anyHl ? 'base' : hit ? 'lit' : 'dim')

  // ── Client ─▶ Server Process 행 ────────────────────────────────────────────
  const clientRow = !hideClient && (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <Box
        id="client" label={lbl('클라이언트 프로세스', 'Client Process')}
        note={lbl('앱 · SQL*Plus · JDBC', 'app · SQL*Plus · JDBC')}
        hue="slate" state={st(on('client'))} variant={variant} onSelect={onSelect}
        className="flex-1 py-2.5"
      />
      <IconArrowNarrowRight size={18} className="shrink-0 text-ink-3" />
      <Box
        id="server-process" label="Server Process"
        note={lbl('내 SQL 을 파싱·실행', 'parses & runs my SQL')}
        hue="green" state={st(on('server-process'))} variant={variant} onSelect={onSelect}
        className="flex-1 py-2.5"
      />
    </div>
  )

  // Server Process → Instance 접근 관계 설명 행
  const accessRow = !hideClient && (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pl-1">
      <AccessLine>
        <span className="font-mono font-bold text-viz-green">Server Process</span>
        <IconArrowNarrowDown size={12} />
        {lbl('자기 PGA 를 전용으로 소유', 'owns its private PGA')}
      </AccessLine>
      <AccessLine>
        <span className="font-mono font-bold text-viz-green">Server Process</span>
        <IconArrowNarrowRight size={12} />
        {lbl('SGA 를 읽기·쓰기 (모든 세션 공유)', 'reads / writes the SGA (shared by all sessions)')}
      </AccessLine>
    </div>
  )

  // ── SGA ───────────────────────────────────────────────────────────────────
  const sga = (
    <Frame
      id="sga" kicker="SGA — System Global Area"
      note={lbl('인스턴스 하나당 하나. 모든 서버·백그라운드 프로세스가 공유', 'one per instance · shared by every server & background process')}
      hue="blue" state={st(on('sga'))} variant={variant} onSelect={onSelect}
    >
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
        <Box
          id="shared-pool" label="Shared Pool"
          note={lbl('파싱 결과 · 실행 계획 · 딕셔너리', 'parse results · plans · dictionary')}
          hue="blue" state={st(on('shared-pool'))} variant={variant} onSelect={onSelect}
        />
        <Box
          id="buffer-cache" label="Database Buffer Cache"
          note={lbl('데이터 블록 사본 · LRU', 'copies of data blocks · LRU')}
          hue="blue" state={st(on('buffer-cache'))} variant={variant} onSelect={onSelect}
        />
        <Box
          id="redo-buffer" label="Redo Log Buffer"
          note={lbl('변경 벡터 · 순환 버퍼', 'change vectors · circular')}
          hue="amber" state={st(on('redo-buffer'))} variant={variant} onSelect={onSelect}
        />
        <Box
          id="large-pool" label="Large Pool"
          note={lbl('RMAN · 병렬 실행 · Shared Server UGA', 'RMAN · parallel exec · Shared Server UGA')}
          hue="green" state={st(on('large-pool'))} variant={variant} onSelect={onSelect}
        />
        <Box
          id="java-pool" label="Java Pool"
          note={lbl('JVM 세션 메모리', 'JVM session memory')}
          hue="green" state={st(on('java-pool'))} variant={variant} onSelect={onSelect}
        />
        <Box
          id="fixed-sga" label="Fixed SGA"
          note={lbl('내부 부트스트랩 영역', 'internal bootstrap area')}
          hue="slate" state={st(on('fixed-sga'))} variant={variant} onSelect={onSelect}
        />
      </div>
    </Frame>
  )

  // ── PGA ───────────────────────────────────────────────────────────────────
  const pga = (
    <Frame
      id="pga" kicker="PGA — Program Global Area"
      note={lbl('서버 프로세스 하나만의 전용 메모리. 세션마다 따로', 'private to one server process · one per session')}
      hue="purple" state={st(on('pga'))} variant={variant} onSelect={onSelect}
    >
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
        <Box
          id="private-sql" label={lbl('Private SQL Area', 'Private SQL Area')}
          note={lbl('커서 하나의 개인 공간 · 바인드 변수', 'private space per cursor · bind vars')}
          hue="purple" state={st(on('private-sql'))} variant={variant} onSelect={onSelect}
        />
        <Box
          id="sql-work-area" label={lbl('SQL Work Areas', 'SQL Work Areas')}
          note={lbl('Sort · Hash · 부족하면 Temp 로 스필', 'Sort · Hash · spills to Temp')}
          hue="blue" state={st(on('sql-work-area'))} variant={variant} onSelect={onSelect}
        />
        <Box
          id="session-memory" label={lbl('Session Memory (UGA)', 'Session Memory (UGA)')}
          note={lbl('세션 변수 · 로그인 정보 · 상태', 'session vars · logon info · state')}
          hue="green" state={st(on('session-memory'))} variant={variant} onSelect={onSelect}
        />
      </div>
    </Frame>
  )

  // ── Background Processes ───────────────────────────────────────────────────
  const PROCS: { id: ArchComponentId; label: string; note: [string, string] }[] = [
    { id: 'pmon', label: 'PMON', note: ['죽은 세션 정리', 'cleans dead sessions'] },
    { id: 'smon', label: 'SMON', note: ['인스턴스 복구', 'instance recovery'] },
    { id: 'dbwr', label: 'DBWn', note: ['Dirty 블록 → 데이터 파일', 'dirty blocks → data files'] },
    { id: 'lgwr', label: 'LGWR', note: ['Redo 버퍼 → Redo 파일', 'redo buffer → redo files'] },
    { id: 'ckpt', label: 'CKPT', note: ['체크포인트 SCN 기록', 'writes checkpoint SCN'] },
    { id: 'arcn', label: 'ARCn', note: ['Redo → 아카이브 로그', 'redo → archive log'] },
  ]
  const bg = (
    <Frame
      id="bg-processes" kicker={lbl('BACKGROUND PROCESSES', 'BACKGROUND PROCESSES')}
      note={lbl('인스턴스가 켜질 때 자동 시작 · SGA 를 읽고 쓰며 디스크에 기록', 'auto-started with the instance · read/write the SGA, write to disk')}
      hue="amber" state={st(on('bg-processes'))} variant={variant} onSelect={onSelect}
    >
      <div className={cn('grid gap-1.5', variant === 'detail' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-6')}>
        {PROCS.map((p) => (
          <Box
            key={p.id} id={p.id} label={p.label} mono
            note={lbl(p.note[0], p.note[1])}
            hue="amber" state={st(on(p.id))} variant={variant} onSelect={onSelect}
            className="px-1 py-1.5"
          />
        ))}
      </div>
    </Frame>
  )

  // ── Database (files) ──────────────────────────────────────────────────────
  const FILES: { id: ArchComponentId; label: string; note: [string, string] }[] = [
    { id: 'data-file', label: lbl('데이터 파일', 'Data Files'), note: ['테이블·인덱스 실제 데이터', 'actual table & index data'] },
    { id: 'redo-log-file', label: lbl('온라인 리두 로그', 'Online Redo Log'), note: ['변경 기록 · 순환 재사용', 'change records · cyclic'] },
    { id: 'control-file', label: lbl('컨트롤 파일', 'Control Files'), note: ['DB 구조 · 체크포인트 SCN', 'DB structure · checkpoint SCN'] },
    { id: 'archive-log', label: lbl('아카이브 로그', 'Archived Redo Log'), note: ['시점 복구용 Redo 사본', 'redo copies for PITR'] },
  ]
  const db = !hideDatabase && (
    <Frame
      id="database" kicker="Database"
      note={lbl('디스크 위 영구 저장소 — 전원이 꺼져도 남는다', 'persistent storage on disk — survives power loss')}
      hue="slate" state={st(on('database'))} variant={variant} onSelect={onSelect}
    >
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        {FILES.map((f) => (
          <Box
            key={f.id} id={f.id} label={f.label}
            note={lbl(f.note[0], f.note[1])}
            hue="slate" state={st(on(f.id))} variant={variant} onSelect={onSelect}
          />
        ))}
      </div>
    </Frame>
  )

  // Instance → Database 커넥터 (어느 프로세스가 어느 파일을 쓰는지)
  const connector = !hideDatabase && (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-0.5 text-ink-3">
      {[
        lbl('DBWn → 데이터 파일', 'DBWn → data files'),
        lbl('LGWR → 리두 로그', 'LGWR → redo log'),
        lbl('CKPT → 컨트롤 파일', 'CKPT → control files'),
        lbl('ARCn → 아카이브', 'ARCn → archive'),
      ].map((s) => (
        <span key={s} className="flex items-center gap-1 font-sans text-[8.5px] leading-none">
          {s}
          <IconArrowNarrowDown size={12} />
        </span>
      ))}
    </div>
  )

  return (
    <figure className={cn('flex flex-col gap-2.5 overflow-x-auto', className)}>
      {callout && <figcaption className="font-sans text-[11px] text-ink-2">{callout}</figcaption>}

      {clientRow}
      {accessRow}

      {/* Instance = SGA + PGA + Background Processes */}
      <div
        data-arch-id="instance"
        onClick={variant === 'simple' && onSelect ? () => onSelect('instance') : undefined}
        className={cn(
          'rounded-panel border-2 bg-paper-sunk p-2.5 transition-all',
          st(on('instance')) === 'dim' ? 'border-line opacity-40' : 'border-line-2',
          st(on('instance')) === 'lit' && 'ring-1 ring-inset ring-viz-blue/30',
          variant === 'simple' && onSelect ? 'cursor-pointer' : '',
        )}
      >
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink-3">
            {lbl('ORACLE INSTANCE', 'ORACLE INSTANCE')}
          </span>
          <span className="font-sans text-[9.5px] leading-snug text-ink-2">
            {lbl('메모리(SGA · PGA) + 백그라운드 프로세스. Oracle 이 켜져 있는 동안에만 존재', 'memory (SGA · PGA) + background processes · exists only while Oracle is up')}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {sga}
          {pga}
          {bg}
        </div>
      </div>

      {connector}
      {db}
    </figure>
  )
}
