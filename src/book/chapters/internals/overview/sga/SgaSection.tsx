import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'
import { ChapterTitle, SectionTitle, Prose, InfoBox, Divider } from '../../../shared'
import { cn } from '@/lib/utils'
import {
  IconCpu,
  IconDatabase,
  IconServer,
  IconNetwork,
} from '@tabler/icons-react'
import { OracleArchitectureDiagram } from '../../shared/OracleArchitectureDiagram'
import type { ArchComponentId } from '../../shared/OracleArchitectureDiagram'

// ── Translation strings ────────────────────────────────────────────────────

const T = {
  ko: {
    title: 'SGA — System Global Area',
    subtitle: '모든 서버 프로세스와 백그라운드 프로세스가 함께 읽고 쓰는 공용 메모리 공간이에요. Oracle 인스턴스가 시작될 때 운영체제에서 통째로 예약하고, 인스턴스가 살아 있는 동안 유지돼요.',

    whatTitle: 'SGA가 뭐예요?',
    whatP1: 'Oracle 인스턴스를 시작하면 OS가 메모리의 한 영역을 통째로 Oracle에 넘겨줘요. 이 영역이 SGA(System Global Area)예요. 서버에 접속한 모든 세션과 모든 백그라운드 프로세스가 이 메모리를 함께 써요.',
    whatP2: 'PGA가 "나만 쓰는 방(세션 전용)"이라면 SGA는 "모두가 쓰는 공용 라운지"예요. Buffer Cache, Shared Pool, Redo Log Buffer 같은 Oracle의 핵심 캐시 구조가 모두 SGA 안에 자리잡고 있어요. SGA 크기와 구성 방식은 성능과 직결되기 때문에 DBA가 가장 먼저 튜닝하는 영역이기도 해요.',
    whatP3: 'Oracle 10g부터는 ASMM(Automatic Shared Memory Management, 자동 공유 메모리 관리)으로 SGA 내부 구성 요소 크기를 자동으로 조정할 수 있고, 12c부터는 SGA와 PGA를 합쳐서 관리하는 AMM(Automatic Memory Management, 자동 메모리 관리)도 지원해요.',

    serverModeTitle: 'Dedicated Server vs RAC — SGA가 달라지는 방식',
    serverModeDesc: '같은 SGA 개념이 서버 구성 방식에 따라 어떻게 달라지는지 살펴봐요.',

    dedicatedLabel: 'Dedicated Server',
    racLabel: 'RAC (Real Application Clusters)',

    dedicatedDesc: '가장 일반적인 구성이에요. 서버 한 대 위에서 Oracle 인스턴스 하나가 뜨고, 그 인스턴스의 SGA를 모든 세션이 함께 써요. SGA는 서버 물리 메모리 위에 딱 하나만 존재해요.',
    racDesc: '여러 서버(노드)가 동일한 데이터베이스 파일을 공유하는 고가용성 구조예요. 각 노드는 독립적인 인스턴스와 독립적인 SGA를 가져요. 노드 간 데이터 일관성은 GCS/GES 레이어(Cache Fusion)가 네트워크를 통해 유지해요.',

    tableHeaders: ['항목', 'Dedicated Server', 'RAC'],
    tableHeadersEn: ['Item', 'Dedicated Server', 'RAC'],

    clickHint: '항목을 클릭하세요',
  },
  en: {
    title: 'SGA — System Global Area',
    subtitle: 'The shared memory region read and written by every server process and background process. Oracle reserves it from the OS when the instance starts and holds it for the lifetime of the instance.',

    whatTitle: 'What is the SGA?',
    whatP1: 'When Oracle starts an instance, the OS hands over a contiguous region of memory entirely to Oracle. That region is the SGA (System Global Area). Every session connected to the server and every background process share this same memory.',
    whatP2: "If PGA is \"your private room,\" then SGA is the \"shared lounge.\" The Buffer Cache, Shared Pool, Redo Log Buffer, and other core Oracle caches all live inside the SGA. Its size and layout directly impact performance — it is typically the first place a DBA tunes.",
    whatP3: 'Since Oracle 10g, ASMM (Automatic Shared Memory Management) can auto-resize SGA components. From 12c onward, AMM (Automatic Memory Management) can manage the combined SGA + PGA budget automatically.',

    serverModeTitle: 'Dedicated Server vs RAC — How the SGA Differs',
    serverModeDesc: 'The same SGA concept behaves differently depending on how the server is configured.',

    dedicatedLabel: 'Dedicated Server',
    racLabel: 'RAC (Real Application Clusters)',

    dedicatedDesc: 'The most common setup. A single Oracle instance runs on one server, and all sessions share that instance\'s SGA. There is exactly one SGA on the physical machine.',
    racDesc: 'A high-availability architecture where multiple servers (nodes) share the same database files. Each node has its own independent instance and its own SGA. Cross-node data consistency is maintained by the GCS/GES layer (Cache Fusion) over the interconnect network.',

    tableHeaders: ['Item', 'Dedicated Server', 'RAC'],
    tableHeadersEn: ['Item', 'Dedicated Server', 'RAC'],

    clickHint: 'Click a component',
  },
}

