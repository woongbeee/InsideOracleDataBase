import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'
import { ChapterTitle, SectionTitle, SubTitle, Prose, InfoBox, Divider } from '../../../../shared'
import { cn } from '@/lib/utils'
import { OracleArchitectureDiagram } from '../../../shared/OracleArchitectureDiagram'

// ── Translation strings ────────────────────────────────────────────────────

type IoMode = 'random' | 'append'

const T = {
  ko: {
    title: 'Redo Log Buffer',
    subtitle: '모든 변경 이력을 먼저 기록하는 SGA의 원형 버퍼',

    // ── What is ──
    whatTitle: 'Redo Log Buffer가 뭐예요?',
    whatP1: 'Redo Log Buffer는 SGA 안에 있는 원형 버퍼(Circular Buffer)예요. INSERT·UPDATE·DELETE·DDL 같은 변경이 일어날 때마다 "무엇을, 어디서, 어떻게 바꿨는지"를 기록하는 Redo Entry가 이 버퍼에 먼저 쌓여요.',
    whatP2: 'LGWR(Log Writer, 로그 라이터) 프로세스는 이 버퍼의 내용을 디스크의 Online Redo Log 파일에 순서대로 기록해요. 버퍼가 꽉 차면 LGWR가 오래된 항목을 디스크에 쓴 뒤 그 자리를 재사용해요 — 이게 "원형" 버퍼인 이유예요.',
    whatP3: 'Redo 기록은 Oracle 복구의 핵심이에요. 서버가 갑자기 꺼지더라도 Redo Log에 남아 있는 변경 이력을 다시 재실행(Redo)하면 인스턴스가 꺼지기 직전 상태까지 데이터를 되살릴 수 있어요.',

    // ── Redo Entry ──
    entryTitle: 'Redo Entry 구조',
    entryDesc: 'Redo Entry 하나는 데이터 변경 한 건을 완전히 설명하는 레코드예요. Oracle은 Redo Entry를 만들 때 다음 정보를 함께 담아요.',
    entryFields: [
      { label: 'SCN (System Change Number, 시스템 변경 번호)', desc: '이 변경이 일어난 시점의 논리 타임스탬프예요. 복구 순서와 읽기 일관성을 판단할 때 써요.' },
      { label: 'Operation', desc: '어떤 작업인지 — INSERT·UPDATE·DELETE·DDL 같은 작업 코드예요.' },
      { label: 'Before Image', desc: '변경 전의 블록/행 데이터예요. Undo로 롤백하거나 Consistent Read 때 이전 버전을 다시 만들 때 사용돼요.' },
      { label: 'After Image', desc: '변경 후의 블록/행 데이터예요. 장애 복구 시 이 값으로 데이터를 다시 써요(Redo).' },
      { label: 'Object ID / Block Address', desc: '어느 세그먼트의 몇 번 블록인지를 가리키는 위치 정보예요.' },
    ],
    entryNote: 'Redo Entry는 커밋 여부와 상관없이 바로 버퍼에 기록돼요. 아직 커밋 안 된 변경사항도 이미 Redo Log Buffer에 들어가 있어요. COMMIT이 일어나면 그때 LGWR가 이걸 디스크에 써요.',

    // ── Circular buffer visual ──
    circularTitle: '원형 버퍼 구조',
    circularDesc: 'Redo Log Buffer는 크기가 고정된 원형 버퍼예요. 서버 프로세스들이 Redo Entry를 버퍼에 차례로 넣으면, LGWR가 계속해서 버퍼 내용을 디스크에 쓰고 해당 슬롯을 비워 재사용 가능 상태로 만들어요.',
    circularFull: '버퍼가 완전히 꽉 차면 서버 프로세스들은 LGWR가 공간을 만들어 줄 때까지 잠깐 기다려야 해요(log buffer space 대기 이벤트). LOG_BUFFER 크기를 적절히 설정하면 이 대기를 줄일 수 있어요.',
    slotWritten: '디스크에 기록 완료',
    slotPending: '기록 대기 중',
    slotFree: '빈 슬롯 (재사용 가능)',
    lgwrHead: 'LGWR 현재 위치',

    // ── WAL ──
    walTitle: 'Write-Ahead Logging — 로그 먼저, 데이터 나중',
    walDesc: 'Buffer Cache에서 데이터를 수정할 때 Oracle은 반드시 정해진 순서를 지켜요.',
    walStep1: 'Redo Log Buffer에 먼저 기록',
    walStep1Desc: '"이 블록의 이 값을 저 값으로 바꾼다"는 변경 내역을 메모리의 로그 버퍼에 써요.',
    walStep2: '그 다음 Buffer Cache의 블록을 수정',
    walStep2Desc: '실제 데이터 블록을 변경해요.',
    walConclusion: 'Redo Log File이 먼저, Data File은 그 다음이에요. 이 원칙을 Write-Ahead Logging(WAL)이라고 불러요. 서버가 갑자기 꺼져도 Redo Log만 무사하면 데이터 파일을 복구할 수 있거든요.',
    walMemOrder: '메모리 쓰기 순서',
    walDiskOrder: '디스크 쓰기 순서 (COMMIT 시)',
    walLgwr: 'LGWR · COMMIT 즉시',
    walDbwn: 'DBWn · 나중에 일괄',

    // ── LGWR flush triggers ──
    flushTitle: 'LGWR는 언제 플러시할까요?',
    flushDesc: 'LGWR가 Redo Log Buffer를 디스크에 쓰는 조건은 다섯 가지예요. 이 중 하나라도 충족되면 즉시 플러시가 시작돼요.',
    flushTriggers: [
      {
        label: '① COMMIT',
        desc: '가장 중요한 트리거예요. 사용자가 COMMIT을 실행하면 LGWR는 해당 트랜잭션의 모든 Redo Entry를 디스크에 기록한 다음에야 완료 신호를 돌려줘요. COMMIT이 느린 가장 큰 이유가 바로 이 동기 디스크 쓰기예요.',
        color: 'rose' as const,
      },
      {
        label: '② 버퍼 1/3 이상 사용',
        desc: 'Redo Log Buffer 용량의 약 1/3이 차면 LGWR가 자동으로 플러시를 시작해요. 버퍼가 꽉 찬 탓에 서버 프로세스가 대기하는 상황을 미리 막아줘요.',
        color: 'amber' as const,
      },
      {
        label: '③ 3초 타임아웃',
        desc: '위 조건이 충족되지 않더라도 LGWR는 3초마다 주기적으로 버퍼에 남아 있는 Redo Entry를 디스크에 써요.',
        color: 'amber' as const,
      },
      {
        label: '④ DBWn(데이터베이스 라이터) 쓰기 요청 전',
        desc: 'DBWn이 Dirty 버퍼를 Data File에 쓰기 전, 그 블록과 관련된 Redo가 먼저 Online Redo Log에 기록되어야 해요(WAL 원칙). DBWn은 LGWR 플러시가 끝난 걸 확인하고 나서야 Data File 쓰기를 시작해요.',
        color: 'blue' as const,
      },
      {
        label: '⑤ Checkpoint 발생',
        desc: 'Log Switch나 수동 Checkpoint 때 LGWR는 현재 버퍼의 모든 내용을 디스크에 기록해요.',
        color: 'slate' as const,
      },
    ],

    // ── I/O comparison ──
    ioTitle: '왜 Redo Log 쓰기가 Data File 쓰기보다 빠를까요?',
    ioSubTitle: '두 가지 I/O 방식의 차이에 있어요.',
    ioRandomLabel: 'Random I/O',
    ioAppendLabel: 'Append (Sequential) I/O',
    ioRandomBadge: 'Data File 쓰기',
    ioAppendBadge: 'Redo Log 쓰기',
    ioRandomTitle: 'Random I/O — 원하는 위치를 직접 찾아가는 방식',
    ioAppendTitle: 'Append I/O — 끝에 순서대로 이어 붙이는 방식',
    ioRandomDesc: '데이터 파일에 블록을 쓸 때 Oracle은 해당 블록이 디스크의 어느 위치에 있는지 계산한 뒤, 그 위치로 직접 이동해서 써요. HDD라면 ARM이 물리적으로 그 위치까지 움직여야 하고, SSD라면 해당 셀 주소를 찾아야 해요.\n\n문제는 UPDATE할 행들이 테이블 여기저기 흩어져 있을 때예요. 블록 A → 블록 Z → 블록 C → 블록 M... 순서 없이 왔다 갔다 하다 보면 이동 횟수가 늘어나고 느려져요. 이걸 Random I/O라고 해요.\n\nRandom I/O는 앞으로 인덱스, 조인, 파티셔닝을 배울 때 계속 나와요. 지금은 "디스크의 임의 위치에 쓰는 건 비싸다"는 개념만 기억해두세요.',
    ioAppendDesc: 'Redo Log File은 달라요. 어디서부터 어디까지 바꿨는지 추적할 필요 없이, 그냥 파일 끝에 "다음으로 일어난 일"을 차례차례 이어 써요. ARM이 이동할 일이 없어요. 디스크가 돌아가면서 자연스럽게 다음 위치가 헤드 아래로 오거든요.\n\n이 방식을 Sequential I/O 또는 Append Write라고 해요. Random I/O에 비해 훨씬 빠르기 때문에, Oracle은 COMMIT 때 Redo Log를 디스크에 먼저 쓰면서도 속도를 유지할 수 있어요.\n\n한마디로: "느린 디스크에 꼭 써야 한다면, Append 방식으로 써라"가 Oracle의 전략이에요.',
    ioRandomVisualLabel: '순서 없이 블록 A → F → C 이동',
    ioAppendVisualLabel: '1 → 2 → 3 → 4 → 5 → 다음 칸에 이어 쓰기',
    ioFootnote: 'Random I/O는 인덱스·조인·파티셔닝 챕터에서 계속 나와요. 지금은 "임의 위치 쓰기는 비싸다"는 개념만 기억해두세요.',

    // ── Parameters ──
    paramsTitle: '주요 파라미터',
    params: [
      { name: 'LOG_BUFFER', desc: 'Redo Log Buffer 크기(바이트)예요. 플랫폼과 CPU 수에 따라 자동으로 결정돼요. 대형 트랜잭션이 많다면 늘려서 log buffer space 대기를 줄일 수 있어요.' },
      { name: 'LOG_ARCHIVE_DEST_n', desc: 'ARCHIVELOG 모드에서 아카이브 로그를 저장할 경로예요. 가용성을 위해 두 곳 이상 지정하는 걸 권장해요.' },
      { name: 'ARCHIVE_LAG_TARGET', desc: 'Data Guard 환경에서 아카이브 간격(초)을 강제해요. 이 시간이 지나면 강제 Log Switch가 발생해요.' },
    ],

    // ── Summary ──
    summaryTitle: 'Redo Log Buffer 핵심 정리',
    summaryItems: [
      'SGA 안의 원형 버퍼예요 — 모든 변경 이력(Redo Entry)이 디스크에 쓰이기 전 여기에 먼저 쌓여요',
      'LGWR는 COMMIT·버퍼 1/3 차거나·3초 타임아웃·DBWn 요청·Checkpoint 발생 시 디스크에 기록해요',
      'WAL 원칙: Redo Log 먼저, Data File 나중 — 장애 복구의 토대예요',
      'Append(Sequential) I/O는 Random I/O보다 훨씬 빠르기 때문에 COMMIT 지연을 최소화할 수 있어요',
      'Redo Entry = SCN + 작업 코드 + Before/After Image + 블록 주소',
    ],
  },

  en: {
    title: 'Redo Log Buffer',
    subtitle: 'The circular SGA buffer that records every change before it hits disk',

    whatTitle: 'What is the Redo Log Buffer?',
    whatP1: 'The Redo Log Buffer is a circular buffer inside the SGA. Every time a data change occurs — INSERT, UPDATE, DELETE, or DDL — a Redo Entry describing "what changed, where, and how" is written into this buffer first.',
    whatP2: 'The LGWR (Log Writer) background process continuously reads entries from this buffer and writes them sequentially to the Online Redo Log files on disk. When the buffer is full, LGWR writes the oldest entries to disk and frees those slots for reuse — which is why it is a circular buffer.',
    whatP3: 'These Redo records are the foundation of Oracle recovery. Even if the server crashes unexpectedly, re-applying (replaying) the change history stored in the Redo Log restores the database to its state at the time of failure.',

    entryTitle: 'Redo Entry Structure',
    entryDesc: 'A single Redo Entry is a record that fully describes one data change. Oracle includes the following information in each entry.',
    entryFields: [
      { label: 'SCN (System Change Number)', desc: 'A logical timestamp marking when this change occurred. Used to determine recovery order and read consistency.' },
      { label: 'Operation', desc: 'The type of operation performed — INSERT, UPDATE, DELETE, DDL, etc.' },
      { label: 'Before Image', desc: 'The pre-change state of the block/row. Used for ROLLBACK and to reconstruct earlier row versions during Consistent Read.' },
      { label: 'After Image', desc: 'The post-change state. During recovery, this value is re-applied (redone) to restore data.' },
      { label: 'Object ID / Block Address', desc: 'Location information: which segment and which block number was modified.' },
    ],
    entryNote: 'Redo Entries are written to the buffer immediately — regardless of commit status. Uncommitted changes already exist in the Redo Log Buffer; they are flushed to disk by LGWR at commit time.',

    circularTitle: 'Circular Buffer Structure',
    circularDesc: 'The Redo Log Buffer is a fixed-size circular buffer. Server processes append Redo Entries into the buffer, while LGWR continuously writes entries to disk and marks those slots free for reuse.',
    circularFull: 'When the buffer is completely full, server processes briefly wait until LGWR frees space (wait event: log buffer space). Sizing LOG_BUFFER appropriately eliminates this wait.',
    slotWritten: 'Written to disk',
    slotPending: 'Pending write',
    slotFree: 'Free slot (reusable)',
    lgwrHead: 'LGWR current position',

    walTitle: 'Write-Ahead Logging — Log first, data second',
    walDesc: 'When Oracle modifies data in the Buffer Cache, it always follows a strict order.',
    walStep1: 'Write to the Redo Log Buffer first',
    walStep1Desc: 'Record "change this value in this block to that value" in the in-memory log buffer.',
    walStep2: 'Then modify the block in the Buffer Cache',
    walStep2Desc: 'Apply the actual change to the data block.',
    walConclusion: 'Redo Log File first, Data File second. This principle is called Write-Ahead Logging (WAL). As long as the Redo Log survives, Oracle can always reconstruct the data files — even after a crash.',
    walMemOrder: 'In-memory write order',
    walDiskOrder: 'Disk write order (at COMMIT)',
    walLgwr: 'LGWR · at COMMIT',
    walDbwn: 'DBWn · batched later',

    flushTitle: 'When does LGWR flush?',
    flushDesc: 'LGWR writes the Redo Log Buffer to disk when any of these five conditions is met.',
    flushTriggers: [
      {
        label: '① COMMIT',
        desc: 'The most important trigger. When a user issues COMMIT, LGWR must write all Redo Entries for that transaction to disk before returning confirmation. This synchronous write is the main reason COMMITs take measurable time.',
        color: 'rose' as const,
      },
      {
        label: '② Buffer ≥ 1/3 full',
        desc: 'When the Redo Log Buffer is approximately one-third full, LGWR starts an automatic flush. This prevents server processes from having to wait for space (log buffer space wait event).',
        color: 'amber' as const,
      },
      {
        label: '③ 3-second timeout',
        desc: 'Even if neither of the above conditions is met, LGWR flushes any remaining entries in the buffer every 3 seconds.',
        color: 'amber' as const,
      },
      {
        label: '④ Before DBWn writes',
        desc: "Before DBWn writes a dirty buffer to the Data File, the Redo for that block must already be on disk (WAL principle). DBWn waits for LGWR's flush confirmation before starting its own write.",
        color: 'blue' as const,
      },
      {
        label: '⑤ Checkpoint',
        desc: 'On a Log Switch or manual Checkpoint, LGWR flushes all current buffer contents to disk.',
        color: 'slate' as const,
      },
    ],

    ioTitle: 'Why is writing to the Redo Log faster than writing to the Data File?',
    ioSubTitle: 'The answer lies in the two different I/O patterns.',
    ioRandomLabel: 'Random I/O',
    ioAppendLabel: 'Append (Sequential) I/O',
    ioRandomBadge: 'Data File write',
    ioAppendBadge: 'Redo Log write',
    ioRandomTitle: 'Random I/O — Seeking the exact location each time',
    ioAppendTitle: 'Append I/O — Writing sequentially to the end',
    ioRandomDesc: "When Oracle writes a block to a data file, it calculates exactly where on disk that block lives, then seeks directly to that location. On an HDD, the ARM physically moves there. On an SSD, it resolves the target cell address.\n\nThe problem appears when rows being updated are scattered across the table. Block A → Block Z → Block C → Block M... hopping around in no particular order means more seeks, more latency. That is Random I/O.\n\nRandom I/O will come up again when we cover indexes, joins, and partitioning. For now, just remember: writing to arbitrary disk locations is expensive.",
    ioAppendDesc: "Redo Log Files work differently. Oracle doesn't need to find where a specific block lives — it just appends \"the next thing that happened\" to the end of the file in sequence. The ARM never needs to seek. As the disk spins, the next position naturally arrives under the head.\n\nThis is called Sequential I/O or Append Write. It is far faster than Random I/O, which is why Oracle can afford to flush the Redo Log to disk synchronously at COMMIT without making commits slow.\n\nThe takeaway: \"if you must write to slow disk, write sequentially\" is Oracle's core strategy.",
    ioRandomVisualLabel: 'Seeks A → F → C out of order',
    ioAppendVisualLabel: 'Written 1 → 2 → 3 → 4 → 5, next appended here',
    ioFootnote: 'Random I/O will reappear throughout the indexes, joins, and partitioning chapters. For now, just remember: writing to arbitrary locations is expensive.',

    paramsTitle: 'Key Parameters',
    params: [
      { name: 'LOG_BUFFER', desc: 'Redo Log Buffer size in bytes. Determined automatically based on platform and CPU count. Increase it to reduce log buffer space waits for workloads with large transactions.' },
      { name: 'LOG_ARCHIVE_DEST_n', desc: 'Archive log destination paths in ARCHIVELOG mode. Specifying two or more locations is recommended for availability.' },
      { name: 'ARCHIVE_LAG_TARGET', desc: 'Forces a Log Switch after this many seconds in Data Guard environments, ensuring timely log shipping to standby.' },
    ],

    summaryTitle: 'Redo Log Buffer — Key Takeaways',
    summaryItems: [
      'Circular SGA buffer — all change history (Redo Entries) accumulates here before any disk write',
      'LGWR flushes on: COMMIT · buffer 1/3 full · 3-second timeout · DBWn request · Checkpoint',
      'WAL principle: Redo Log first, Data File second — the foundation of Oracle crash recovery',
      'Append (Sequential) I/O is far faster than Random I/O — keeps COMMIT latency minimal',
      'Redo Entry = SCN + operation code + Before/After Image + block address',
    ],
  },
}