// ── Dedicated vs RAC table data ────────────────────────────────────────────

const COMPARISON_ROWS = {
  ko: [
    ['인스턴스 수', '서버 1대 → 인스턴스 1개', '서버 N대 → 인스턴스 N개'],
    ['SGA 수', '전체에 SGA 1개', '노드마다 독립적인 SGA 1개'],
    ['Buffer Cache 공유', '단일 캐시, 모든 세션 공유', '노드별 로컬 캐시 + Cache Fusion으로 동기화'],
    ['Shared Pool 공유', '단일 Library Cache · Dict Cache', '노드별 독립, 커서 공유 불가'],
    ['장애 복구', '인스턴스 다운 → 서비스 중단', '다른 노드가 요청을 이어받아 서비스 지속'],
    ['주 사용 목적', '일반 OLTP · DW 환경', '고가용성(HA) · 스케일아웃 OLTP'],
  ],
  en: [
    ['Instances', '1 server → 1 instance', 'N servers → N instances'],
    ['SGA count', 'One SGA for the whole system', 'One independent SGA per node'],
    ['Buffer Cache sharing', 'Single cache shared by all sessions', 'Per-node local cache + Cache Fusion for sync'],
    ['Shared Pool sharing', 'Single Library Cache & Dict Cache', 'Independent per node — cursors not shared'],
    ['Failure recovery', 'Instance down → service outage', 'Other nodes take over — service continues'],
    ['Typical use case', 'General OLTP & DW', 'High availability (HA) & scale-out OLTP'],
  ],
}

// ── SGA component definitions ──────────────────────────────────────────────

type SgaDetail = { term: string; desc: string; isParam?: boolean }

type SgaComponent = {
  id: ArchComponentId
  labelKo: string
  labelEn: string
  tagColor: string
  descKo: string
  descEn: string
  detailsKo: SgaDetail[]
  detailsEn: SgaDetail[]
}