// ── Sub-components ─────────────────────────────────────────────────────────

function WalSection({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  return (
    <div className="rounded-panel border-2 border-amber/30 bg-amber/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-amber px-2.5 py-0.5 text-xs font-bold text-paper">WAL</span>
        <span className="text-sm font-bold text-ink/90">{t.walTitle}</span>
      </div>
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-ink-2">{t.walDesc}</p>
        <ol className="list-none space-y-1.5">
          <li className="flex items-start gap-2 text-sm text-ink-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-paper">
              1
            </span>
            <span>
              <strong className="font-semibold text-ink">{t.walStep1}</strong>{' '}
              — {t.walStep1Desc}
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-ink-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue text-[10px] font-bold text-paper">
              2
            </span>
            <span>
              <strong className="font-semibold text-ink">{t.walStep2}</strong>{' '}
              — {t.walStep2Desc}
            </span>
          </li>
        </ol>
        <p className="text-sm leading-relaxed text-ink-2">
          <strong className="font-semibold text-ink">{t.walConclusion}</strong>
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-2/60">
          {t.walMemOrder}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-card border-2 border-amber/50 bg-amber/5 px-3 py-2 text-center text-xs font-bold text-amber">
            ① Redo Log Buffer
          </div>
          <span className="text-sm text-ink-2">→</span>
          <div className="flex-1 rounded-card border-2 border-blue/50 bg-blue/5 px-3 py-2 text-center text-xs font-bold text-blue">
            ② Buffer Cache
          </div>
        </div>
        <p className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-widest text-ink-2/60">
          {t.walDiskOrder}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-card border-2 border-amber/50 bg-amber/5 px-3 py-2 text-center text-xs font-bold text-amber">
            ① Redo Log File
            <div className="mt-0.5 text-[10px] font-normal opacity-70">{t.walLgwr}</div>
          </div>
          <span className="text-sm text-ink-2">→</span>
          <div className="flex-1 rounded-card border-2 border-line-2 bg-paper-sunk px-3 py-2 text-center text-xs font-bold text-ink">
            ② Data File
            <div className="mt-0.5 text-[10px] font-normal opacity-70">{t.walDbwn}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Circular buffer SVG diagram
function CircularBufferDiagram({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  const TOTAL = 12
  const WRITTEN = 4   // orange filled (written to disk)
  const PENDING = 3   // amber (waiting for LGWR)
  const HEAD_IDX = WRITTEN  // LGWR is here

  const CX = 100
  const CY = 100
  const R = 72
  const SLOT_W = 18
  const SLOT_H = 14

  const slots = Array.from({ length: TOTAL }).map((_, i) => {
    const angle = (2 * Math.PI * i) / TOTAL - Math.PI / 2
    const x = CX + R * Math.cos(angle)
    const y = CY + R * Math.sin(angle)
    let state: 'written' | 'pending' | 'free' = 'free'
    if (i < WRITTEN) state = 'written'
    else if (i < WRITTEN + PENDING) state = 'pending'
    return { x, y, state, angle }
  })

  const headSlot = slots[HEAD_IDX]

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
      <svg viewBox="0 0 200 200" className="w-52 shrink-0">
        {/* Center label */}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize={8} fontFamily="var(--font-sans-active)" fontWeight="bold" fill="var(--color-ink-2)">
          Redo Log
        </text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize={8} fontFamily="var(--font-sans-active)" fontWeight="bold" fill="var(--color-ink-2)">
          Buffer
        </text>

        {/* Slots */}
        {slots.map((s, i) => {
          const fill = s.state === 'written' ? 'var(--color-amber)' : s.state === 'pending' ? 'var(--color-amber)' : 'var(--color-rail)'
          const stroke = s.state === 'written' ? 'var(--color-amber)' : s.state === 'pending' ? 'var(--color-amber)' : 'var(--color-line)'
          return (
            <rect
              key={i}
              x={s.x - SLOT_W / 2}
              y={s.y - SLOT_H / 2}
              width={SLOT_W}
              height={SLOT_H}
              rx={3}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.2}
            />
          )
        })}

        {/* LGWR head indicator */}
        <circle
          cx={headSlot.x}
          cy={headSlot.y}
          r={SLOT_W / 2 + 4}
          fill="none"
          stroke="var(--color-amber)"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <motion.circle
          cx={headSlot.x}
          cy={headSlot.y}
          r={SLOT_W / 2 + 4}
          fill="none"
          stroke="var(--color-amber)"
          strokeWidth={1.5}
          strokeDasharray="3 2"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        />
        <text
          x={headSlot.x}
          y={headSlot.y - SLOT_H / 2 - 6}
          textAnchor="middle"
          fontSize={7}
          fontFamily="var(--font-sans-active)"
          fontWeight="bold"
          fill="var(--color-amber)"
        >
          LGWR
        </text>

        {/* Arrow showing direction */}
        <path
          d={`M ${CX + 18} ${CY - 6} A 18 18 0 0 1 ${CX + 18} ${CY + 6}`}
          fill="none"
          stroke="var(--color-ink-3)"
          strokeWidth={1}
          markerEnd="url(#arrowGray)"
        />
        <defs>
          <marker id="arrowGray" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--color-ink-3)" />
          </marker>
        </defs>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2 text-xs text-ink-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 shrink-0 rounded-chip border border-amber/50 bg-amber/15" />
          <span>{t.slotWritten}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 shrink-0 rounded-chip border border-amber/50 bg-amber/15" />
          <span>{t.slotPending}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 shrink-0 rounded-chip border border-line-2 bg-paper-sunk" />
          <span>{t.slotFree}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-5 shrink-0 rounded-chip border border-dashed border-amber/50 bg-transparent" />
          <span>{t.lgwrHead}</span>
        </div>
        <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed">{t.circularFull}</p>
      </div>
    </div>
  )
}

function FlushSection({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  const colorMap = {
    rose:   { bg: 'bg-red/5',   border: 'border-red/30',   badge: 'bg-red'   },
    amber:  { bg: 'bg-amber/5',  border: 'border-amber/30',  badge: 'bg-amber'  },
    blue:   { bg: 'bg-blue/5',   border: 'border-blue/30',   badge: 'bg-blue'   },
    slate:  { bg: 'bg-paper-sunk',  border: 'border-line',  badge: 'bg-line-2'  },
  }
  return (
    <div className="space-y-2">
      {t.flushTriggers.map((trigger) => {
        const c = colorMap[trigger.color]
        return (
          <div key={trigger.label} className={cn('flex items-start gap-3 rounded-panel border px-4 py-3', c.bg, c.border)}>
            <span className={cn('mt-0.5 shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold text-paper whitespace-nowrap', c.badge)}>
              {trigger.label}
            </span>
            <p className="text-xs leading-relaxed text-ink-2">{trigger.desc}</p>
          </div>
        )
      })}
    </div>
  )
}

function IoComparisonSection({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  const [activeIo, setActiveIo] = useState<IoMode>('random')

  const ioModes: { id: IoMode; label: string }[] = [
    { id: 'random', label: t.ioRandomLabel },
    { id: 'append', label: t.ioAppendLabel },
  ]

  const ioContent = {
    random: {
      badge: t.ioRandomBadge,
      title: t.ioRandomTitle,
      desc: t.ioRandomDesc,
      visual: (
        <div className="relative h-28 w-full overflow-hidden rounded-card border border-line bg-paper-sunk">
          <div className="absolute inset-0 flex items-center justify-center gap-0">
            {(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const).map((label, i) => (
              <div
                key={label}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center border-r border-line font-mono text-xs font-bold',
                  ['A', 'C', 'F'].includes(label)
                    ? 'bg-amber/10 text-amber'
                    : 'bg-paper text-ink-2',
                  i === 7 && 'border-r-0',
                )}
              >
                {label}
              </div>
            ))}
          </div>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 320 112">
            <defs>
              <marker id="arrowAmber2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-amber)" />
              </marker>
            </defs>
            <path d="M20 56 C 20 20, 200 20, 200 56" stroke="var(--color-amber)" strokeWidth="1.5" fill="none" strokeDasharray="4 2" markerEnd="url(#arrowAmber2)" />
            <path d="M200 56 C 200 90, 100 90, 100 56" stroke="var(--color-amber)" strokeWidth="1.5" fill="none" strokeDasharray="4 2" markerEnd="url(#arrowAmber2)" />
          </svg>
          <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-ink-2">
            {t.ioRandomVisualLabel}
          </div>
        </div>
      ),
    },
    append: {
      badge: t.ioAppendBadge,
      title: t.ioAppendTitle,
      desc: t.ioAppendDesc,
      visual: (
        <div className="relative h-28 w-full overflow-hidden rounded-card border border-amber/30 bg-amber/5">
          <div className="absolute inset-0 flex items-center justify-center gap-0">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => (
              <div
                key={n}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center border-r border-amber/30 font-mono text-xs font-bold',
                  n <= 5 ? 'bg-amber/10 text-amber' : n === 6 ? 'bg-amber/25 text-paper ring-2 ring-amber/50' : 'bg-paper text-ink-3',
                  i === 7 && 'border-r-0',
                )}
              >
                {n <= 5 ? n : n === 6 ? '→' : ''}
              </div>
            ))}
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-amber">
            {t.ioAppendVisualLabel}
          </div>
        </div>
      ),
    },
  }

  const active = ioContent[activeIo]

  return (
    <div>
      <div className="mb-1 text-sm font-bold text-ink/90">{t.ioTitle}</div>
      <p className="mb-3 text-sm leading-relaxed text-ink-2">{t.ioSubTitle}</p>
      <div className="mb-4 flex gap-2">
        {ioModes.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveIo(m.id)}
            className={cn(
              'rounded-card border px-4 py-2 text-xs font-bold transition-all',
              activeIo === m.id
                ? m.id === 'random'
                  ? 'border-amber/50 bg-amber text-paper '
                  : 'border-amber/50 bg-amber text-paper '
                : 'border-line bg-paper text-ink-2 hover:border-line-2 hover:text-ink',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIo}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden rounded-panel border border-line bg-paper"
        >
          <div className={cn('flex items-center gap-2.5 border-b border-line px-5 py-3', activeIo === 'random' ? 'bg-amber/5' : 'bg-amber/5')}>
            <span className={cn('rounded px-2.5 py-0.5 text-xs font-bold text-paper', activeIo === 'random' ? 'bg-amber' : 'bg-amber')}>
              {active.badge}
            </span>
            <span className="text-sm font-bold text-ink">{active.title}</span>
          </div>
          <div className="space-y-4 px-5 py-4">
            {active.visual}
            <Prose>{active.desc}</Prose>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-3 rounded-card border border-line bg-rail px-4 py-2.5 text-xs text-ink-2">
        💡 {t.ioFootnote}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function RedoLogBufferSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]

  return (
    <div className="mx-auto max-w-screen-2xl px-10 py-10">
      <ChapterTitle title={t.title} subtitle={t.subtitle} />

      <OracleArchitectureDiagram scope="sga" highlightIds={['redo-buffer']} />

      {/* ── What is ── */}
      <SectionTitle>{t.whatTitle}</SectionTitle>
      <div className="space-y-2 mb-6">
        <Prose>{t.whatP1}</Prose>
        <Prose>{t.whatP2}</Prose>
        <Prose>{t.whatP3}</Prose>
      </div>

      <Divider />

      {/* ── Redo Entry structure ── */}
      <SectionTitle>{t.entryTitle}</SectionTitle>
      <Prose className="mb-4">{t.entryDesc}</Prose>
      <div className="mb-4 overflow-hidden rounded-panel border bg-paper">
        {t.entryFields.map((f, i) => (
          <div key={f.label} className={cn('flex items-start gap-4 px-5 py-3', i > 0 && 'border-t')}>
            <code className="mt-0.5 shrink-0 rounded bg-amber/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber whitespace-nowrap">
              {f.label}
            </code>
            <p className="text-xs leading-relaxed text-ink-2">{f.desc}</p>
          </div>
        ))}
      </div>
      <InfoBox variant="note">{t.entryNote}</InfoBox>

      <Divider />

      {/* ── Circular buffer ── */}
      <SectionTitle>{t.circularTitle}</SectionTitle>
      <Prose className="mb-5">{t.circularDesc}</Prose>
      <CircularBufferDiagram lang={lang} />

      <Divider />

      {/* ── WAL ── */}
      <SectionTitle>{t.walTitle}</SectionTitle>
      <div className="mb-6">
        <WalSection lang={lang} />
      </div>

      <Divider />

      {/* ── LGWR flush triggers ── */}
      <SectionTitle>{t.flushTitle}</SectionTitle>
      <Prose className="mb-4">{t.flushDesc}</Prose>
      <FlushSection lang={lang} />

      <Divider />

      {/* ── I/O comparison ── */}
      <IoComparisonSection lang={lang} />

      <Divider />

      {/* ── Parameters ── */}
      <SectionTitle>{t.paramsTitle}</SectionTitle>
      <div className="mb-6 overflow-hidden rounded-panel border bg-paper">
        {t.params.map((p, i) => (
          <div key={p.name} className={cn('flex items-start gap-4 px-5 py-3', i > 0 && 'border-t')}>
            <code className="mt-0.5 shrink-0 rounded bg-amber/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber">
              {p.name}
            </code>
            <p className="text-xs leading-relaxed text-ink-2">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Summary ── */}
      <div className="rounded-panel border border-line border-l-[3px] border-l-amber bg-paper-sunk px-6 py-5">
        <div className="mb-3"><SubTitle>{t.summaryTitle}</SubTitle></div>
        <ul className="space-y-1.5">
          {t.summaryItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