const SGA_COMPONENTS: SgaComponent[] = [
  {
    id: 'buffer-cache',
    labelKo: 'Buffer Cache',
    labelEn: 'Buffer Cache',
    tagColor: 'bg-blue',
    descKo: '디스크에서 읽어온 데이터 블록(기본 8KB)을 메모리에 보관하는 캐시예요. 같은 블록이 다시 필요할 때 디스크에 가지 않고 메모리에서 바로 꺼내 써요. SGA 안에서 가장 큰 비중을 차지하고, Oracle 성능의 핵심 지표인 Buffer Cache Hit Ratio에 직접 영향을 줘요.',
    descEn: 'A cache that holds data blocks (8 KB by default) read from disk. When the same block is needed again, Oracle serves it from memory instead of hitting disk. It is the largest component in the SGA and directly determines the Buffer Cache Hit Ratio — Oracle\'s most watched performance metric.',
    detailsKo: [
      { term: 'LRU 알고리즘', desc: '가장 오랫동안 쓰이지 않은 블록을 밀어내고 새 블록이 들어올 공간을 만듭니다.' },
      { term: 'Dirty Buffer', desc: '메모리에서 수정됐지만 아직 디스크에 쓰이지 않은 블록. DBWn(데이터베이스 라이터)이 이걸 주기적으로 디스크에 씁니다.' },
      { term: 'DB_CACHE_SIZE', desc: 'SGA 내 Buffer Cache 크기를 지정하는 파라미터예요. ASMM을 쓰면 자동으로 조정돼요.', isParam: true },
    ],
    detailsEn: [
      { term: 'LRU algorithm', desc: 'Evicts the least recently used block to make room for a new one.' },
      { term: 'Dirty Buffer', desc: 'A block modified in memory but not yet written to disk. Flushed by DBWn.' },
      { term: 'DB_CACHE_SIZE', desc: 'Parameter that sets Buffer Cache size within the SGA. Auto-adjusted under ASMM.', isParam: true },
    ],
  },
  {
    id: 'shared-pool',
    labelKo: 'Shared Pool',
    labelEn: 'Shared Pool',
    tagColor: 'bg-blue',
    descKo: 'SQL 파싱 결과(실행 계획)와 테이블·컬럼 메타데이터를 캐시하는 영역이에요. Library Cache와 Dictionary Cache(Row Cache)로 구성돼요. 같은 SQL이 다시 들어오면 파싱을 건너뛰고 Library Cache의 커서를 재사용(Soft Parse)해서 CPU를 아껴요.',
    descEn: 'Caches SQL parse results (execution plans) and table/column metadata. Consists of the Library Cache and Dictionary Cache (Row Cache). When the same SQL arrives again, Oracle skips parsing and reuses the cached cursor (Soft Parse), saving CPU.',
    detailsKo: [
      { term: 'Library Cache', desc: 'SQL 커서(파싱 트리 + 실행 계획)를 저장해요. Hard Parse 비용을 줄이는 핵심 구조예요.' },
      { term: 'Dictionary Cache', desc: '테이블·컬럼·권한 같은 딕셔너리 메타데이터를 행(Row) 단위로 캐시해요. Row Cache라고도 불러요.' },
      { term: 'SHARED_POOL_SIZE', desc: 'Shared Pool 크기를 지정하는 파라미터예요. Library Cache 래치 경합이 심하면 늘려야 해요.', isParam: true },
    ],
    detailsEn: [
      { term: 'Library Cache', desc: 'Stores SQL cursors (parse tree + execution plan). Core structure for reducing Hard Parse cost.' },
      { term: 'Dictionary Cache', desc: 'Caches dictionary metadata (tables, columns, privileges) row by row. Also called Row Cache.' },
      { term: 'SHARED_POOL_SIZE', desc: 'Parameter for Shared Pool size. Increase if Library Cache latch contention is high.', isParam: true },
    ],
  },
  {
    id: 'redo-buffer',
    labelKo: 'Redo Log Buffer',
    labelEn: 'Redo Log Buffer',
    tagColor: 'bg-amber',
    descKo: '데이터 변경 내역("이 블록의 이 값을 저 값으로 바꿨다")을 순서대로 기록하는 메모리 링 버퍼예요. LGWR(로그 라이터)가 주기적으로, 그리고 COMMIT 시 즉시 디스크 Redo Log File에 써요. 크기가 작은 편이고 빠른 순차 쓰기를 위해 설계됐어요.',
    descEn: 'A circular memory buffer that records data change vectors ("change this value in this block to that value") in sequence. LGWR periodically flushes it to disk, and always flushes it immediately at COMMIT. It is intentionally small and designed for fast sequential writes.',
    detailsKo: [
      { term: 'WAL 원칙', desc: 'Redo Log Buffer가 디스크에 먼저 기록돼야 Buffer Cache의 변경이 유효해요. 로그가 먼저, 데이터가 나중이에요.' },
      { term: 'Redo Log Buffer Allocation Latch', desc: '버퍼에 항목을 쓸 때 보호하는 래치예요. 경합이 심하면 log buffer space 대기 이벤트가 발생해요.' },
      { term: 'LOG_BUFFER', desc: 'Redo Log Buffer 크기를 지정하는 파라미터예요. 보통 4MB~16MB. 너무 크면 LGWR(로그 라이터) 지연이 생겨요.', isParam: true },
    ],
    detailsEn: [
      { term: 'WAL principle', desc: 'The Redo Log Buffer must be flushed to disk before a Buffer Cache change is considered durable.' },
      { term: 'Redo Log Buffer Allocation Latch', desc: 'Protects writes to the buffer. Contention causes the "log buffer space" wait event.' },
      { term: 'LOG_BUFFER', desc: 'Parameter for Redo Log Buffer size. Typically 4–16 MB. Too large delays LGWR flushes.', isParam: true },
    ],
  },
  {
    id: 'large-pool',
    labelKo: 'Large Pool',
    labelEn: 'Large Pool',
    tagColor: 'bg-green',
    descKo: 'RMAN(Recovery Manager) 백업·복구, 병렬 쿼리, Shared Server의 UGA처럼 크고 일회성인 메모리 요청을 전담하는 선택적 영역이에요. 이런 작업을 Shared Pool에서 처리하면 Library Cache가 밀려날 수 있어서 따로 분리해 둔 거예요.',
    descEn: 'An optional area dedicated to large, one-time memory requests such as RMAN backup/recovery, parallel query execution, and UGA for Shared Server. Isolating these from the Shared Pool prevents them from crowding out the Library Cache.',
    detailsKo: [
      { term: 'RMAN(Recovery Manager)', desc: '백업·복구 I/O 버퍼를 Large Pool에서 할당해요. Shared Pool이 오염되는 걸 막아줘요.' },
      { term: '병렬 쿼리 메시지 버퍼', desc: '병렬 실행 서버들끼리 통신할 때 쓰는 메시지 버퍼를 Large Pool에서 할당해요.' },
      { term: 'LARGE_POOL_SIZE', desc: 'Large Pool 크기를 지정하는 파라미터예요. 설정하지 않으면 Large Pool 자체가 생성되지 않아요.', isParam: true },
    ],
    detailsEn: [
      { term: 'RMAN', desc: 'Backup and recovery I/O buffers are allocated from the Large Pool, keeping the Shared Pool uncontaminated.' },
      { term: 'Parallel query message buffers', desc: 'Message buffers used for communication between parallel execution servers are allocated here.' },
      { term: 'LARGE_POOL_SIZE', desc: 'Parameter that sets Large Pool size. If not set, no Large Pool is created.', isParam: true },
    ],
  },
  {
    id: 'java-pool',
    labelKo: 'Java Pool',
    labelEn: 'Java Pool',
    tagColor: 'bg-green',
    descKo: 'Oracle 안에서 자바 스토어드 프로시저(Java Stored Procedure)를 실행할 때, JVM(Java Virtual Machine)이 클래스 정의나 세션별 상태를 올려두는 공간이에요. 자바 기반 기능을 쓰지 않으면 거의 비어 있는 영역이에요.',
    descEn: 'When Oracle runs Java stored procedures internally, the JVM (Java Virtual Machine) uses this area to hold class definitions and per-session state. If the database does not use Java-based features, this area stays mostly empty.',
    detailsKo: [
      { term: 'JVM 클래스 정의', desc: '자바 클래스와 메서드의 정의를 메모리에 올려둬서 매번 다시 로드하지 않아도 돼요.' },
      { term: '세션별 자바 상태', desc: 'Dedicated Server에서는 PGA와 유사하게, Shared Server에서는 UGA처럼 세션별 자바 객체 상태를 보관해요.' },
      { term: 'JAVA_POOL_SIZE', desc: 'Java Pool 크기를 지정하는 파라미터예요. 자바 기능을 안 쓰면 작게 잡아도 돼요.', isParam: true },
    ],
    detailsEn: [
      { term: 'JVM class definitions', desc: 'Keeps Java class and method definitions in memory so they are not reloaded on every call.' },
      { term: 'Per-session Java state', desc: 'Similar to the PGA in Dedicated Server mode, or the UGA in Shared Server mode — holds per-session Java object state.' },
      { term: 'JAVA_POOL_SIZE', desc: 'Parameter that sets Java Pool size. Can be kept small if Java features are unused.', isParam: true },
    ],
  },
  {
    id: 'fixed-sga',
    labelKo: 'Fixed SGA',
    labelEn: 'Fixed SGA',
    tagColor: 'bg-ink-3',
    descKo: '인스턴스 상태, 백그라운드 프로세스가 서로를 찾는 데 필요한 포인터 등 Oracle 내부적으로만 쓰는 작은 고정 크기 영역이에요. 사용자가 직접 조절할 수 없고, 크기도 아주 작아요(보통 수백 KB 수준).',
    descEn: 'A small, fixed-size area holding internal bookkeeping — instance state, pointers background processes use to locate each other, and similar bootstrap data. Users cannot resize it directly, and it typically stays only a few hundred KB.',
    detailsKo: [
      { term: '인스턴스 부팅 정보', desc: '인스턴스가 시작될 때 필요한 내부 상태 값들을 담고 있어요.' },
      { term: '프로세스 간 포인터', desc: '백그라운드 프로세스들이 SGA의 다른 영역을 찾아가는 데 쓰는 내부 포인터가 여기 있어요.' },
      { term: '크기 조절 불가', desc: 'Fixed SGA는 Oracle 소프트웨어 버전과 플랫폼에 의해 크기가 고정돼요. 파라미터로 직접 조정할 수 없어요.' },
    ],
    detailsEn: [
      { term: 'Instance bootstrap data', desc: 'Holds internal state values required when the instance starts up.' },
      { term: 'Inter-process pointers', desc: 'Background processes use internal pointers stored here to locate other SGA regions.' },
      { term: 'Not resizable', desc: "Fixed SGA size is determined by the Oracle software version and platform — it cannot be tuned with a parameter." },
    ],
  },
]

// ── ServerModeCard ─────────────────────────────────────────────────────────

function ServerModeCard({
  icon,
  label,
  desc,
  active,
  onClick,
  accentCls,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  active: boolean
  onClick: () => void
  accentCls: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 rounded-panel border-2 p-4 text-left transition-all',
        active ? accentCls : 'border-line bg-paper hover:border-line-2',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('shrink-0', active ? '' : 'opacity-50')}>{icon}</span>
        <span className={cn('font-mono text-xs font-bold', active ? '' : 'text-ink-2')}>{label}</span>
      </div>
      <p className="text-xs leading-relaxed text-ink-2">{desc}</p>
    </button>
  )
}

// ── SgaSection ─────────────────────────────────────────────────────────────

export function SgaSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]

  const [serverMode, setServerMode] = useState<'dedicated' | 'rac'>('dedicated')
  const [activeComponentId, setActiveComponentId] = useState<ArchComponentId | null>(null)

  const activeComponent = SGA_COMPONENTS.find((c) => c.id === activeComponentId) ?? null

  function handleComponentSelect(id: ArchComponentId) {
    if (!SGA_COMPONENTS.some((c) => c.id === id)) return
    setActiveComponentId((prev) => (prev === id ? null : id))
  }

  const comparisonRows = COMPARISON_ROWS[lang]

  return (
    <div className="mx-auto max-w-screen-2xl px-10 py-10">
      <ChapterTitle
        icon={<IconCpu size={36} stroke={1.5} className="text-blue" />}
        title={t.title}
        subtitle={t.subtitle}
      />

      {/* ── 1. SGA란? ── */}
      <SectionTitle>{t.whatTitle}</SectionTitle>
      <Prose>{t.whatP1}</Prose>
      <Prose>{t.whatP2}</Prose>
      <Prose>{t.whatP3}</Prose>

      {/* Map (left, ~40%) + Detail card (right) */}
      <div className="mb-4 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:sticky lg:top-6 lg:w-[40%] lg:shrink-0">
          <OracleArchitectureDiagram
            scope="sga"
            onSelect={handleComponentSelect}
            highlightIds={activeComponentId ? [activeComponentId] : []}
          />
        </div>

        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {activeComponent ? (
              <motion.div
                key={activeComponent.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="rounded-panel border border-line bg-paper overflow-hidden"
              >
                <div className="flex items-center gap-2.5 border-b border-line bg-rail px-5 py-3">
                  <span className={cn('rounded px-2.5 py-0.5 font-mono text-xs font-bold text-paper', activeComponent.tagColor)}>
                    {lang === 'ko' ? activeComponent.labelKo : activeComponent.labelEn}
                  </span>
                </div>
                <div className="px-5 py-4 border-b border-line">
                  <p className="text-sm leading-relaxed text-ink-2">
                    {lang === 'ko' ? activeComponent.descKo : activeComponent.descEn}
                  </p>
                </div>
                {(() => {
                  const details = lang === 'ko' ? activeComponent.detailsKo : activeComponent.detailsEn
                  const normal = details.filter((r) => !r.isParam)
                  const params = details.filter((r) => r.isParam)
                  return (
                    <div className="flex flex-col divide-y divide-line">
                      {normal.map((row, i) => (
                        <div key={i} className="grid grid-cols-[160px_1fr] text-xs">
                          <div className="flex items-center border-r border-line bg-rail px-4 py-2.5">
                            <span className="font-sans font-bold text-ink">{row.term}</span>
                          </div>
                          <div className="flex items-center px-4 py-2.5">
                            <span className="leading-snug text-ink-2">{row.desc}</span>
                          </div>
                        </div>
                      ))}
                      {params.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 bg-paper-sunk px-4 py-1.5 border-t border-line">
                            <span className="rounded border border-line-2 bg-paper-sunk px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink-2">
                              PARAMETER
                            </span>
                            <span className="text-[10px] text-ink-2">
                              {lang === 'ko' ? '관련 초기화 파라미터' : 'Initialization parameter'}
                            </span>
                          </div>
                          {params.map((row, i) => (
                            <div key={i} className="grid grid-cols-[160px_1fr] text-xs bg-paper-sunk">
                              <div className="flex items-center border-r border-line bg-paper-sunk px-4 py-2.5">
                                <span className="font-mono font-bold text-ink-2">{row.term}</span>
                              </div>
                              <div className="flex items-center px-4 py-2.5">
                                <span className="leading-snug text-ink-2">{row.desc}</span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )
                })()}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-16 items-center justify-center rounded-panel border-2 border-dashed border-line lg:h-full lg:min-h-[10rem]"
              >
                <span className="font-mono text-sm text-ink-2">{t.clickHint}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Divider />

      {/* ── 2. Dedicated vs RAC ── */}
      <SectionTitle>{t.serverModeTitle}</SectionTitle>
      <Prose>{t.serverModeDesc}</Prose>

      <div className="flex gap-3 mb-6">
        <ServerModeCard
          icon={<IconServer size={16} className="text-green" />}
          label={t.dedicatedLabel}
          desc={t.dedicatedDesc}
          active={serverMode === 'dedicated'}
          onClick={() => setServerMode('dedicated')}
          accentCls="border-green/50 bg-green/5"
        />
        <ServerModeCard
          icon={<IconNetwork size={16} className="text-purple" />}
          label={t.racLabel}
          desc={t.racDesc}
          active={serverMode === 'rac'}
          onClick={() => setServerMode('rac')}
          accentCls="border-purple/50 bg-purple/5"
        />
      </div>

      {/* Dedicated diagram */}
      <AnimatePresence mode="wait">
        {serverMode === 'dedicated' ? (
          <motion.div
            key="dedicated"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mb-6 rounded-panel border border-green/30 bg-green/5 p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <IconServer size={14} className="text-green" />
              <span className="font-mono text-xs font-bold text-green">
                {lang === 'ko' ? '단일 서버 · 단일 인스턴스' : 'Single Server · Single Instance'}
              </span>
            </div>
            <div className="flex gap-4 items-center">
              {/* Server box */}
              <div className="flex-1 rounded-panel border-2 border-green/50 bg-paper/80 p-4">
                <div className="mb-2 font-mono text-[10px] font-bold uppercase text-green">Server</div>
                <div className="rounded-card border-2 border-blue/50 bg-blue/5 p-3">
                  <div className="mb-1.5 font-mono text-[10px] font-bold text-blue uppercase">Oracle Instance</div>
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <div className="rounded-card border border-blue/30 bg-blue/10 px-2 py-1.5 font-mono text-[10px] font-bold text-blue text-center">SGA</div>
                    <div className="rounded-card border border-green/30 bg-green/10 px-2 py-1.5 font-mono text-[10px] font-bold text-green text-center">PGA × N</div>
                  </div>
                  <div className="flex gap-1.5">
                    {['Session 1', 'Session 2', 'Session 3'].map((s) => (
                      <div key={s} className="flex-1 rounded border border-green/30 bg-green/5 px-1.5 py-1 font-mono text-[9px] text-green text-center">{s}</div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Arrow + DB files */}
              <div className="flex flex-col items-center gap-1 text-ink-2">
                <span className="font-mono text-[10px]">I/O</span>
                <span className="text-lg">⟷</span>
              </div>
              <div className="rounded-panel border-2 border-line-2 bg-paper-sunk px-5 py-4 font-mono text-[10px] text-ink-2 text-center">
                <IconDatabase size={20} className="mx-auto mb-1 text-ink-2" />
                {lang === 'ko' ? '공유 DB 파일' : 'DB Files'}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="rac"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mb-6 rounded-panel border border-purple/30 bg-purple/5 p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <IconNetwork size={14} className="text-purple" />
              <span className="font-mono text-xs font-bold text-purple">
                {lang === 'ko' ? '다중 노드 · 각자 독립적인 SGA' : 'Multiple Nodes · Independent SGA per Node'}
              </span>
            </div>
            <div className="flex gap-3 items-center">
              {/* Node 1 */}
              {[
                lang === 'ko' ? '노드 1' : 'Node 1',
                lang === 'ko' ? '노드 2' : 'Node 2',
              ].map((nodeLabel, ni) => (
                <div key={ni} className="flex-1 rounded-panel border-2 border-purple/50 bg-paper/80 p-3">
                  <div className="mb-2 font-mono text-[10px] font-bold uppercase text-purple">{nodeLabel}</div>
                  <div className="rounded-card border-2 border-blue/50 bg-blue/5 p-2">
                    <div className="mb-1 font-mono text-[9px] font-bold text-blue uppercase">Instance {ni + 1}</div>
                    <div className="grid grid-cols-2 gap-1 mb-1">
                      <div className="rounded border border-blue/30 bg-blue/10 px-1.5 py-1 font-mono text-[9px] font-bold text-blue text-center">SGA</div>
                      <div className="rounded border border-green/30 bg-green/10 px-1.5 py-1 font-mono text-[9px] font-bold text-green text-center">PGA</div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Interconnect */}
              <div className="flex flex-col items-center gap-0.5 px-1">
                <span className="font-mono text-[9px] text-purple">Cache</span>
                <span className="font-mono text-[9px] text-purple">Fusion</span>
                <span className="text-purple text-sm">⟷</span>
              </div>
              {/* Arrow + shared DB */}
              <div className="flex flex-col items-center gap-1 text-ink-2">
                <span className="font-mono text-[10px]">I/O</span>
                <span className="text-lg">⟷</span>
              </div>
              <div className="rounded-panel border-2 border-line-2 bg-paper-sunk px-4 py-3 font-mono text-[10px] text-ink-2 text-center">
                <IconDatabase size={18} className="mx-auto mb-1 text-ink-2" />
                {lang === 'ko' ? '공유 DB 파일' : 'Shared DB'}
                <div className="mt-0.5 text-[9px] text-purple">{lang === 'ko' ? '(모든 노드 공유)' : '(all nodes)'}</div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-purple">
              {lang === 'ko'
                ? '⚡ Cache Fusion: 노드 1이 수정한 블록을 노드 2가 필요하면 디스크 대신 네트워크 인터커넥트로 직접 전달해요.'
                : '⚡ Cache Fusion: If Node 2 needs a block modified by Node 1, Oracle sends it over the interconnect directly — no disk involved.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison table */}
      <div className="overflow-hidden rounded-panel border mb-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-rail">
              {t.tableHeaders.map((h, i) => (
                <th key={i} className={cn('px-4 py-2.5 text-left font-mono font-bold text-ink-2', i === 0 ? 'w-[160px]' : '')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row, ri) => (
              <tr key={ri} className={cn('border-b last:border-0', ri % 2 === 0 ? 'bg-paper' : 'bg-rail')}>
                {row.map((cell, ci) => (
                  <td key={ci} className={cn('px-4 py-2 font-mono text-[11px]', ci === 0 ? 'font-bold text-ink/80' : 'text-ink-2')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InfoBox variant="note">
        {lang === 'ko' ? (
          <>RAC(Real Application Clusters)는 고가용성과 수평 확장을 제공하지만, Cache Fusion 트래픽으로 인한 <strong>인터커넥트 지연</strong>이 새로운 병목이 될 수 있어요. 단일 인스턴스보다 튜닝이 훨씬 복잡하고 어렵거든요.</>
        ) : (
          <>RAC provides high availability and horizontal scale-out, but <strong>interconnect latency</strong> from Cache Fusion traffic can introduce new bottlenecks. Tuning is significantly more complex than a single-instance setup.</>
        )}
      </InfoBox>

      <div className="mt-8">
      <InfoBox variant="summary">
        {lang === 'ko' ? (
          <>
            <strong>SGA 핵심 정리</strong>
            <ul className="mt-2 space-y-1 list-none">
              <li>• <strong>Buffer Cache</strong> — 디스크 블록을 메모리에 올려 두어 디스크 I/O를 줄여요</li>
              <li>• <strong>Shared Pool</strong> — SQL 파싱 결과를 재사용해서 CPU를 아껴요</li>
              <li>• <strong>Redo Log Buffer</strong> — 변경 내역을 메모리에 모아 순차적으로 디스크에 써요</li>
              <li>• <strong>Large Pool</strong> — RMAN·병렬 쿼리 등 큰 메모리 요청을 Shared Pool과 분리해요</li>
            </ul>
          </>
        ) : (
          <>
            <strong>SGA Key Takeaways</strong>
            <ul className="mt-2 space-y-1 list-none">
              <li>• <strong>Buffer Cache</strong> — Keeps disk blocks in memory to reduce disk I/O</li>
              <li>• <strong>Shared Pool</strong> — Reuses SQL parse results to save CPU</li>
              <li>• <strong>Redo Log Buffer</strong> — Batches change records in memory for sequential disk writes</li>
              <li>• <strong>Large Pool</strong> — Isolates RMAN, parallel query, and other large allocations from the Shared Pool</li>
            </ul>
          </>
        )}
      </InfoBox>
      </div>
    </div>
  )
}
