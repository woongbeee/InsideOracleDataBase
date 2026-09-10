import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'
import { ChapterTitle, SectionTitle, Prose, InfoBox, Divider, SubTitle, SqlBlock, StepList } from '../../../../shared'
import { cn } from '@/lib/utils'
import { OracleArchitectureDiagram } from '@/book/chapters/internals/shared/OracleArchitectureDiagram'
import type { ArchComponentId } from '@/book/chapters/internals/shared/OracleArchitectureDiagram'
import {
  IconDatabase,
  IconLayersLinked,
  IconBolt,
  IconRefresh,
} from '@tabler/icons-react'

// ── Translation strings ────────────────────────────────────────────────────

const T = {
  ko: {
    title: 'Buffer Cache',

    whatTitle: 'Buffer Cache가 뭐예요?',
    whatP1:
      '디스크에 저장된 데이터 파일에서 데이터 블록들을 복사해 저장해두는 곳이에요. 버퍼 캐시에 있는 데이터를 요청하면 디스크를 거치지 않고 메모리에서 즉시 꺼내줘요.',
    whatP2:
      '메모리와 디스크의 속도 차이는 수천~수만 배에 달해요. Buffer Cache의 Hit Ratio(캐시 적중률)가 높을수록 데이터를 불러오는 속도가 빨라요. DBA가 가장 먼저 살피는 성능 지표 중 하나예요.',
    whatP3:
      'Buffer Cache 안의 각 단위 블록을 "버퍼(buffer)"라고 불러요. 하나의 버퍼는 디스크의 한 데이터 블록(기본 8KB)과 1:1로 대응돼요. 버퍼에는 블록 내용 외에도 상태 정보·주소·LRU 리스트 포인터 같은 메타데이터가 함께 담긴 헤더가 붙어 있어요.',

    whyTitle: '왜 Buffer Cache가 필요할까요? — 디스크와 메모리의 속도 차이!',

    statesTitle: '버퍼 상태',
    statesDesc: '각 버퍼는 세 가지 상태 중 하나를 가져요.',
    stateUnused: 'Unused (미사용)',
    stateUnusedDesc:
      '아직 한 번도 사용되지 않은 버퍼예요. 인스턴스 시작 직후 Buffer Cache는 Unused 버퍼로 가득 차 있어요.',
    stateClean: 'Clean (정합)',
    stateCleanDesc:
      '디스크 내용과 동일한 버퍼예요. 수정되지 않았거나, 수정 후 DBWn(데이터베이스 라이터)이 디스크에 기록을 완료한 상태예요. 재사용 대상이에요.',
    stateDirty: 'Dirty (변경됨)',
    stateDirtyDesc:
      '메모리에서 수정됐지만 아직 디스크에 반영되지 않은 버퍼예요. DBWn이 Checkpoint 신호를 받거나 Dirty 리스트가 길어지면 디스크에 써요.',

    modesTitle: '버퍼 액세스 모드',
    modesDesc: 'Oracle은 두 가지 방식으로 버퍼에 접근해요.',
    scnNote:
      'SCN(System Change Number, 시스템 변경 번호)은 Oracle이 트랜잭션 순서를 기록하는 타임스탬프 같은 번호예요. 변경이 일어날 때마다 1씩 올라가며, "이 시점에 커밋된 데이터"를 정확히 특정하는 데 써요. 자세한 내용은 뒤에서 다뤄요.',
    modeCurrent: 'Current Mode (db block get)',
    modeCurrentDesc:
      'DML이 블록을 직접 수정하기 위해 Buffer Cache에서 블록을 가져오는 방식이에요. "현재 버전"이라는 뜻은 미커밋 데이터를 반환한다는 의미가 아니라, 물리적 블록 자체를 잠그고 그 위에 변경을 쓴다는 의미예요. Dirty Read와는 전혀 달라요.',
    modeCurrentExample:
      'A가 같은 블록의 Row 2개를 수정하고 아직 COMMIT하지 않은 상태예요. B가 같은 블록에 UPDATE를 실행하면 Current Mode로 블록을 가져와요. B는 A의 미커밋 데이터를 "읽어서 결과로 받는" 게 아니라, 같은 블록에 자신의 Row 3 변경을 덧써요. Row Lock으로 A와 B의 수정 대상이 겹치지 않도록 보호돼요.',
    modeCurrentScenario: [
      'A: Row 1 → "Alice" (미커밋)',
      'A: Row 2 → "Bob"   (미커밋)',
      'B: UPDATE → Current Mode로 블록 획득 → Row 3 수정',
    ],
    modeConsistent: 'Consistent Mode (consistent get)',
    modeConsistentDesc:
      '쿼리가 시작된 시점의 SCN을 기준으로 일관된 스냅샷을 읽어요. 다른 트랜잭션이 블록을 수정 중이면 Oracle이 Undo로 이전 버전을 재구성해요. SELECT에서 사용해요.',
    modeConsistentExample:
      '같은 상황에서 C가 SELECT를 실행해요. 쿼리 시작 시점의 SCN이 A의 수정 이전이므로, Oracle은 A의 Undo 데이터를 이용해 수정 전 값으로 블록을 재구성해서 돌려줘요.',
    modeConsistentScenario: [
      'A: Row 1, 2 수정 중 (미커밋, SCN 1005)',
      'C: SELECT 시작 (SCN 1000 기준)',
      'Oracle: Undo 적용 → Row 1, 2를 수정 전 값으로 재구성',
      'C: 깨끗한 스냅샷 수신 (A의 변경 안 보임)',
    ],

    lruTitle: '버퍼를 관리하는 LRU 알고리즘과 Touch Count',
    lruP1:
      'LRU(Least Recently Used)는 "가장 오래 전에 사용된 것을 먼저 내보낸다"는 알고리즘이에요. 데이터에 마지막으로 접근한 시간만을 기준으로 버퍼를 관리해요.',
    lruP2:
      'Oracle은 여기서 한 발 더 나아가 Touch Count라는 개념을 추가했어요. 접근한 시간뿐 아니라 얼마나 자주 접근했는지(빈도)까지 함께 고려해서, 자주 쓰이는 블록은 오래 살아남고 한 번만 읽히는 블록은 빨리 내보내도록 해요.',
    lruP3:
      'LRU 리스트는 Hot End(자주 접근)와 Cold End(드물게 접근) 두 쪽으로 나뉘어요. 새로 올라온 블록은 Hot End와 Cold End 사이의 경계인 midpoint에 삽입돼요. 접근할 때마다 Touch Count가 올라가고, 임계값(기본 2)을 넘으면 Hot End로 승격돼요. 3초 이내 재접근은 카운트하지 않으며, 전체 테이블 스캔 시에도 동일하게 midpoint에 삽입해서 Hot End의 중요 블록이 밀려나지 않도록 해요.',
    touchTitle: 'Touch Count 규칙',
    touchRule1: '동일 블록 접근 시 Touch Count +1',
    touchRule2: '단, 3초 이내 재접근은 카운트 안 해요 (Pin 상태)',
    touchRule3: 'Touch Count ≥ 임계값 → Hot End로 이동',
    touchRule4: 'Full Table Scan → Cold End 중간 삽입 (중요 블록 보호)',

    poolsTitle: 'Buffer Pool 구성',
    poolsDesc:
      'Database Buffer Cache는 하나 이상의 Buffer Pool로 구성돼요. 각 Pool은 독립된 LRU 리스트를 가져요.',
    poolDefault: 'Default Pool',
    poolDefaultDesc:
      '모든 버퍼가 기본으로 올라오는 Pool이에요. DB_CACHE_SIZE 파라미터로 크기를 설정해요.',
    poolKeep: 'Keep Pool',
    poolKeepDesc:
      '자주 접근하는 작은 테이블·인덱스를 상주시키는 Pool이에요. LRU에 의해 밀려나지 않게 보호해요. DB_KEEP_CACHE_SIZE로 설정해요.',
    poolRecycle: 'Recycle Pool',
    poolRecycleDesc:
      '크고 거의 재사용되지 않는 세그먼트를 위한 Pool이에요. 빠르게 재활용해서 Default Pool을 보호해요. DB_RECYCLE_CACHE_SIZE로 설정해요.',
    poolNonStd: '비표준 블록 크기 Pool',
    poolNonStdDesc:
      'Oracle의 기본 블록 크기는 8KB예요. 그런데 특정 테이블스페이스를 2K·4K·16K·32K 블록으로 만들면, 그 블록은 기본 Default Pool에 올라오지 않아요. 블록 크기가 다른 버퍼들이 같은 Pool을 공유하면 관리가 복잡해지기 때문이에요. 대신 Oracle은 해당 크기에 맞는 별도의 Pool을 SGA 안에 따로 만들어서 거기에 보관해요. 예를 들어 16K 블록 테이블스페이스가 있다면 DB_16K_CACHE_SIZE 파라미터로 16K 전용 Pool 크기를 설정해야 해당 블록이 메모리에 올라올 수 있어요.',
    poolDefaultSql: `-- 기본값. 별도 지정 없으면 Default Pool에 캐시됨\nCREATE TABLE orders (...) STORAGE (BUFFER_POOL DEFAULT);\nALTER TABLE orders STORAGE (BUFFER_POOL DEFAULT);`,
    poolKeepSql: `-- 자주 쓰는 소형 테이블을 LRU로부터 보호\nCREATE TABLE small_lookup (...) STORAGE (BUFFER_POOL KEEP);\nALTER TABLE small_lookup STORAGE (BUFFER_POOL KEEP);`,
    poolRecycleSql: `-- 크고 재사용 빈도가 낮은 세그먼트\nCREATE TABLE large_hist (...) STORAGE (BUFFER_POOL RECYCLE);\nALTER TABLE large_hist STORAGE (BUFFER_POOL RECYCLE);`,

    fullScanTitle: 'Full Table Scan과 Direct Path Read',
    fullScanP1:
      '작은 테이블의 Full Scan: Cold End 중간에 삽입해요. 빠르게 재접근할 가능성이 있어서 Cache에 올려둬요.',
    fullScanP2:
      '큰 테이블의 Full Scan: Oracle이 임계값(DB_FILE_MULTIBLOCK_READ_COUNT × Block size)을 초과하는 세그먼트에 대해 Direct Path Read를 수행해요. Buffer Cache를 완전히 건너뛰고 PGA로 직접 읽어서 캐시를 오염시키지 않아요.',
    fullScanNote:
      'Direct Path Read는 11g부터 직렬 Full Scan에도 자동으로 적용돼요. V$SQL_PLAN의 access 항목에서 direct path read 이벤트를 확인할 수 있어요.',

    paramsTitle: '주요 파라미터',
    param1: 'DB_CACHE_SIZE',
    param1Desc:
      'Default Pool 크기예요. ASMM(SGA_TARGET 설정) 시 자동 조정돼요.',
    param2: 'DB_KEEP_CACHE_SIZE',
    param2Desc: 'Keep Pool 크기예요. 0이면 Keep Pool이 없어요.',
    param3: 'DB_RECYCLE_CACHE_SIZE',
    param3Desc: 'Recycle Pool 크기예요. 0이면 Recycle Pool이 없어요.',
    param4: 'DB_nK_CACHE_SIZE',
    param4Desc:
      '비표준 블록 크기(2K/4K/16K/32K) Pool 크기예요. 해당 블록 크기의 테이블스페이스가 있을 때만 설정해요.',

    dbwnTitle: 'Dirty 버퍼는 어떻게 디스크에 기록될까요? — DBWn 쓰기 흐름',
    dbwnDesc:
      'Buffer Cache에 수정된 Dirty 버퍼는 즉시 디스크에 쓰이지 않아요. DBWn(Database Writer, 데이터베이스 라이터)이 적절한 시점에 일괄로 써요. 이 과정에서 CKPT(체크포인트), LGWR(로그 라이터), Redo Log Buffer, Online Redo Log가 함께 관여해요.',
    dbwnSteps: [
      {
        ids: ['buffer-cache'] as ArchComponentId[],
        title: 'Dirty 버퍼 누적',
        desc: '트랜잭션이 블록을 수정하면 Buffer Cache 안의 해당 버퍼가 Dirty 상태가 돼요. Dirty 버퍼는 Dirty List(LRUW 리스트)에 등록되어 DBWn이 쓸 차례를 기다려요.',
      },
      {
        ids: ['redo-buffer'] as ArchComponentId[],
        title: 'Redo 항목 생성',
        desc: '블록 수정과 동시에 변경 내용(Before/After Image)을 담은 Redo 항목이 Redo Log Buffer에 기록돼요. 이 기록이 있어야 장애 시 복구가 가능해요.',
      },
      {
        ids: ['ckpt', 'dbwr'] as ArchComponentId[],
        title: 'CKPT → DBWn 신호',
        desc: 'Checkpoint가 발생하면 CKPT(체크포인트) 프로세스가 DBWn에게 Dirty 버퍼를 디스크에 쓰도록 신호를 보내요. Checkpoint는 Log Switch·설정 시간 초과·SHUTDOWN 등에 의해 트리거돼요.',
      },
      {
        ids: ['lgwr', 'redo-buffer', 'redo-log-file'] as ArchComponentId[],
        title: 'LGWR Write-Ahead',
        desc: 'DBWn이 Dirty 버퍼를 디스크에 쓰기 전, 해당 버퍼와 관련된 Redo 항목이 먼저 Online Redo Log 파일에 기록되어야 해요(WAL — Write-Ahead Logging). LGWR(로그 라이터)가 Redo Log Buffer의 내용을 Online Redo Log에 플러시한 뒤 DBWn에게 완료를 알려요.',
      },
      {
        ids: ['dbwr', 'data-file'] as ArchComponentId[],
        title: 'DBWn → Data Files',
        desc: 'LGWR가 Redo를 먼저 기록한 뒤, DBWn이 Dirty 버퍼들을 Data Files에 써요. 기록된 버퍼는 Clean 상태가 되어 재사용할 수 있어요.',
      },
      {
        ids: ['ckpt', 'control-file', 'data-file'] as ArchComponentId[],
        title: 'CKPT → 헤더 갱신',
        desc: 'DBWn 쓰기가 완료되면 CKPT가 Control File과 Data File 헤더의 Checkpoint SCN을 갱신해요. 이 SCN 이전 데이터는 디스크에 안전하게 보존되어 있다는 뜻이에요.',
      },
    ],
    dbwnNote:
      'WAL(Write-Ahead Logging) 원칙: Redo가 먼저, 데이터가 나중. DBWn이 Data File에 쓰기 전 LGWR가 반드시 Redo Log에 먼저 기록해야 해요. 이 순서가 지켜져야만 장애 시 Redo 로그로 복구할 수 있어요.',

    summaryTitle: 'Buffer Cache 핵심 정리',
    summaryItems: [
      'Buffer Cache는 SGA의 가장 큰 구성요소로, 디스크 데이터 블록을 메모리에 캐시해요.',
      '버퍼 상태: Unused → Clean / Dirty (DBWn이 Dirty를 디스크에 써요)',
      'Current Mode = 최신 블록 (DML용), Consistent Mode = SCN 기준 일관 읽기 (SELECT용)',
      'LRU + Touch Count: Hot End ↔ Cold End, 3초 규칙, Full Scan은 Cold End 중간 삽입',
      'Buffer Pool: Default / Keep / Recycle + 비표준 블록 크기 Pool',
    ],
  },
  en: {
    title: 'Buffer Cache',

    whatTitle: 'What is the Buffer Cache?',
    whatP1:
      'A place that copies and holds data blocks from the data files stored on disk. When data in the Buffer Cache is requested, Oracle returns it immediately from memory — no disk access needed.',
    whatP2:
      'The speed gap between memory and disk is thousands to tens of thousands of times. The higher the Buffer Cache Hit Ratio, the faster data retrieval becomes. It is one of the first performance metrics a DBA examines.',
    whatP3:
      'Each unit inside the Buffer Cache is called a "buffer." One buffer maps 1:1 to one data block on disk (8 KB by default). Each buffer has a header containing metadata: state flags, block address, and LRU list pointers.',

    whyTitle: 'Why Buffer Cache Exists — The Speed Gap Between Disk and Memory',

    statesTitle: 'Buffer States',
    statesDesc: 'Each buffer is in exactly one of three states.',
    stateUnused: 'Unused',
    stateUnusedDesc:
      'A buffer that has never been used. Right after instance startup, the Buffer Cache is full of Unused buffers.',
    stateClean: 'Clean',
    stateCleanDesc:
      'The buffer matches its on-disk version — either it was never modified, or DBWn has already written it to disk. A candidate for reuse.',
    stateDirty: 'Dirty',
    stateDirtyDesc:
      'Modified in memory but not yet written to disk. DBWn flushes Dirty buffers when triggered by a Checkpoint signal or when the Dirty list grows too long.',

    modesTitle: 'Buffer Access Modes',
    modesDesc: 'Oracle accesses buffers in two distinct modes.',
    scnNote:
      'SCN (System Change Number) is a sequential number Oracle increments with every change — think of it as a transaction timestamp. It lets Oracle pinpoint exactly which version of data was committed at a given moment. More detail comes later.',
    modeCurrent: 'Current Mode (db block get)',
    modeCurrentDesc:
      'The mode DML uses to acquire the physical block in the Buffer Cache for in-place modification. "Current" means Oracle locks the actual block and writes changes directly onto it — not that uncommitted data is returned to anyone. This is completely different from a dirty read.',
    modeCurrentExample:
      "A has modified 2 rows in the same block and has not yet committed. B issues an UPDATE on the same block. Oracle fetches the block in Current Mode — B is not receiving A's uncommitted data as a query result; it is writing its own change (Row 3) onto the same physical block. Row-level locks ensure A's and B's modifications target different rows.",
    modeCurrentScenario: [
      'A: Row 1 → "Alice" (uncommitted)',
      'A: Row 2 → "Bob"   (uncommitted)',
      'B: UPDATE → acquires block in Current Mode → modifies Row 3',
    ],
    modeConsistent: 'Consistent Mode (consistent get)',
    modeConsistentDesc:
      'Reads a snapshot of the block consistent with the SCN at which the query started. If another transaction has modified the block, Oracle reconstructs the older version using Undo data. Used by SELECT.',
    modeConsistentExample:
      "In the same situation, C runs a SELECT. Its query-start SCN predates A's changes. Oracle applies A's Undo records to reconstruct the block as it looked before the modifications, and returns that clean snapshot to C.",
    modeConsistentScenario: [
      'A: modifying Row 1, 2 (uncommitted, SCN 1005)',
      'C: SELECT starts (reads as of SCN 1000)',
      'Oracle: applies Undo → reconstructs Row 1, 2 to pre-change values',
      "C: receives clean snapshot (A's changes invisible)",
    ],

    lruTitle: 'LRU Algorithm and Touch Count',
    lruP1:
      'LRU (Least Recently Used) is an algorithm that evicts whichever buffer was accessed least recently — in other words, it manages buffers based purely on when each block was last touched.',
    lruP2:
      'Oracle goes one step further by introducing Touch Count. Rather than considering only recency, Oracle also tracks access frequency — blocks that are accessed often stay in cache longer, while blocks read only once are evicted quickly.',
    lruP3:
      "The LRU list is split into a Hot End (frequently accessed) and a Cold End (rarely accessed). Newly loaded blocks are inserted at the midpoint — the boundary between Hot End and Cold End. Each access increments the block's Touch Count; once it exceeds the threshold (default: 2), the block is promoted to the Hot End. Re-access within 3 seconds does not count, and Full Table Scan blocks are also inserted at the midpoint to prevent them from evicting important Hot End data.",
    touchTitle: 'Touch Count Rules',
    touchRule1: 'Access to a block → Touch Count +1',
    touchRule2:
      'Re-access within 3 seconds (while pinned) → does not increment',
    touchRule3: 'Touch Count ≥ threshold → promote to Hot End',
    touchRule4:
      'Full Table Scan → insert at Cold End midpoint (protects hot blocks)',

    poolsTitle: 'Buffer Pool Structure',
    poolsDesc:
      'The Database Buffer Cache can consist of one or more Buffer Pools, each with its own independent LRU list.',
    poolDefault: 'Default Pool',
    poolDefaultDesc:
      'The pool where all buffers land by default. Sized with DB_CACHE_SIZE. Auto-managed under ASMM.',
    poolKeep: 'Keep Pool',
    poolKeepDesc:
      'Keeps frequently accessed small tables and indexes in memory, protecting them from LRU eviction. Sized with DB_KEEP_CACHE_SIZE.',
    poolRecycle: 'Recycle Pool',
    poolRecycleDesc:
      'For large segments that are rarely reused. Recycles quickly to protect the Default Pool. Sized with DB_RECYCLE_CACHE_SIZE.',
    poolNonStd: 'Non-Standard Block Size Pools',
    poolNonStdDesc:
      "Oracle's default block size is 8KB. If you create a tablespace with a different block size — 2K, 4K, 16K, or 32K — those blocks cannot go into the Default Pool. Mixing different block sizes in a single pool would make buffer management far too complicated. Instead, Oracle maintains a separate pool in the SGA for each non-standard block size. For example, if you have a 16K-block tablespace, you must set DB_16K_CACHE_SIZE to give that pool some memory — otherwise Oracle has nowhere to cache those blocks.",
    poolDefaultSql: `-- Default. Cached here unless explicitly assigned\nCREATE TABLE orders (...) STORAGE (BUFFER_POOL DEFAULT);\nALTER TABLE orders STORAGE (BUFFER_POOL DEFAULT);`,
    poolKeepSql: `-- Pin small, frequently accessed tables in memory\nCREATE TABLE small_lookup (...) STORAGE (BUFFER_POOL KEEP);\nALTER TABLE small_lookup STORAGE (BUFFER_POOL KEEP);`,
    poolRecycleSql: `-- Large, rarely reused segments\nCREATE TABLE large_hist (...) STORAGE (BUFFER_POOL RECYCLE);\nALTER TABLE large_hist STORAGE (BUFFER_POOL RECYCLE);`,

    fullScanTitle: 'Full Table Scan and Direct Path Read',
    fullScanP1:
      'Small table full scan: blocks are inserted at the Cold End midpoint — they may be accessed again soon, so they stay in cache.',
    fullScanP2:
      'Large table full scan: for segments exceeding a threshold (DB_FILE_MULTIBLOCK_READ_COUNT × block size), Oracle performs a Direct Path Read. It reads directly into the PGA, bypassing the Buffer Cache entirely — no cache pollution.',
    fullScanNote:
      'Since 11g, Direct Path Read can be applied automatically to serial full scans. Check V$SQL_PLAN for "direct path read" wait events.',

    paramsTitle: 'Key Parameters',
    param1: 'DB_CACHE_SIZE',
    param1Desc:
      'Default Pool size. Auto-managed when ASMM is active (SGA_TARGET set).',
    param2: 'DB_KEEP_CACHE_SIZE',
    param2Desc: 'Keep Pool size. 0 means no Keep Pool.',
    param3: 'DB_RECYCLE_CACHE_SIZE',
    param3Desc: 'Recycle Pool size. 0 means no Recycle Pool.',
    param4: 'DB_nK_CACHE_SIZE',
    param4Desc:
      'Pool size for non-standard block sizes (2K/4K/16K/32K). Only set if a tablespace with that block size exists.',

    dbwnTitle:
      'How Do Dirty Buffers Get Written to Disk? — The DBWn Write Flow',
    dbwnDesc:
      'Dirty buffers in the Buffer Cache are not written to disk immediately. DBWn (Database Writer) batches them and flushes at the right moment — with CKPT, LGWR, the Redo Log Buffer, and Online Redo Logs all playing a role.',
    dbwnSteps: [
      {
        ids: ['buffer-cache'] as ArchComponentId[],
        title: 'Dirty Buffers Accumulate',
        desc: 'When a transaction modifies a block, the corresponding buffer in the Buffer Cache becomes Dirty. Dirty buffers are added to the Dirty List (LRUW list) and wait for DBWn to write them out.',
      },
      {
        ids: ['redo-buffer'] as ArchComponentId[],
        title: 'Redo Entries Generated',
        desc: 'As each block is modified, a redo entry capturing the before and after image is written to the Redo Log Buffer. These entries make crash recovery possible.',
      },
      {
        ids: ['ckpt', 'dbwr'] as ArchComponentId[],
        title: 'CKPT Signals DBWn',
        desc: 'When a checkpoint fires, the CKPT process signals DBWn to flush dirty buffers to disk. Checkpoints are triggered by log switches, the checkpoint interval timeout, or a SHUTDOWN command.',
      },
      {
        ids: ['lgwr', 'redo-buffer', 'redo-log-file'] as ArchComponentId[],
        title: 'LGWR Write-Ahead',
        desc: 'Before DBWn writes any dirty buffer to disk, the redo entries for those buffers must already be in the Online Redo Log files — this is the WAL (Write-Ahead Logging) guarantee. LGWR flushes the Redo Log Buffer to the Online Redo Logs first, then signals DBWn that it is safe to proceed.',
      },
      {
        ids: ['dbwr', 'data-file'] as ArchComponentId[],
        title: 'DBWn → Data Files',
        desc: 'Once LGWR has secured the redo, DBWn writes the dirty buffers to the Data Files. Each written buffer transitions back to Clean and becomes available for reuse.',
      },
      {
        ids: ['ckpt', 'control-file', 'data-file'] as ArchComponentId[],
        title: 'CKPT Updates Headers',
        desc: 'After DBWn finishes writing, CKPT updates the Checkpoint SCN in the Control File and in each Data File header. Any data block up to this SCN is guaranteed to be safely on disk.',
      },
    ],
    dbwnNote:
      'WAL (Write-Ahead Logging): Redo first, data second. LGWR must write to the Redo Log before DBWn writes to the Data File. Only then can Oracle reconstruct any lost changes from the redo log on crash recovery.',

    summaryTitle: 'Buffer Cache Key Takeaways',
    summaryItems: [
      "Buffer Cache is the SGA's largest component, caching disk data blocks in memory.",
      'Buffer states: Unused → Clean / Dirty (DBWn writes Dirty buffers to disk)',
      'Current Mode = latest block (for DML), Consistent Mode = SCN-consistent read (for SELECT)',
      'LRU + Touch Count: Hot End ↔ Cold End, 3-second rule, Full Scan inserts at Cold End midpoint',
      'Buffer Pools: Default / Keep / Recycle + non-standard block size pools',
    ],
  },
}

// ── Why Buffer Cache (disk vs memory) ─────────────────────────────────────

function WhyBufferCacheContent({ lang }: { lang: 'ko' | 'en' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}memory.png`}
      alt={lang === 'ko' ? '디스크와 메모리 속도 비교 일러스트' : 'Disk vs Memory speed illustration'}
      className="w-[70%] rounded-panel border object-contain"
    />
  )
}

// ── Figure 16-7: Buffer Pool Diagram ──────────────────────────────────────

function BufferPoolDiagram({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  const [activePool, setActivePool] = useState<string | null>(null)
  const [nonStdOpen, setNonStdOpen] = useState(false)

  const pools = [
    {
      id: 'default',
      label: 'Default Pool',
      param: 'DB_CACHE_SIZE',
      color: 'border-blue/50 bg-blue/5 text-blue',
      activeColor: 'border-blue bg-blue/10 ring-2 ring-blue/50',
      desc: t.poolDefaultDesc,
      sql: t.poolDefaultSql,
      flex: 'flex-[3]',
    },
    {
      id: 'keep',
      label: 'Keep Pool',
      param: 'DB_KEEP_CACHE_SIZE',
      color: 'border-green/50 bg-green/5 text-green',
      activeColor: 'border-green bg-green/10 ring-2 ring-green/50',
      desc: t.poolKeepDesc,
      sql: t.poolKeepSql,
      flex: 'flex-[2]',
    },
    {
      id: 'recycle',
      label: 'Recycle Pool',
      param: 'DB_RECYCLE_CACHE_SIZE',
      color: 'border-red/50 bg-red/5 text-red',
      activeColor: 'border-red bg-red/10 ring-2 ring-red/50',
      desc: t.poolRecycleDesc,
      sql: t.poolRecycleSql,
      flex: 'flex-[2]',
    },
  ]

  const nonStdPools = [
    { label: '2K', param: 'DB_2K_CACHE_SIZE', color: 'border-amber/30 bg-amber/5 text-amber' },
    { label: '4K', param: 'DB_4K_CACHE_SIZE', color: 'border-amber/30 bg-amber/5 text-amber' },
    { label: '8K (default)', param: '—', color: 'border-blue/30 bg-blue/5 text-blue' },
    { label: '16K', param: 'DB_16K_CACHE_SIZE', color: 'border-amber/30 bg-amber/5 text-amber' },
    { label: '32K', param: 'DB_32K_CACHE_SIZE', color: 'border-amber/30 bg-amber/5 text-amber' },
  ]

  const active = pools.find((p) => p.id === activePool)

  return (
    <div className="flex flex-col gap-4">
      {/* ── 다이어그램 ── */}
      <div className="rounded-panel border-2 border-line-2 bg-paper-sunk p-5">
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-2">
          Database Buffer Cache
        </div>

        <div className="mb-3 flex gap-2">
          {pools.map((p) => {
            const isActive = activePool === p.id
            return (
              <motion.button
                key={p.id}
                onClick={() => { setActivePool((prev) => (prev === p.id ? null : p.id)); setNonStdOpen(false) }}
                animate={isActive ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                transition={isActive ? { repeat: Infinity, duration: 1.4, repeatDelay: 0.4 } : {}}
                className={cn(
                  p.flex,
                  'cursor-pointer rounded-panel border-2 px-3 py-3 text-left transition-all',
                  isActive ? p.activeColor : p.color,
                )}
              >
                <div className="font-mono text-[11px] font-bold leading-tight">{p.label}</div>
                <div className="mt-1 font-mono text-[9px] opacity-70">{p.param}</div>
              </motion.button>
            )
          })}
        </div>

        <button
          onClick={() => { setNonStdOpen((v) => !v); setActivePool(null) }}
          className="w-full cursor-pointer rounded-panel border border-line bg-paper/60 px-4 py-3 text-left transition-colors hover:bg-paper-sunk"
        >
          <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-ink-2">
            {t.poolNonStd}
          </div>
          <div className="flex gap-1.5">
            {nonStdPools.map((p) => (
              <div key={p.label} className={cn('flex-1 rounded-card border px-2 py-1.5 text-center', p.color)}>
                <div className="font-mono text-[10px] font-bold">{p.label}</div>
                <div className="truncate font-mono text-[8px] opacity-60">{p.param}</div>
              </div>
            ))}
          </div>
        </button>
      </div>

      {/* ── 클릭 설명 패널 ── */}
      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="rounded-panel border border-line bg-paper px-4 py-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-ink/80">{active.label}</span>
              <span className="text-ink-2/40">·</span>
              <span className="font-mono text-[10px] text-ink-2">{active.param}</span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-ink-2">{active.desc}</p>
            <SqlBlock sql={active.sql} />
          </motion.div>
        ) : nonStdOpen ? (
          <motion.div
            key="nonstd-desc"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="rounded-panel border border-line bg-paper px-4 py-3"
          >
            <div className="mb-2 font-mono text-xs font-bold text-ink/80">{t.poolNonStd}</div>
            <p className="text-xs leading-relaxed text-ink-2">{t.poolNonStdDesc}</p>
          </motion.div>
        ) : (
          <motion.div
            key="pool-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-10 items-center justify-center rounded-panel border-2 border-dashed border-line"
          >
            <span className="font-mono text-[11px] text-ink-2">
              {lang === 'ko' ? '↑ Pool을 클릭해 설명을 확인하세요' : '↑ Click a pool to see details'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


// ── DBWn Write Flow ────────────────────────────────────────────────────────

function DbwnWriteFlow({ lang }: { lang: 'ko' | 'en' }) {
  const t = T[lang]
  const [activeStep, setActiveStep] = useState(0)
  const step = t.dbwnSteps[activeStep]

  return (
    <div className="flex gap-6">
      <div className="w-[480px] shrink-0">
        <OracleArchitectureDiagram highlightIds={step.ids} hideClient />
      </div>
      <div className="flex-1">
        <StepList
          steps={t.dbwnSteps}
          activeIndex={activeStep}
          onStepClick={setActiveStep}
        />
      </div>
    </div>
  )
}

// ── LRU List Visual ────────────────────────────────────────────────────────

function LruDiagram({ lang }: { lang: 'ko' | 'en' }) {
  type BufItem =
    | { id: string; label: string; touch: number; hot: boolean; evict?: boolean; mid?: false }
    | { id: string; mid: true }

  const buffers: BufItem[] = [
    { id: 'h1', label: lang === 'ko' ? '블록 A' : 'Block A', touch: 5, hot: true },
    { id: 'h2', label: lang === 'ko' ? '블록 B' : 'Block B', touch: 4, hot: true },
    { id: 'h3', label: lang === 'ko' ? '블록 C' : 'Block C', touch: 3, hot: true },
    { id: 'mid', mid: true },
    { id: 'c1', label: lang === 'ko' ? '블록 D (신규)' : 'Block D (new)', touch: 1, hot: false },
    { id: 'c2', label: lang === 'ko' ? '블록 E' : 'Block E', touch: 1, hot: false },
    { id: 'c3', label: lang === 'ko' ? '블록 F' : 'Block F', touch: 0, hot: false, evict: true },
  ]

  return (
    <div className="rounded-panel border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-2">
          LRU List
        </span>
        <div className="flex gap-3 font-mono text-[10px] text-ink-2">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue" />
            Hot End
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-line-2" />
            Cold End
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {buffers.map((b) => {
          if (b.mid) {
            return (
              <div key={b.id} className="flex flex-col items-center">
                <div className="h-8 w-px border-l-2 border-dashed border-amber/50" />
                <span className="mt-0.5 whitespace-nowrap font-mono text-[8px] text-amber">midpoint</span>
              </div>
            )
          }
          return (
            <div
              key={b.id}
              className={cn(
                'flex-1 rounded-card border-2 px-2 py-1.5 text-center transition-all',
                b.hot
                  ? 'border-blue/50 bg-blue/5 text-blue'
                  : b.evict
                  ? 'border-dashed border-red/50 bg-red/5 text-red'
                  : 'border-line bg-paper-sunk text-ink',
              )}
            >
              <div className="truncate font-mono text-[9px] font-bold leading-tight">{b.label}</div>
              <div className={cn('mt-0.5 font-mono text-[8px]', b.hot ? 'text-blue' : 'text-ink-2')}>
                touch: {b.touch}
              </div>
              {b.evict && (
                <div className="font-mono text-[8px] text-red">{lang === 'ko' ? '퇴출 대상' : 'evict'}</div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9px] text-ink-2/60">
        <span>← {lang === 'ko' ? 'Hot End (자주 사용)' : 'Hot End (frequently used)'}</span>
        <span>{lang === 'ko' ? 'Cold End (오래됨)' : 'Cold End (stale)'} →</span>
      </div>
    </div>
  )
}

// ── Main Section ───────────────────────────────────────────────────────────

export function SgaBufferCacheSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]

  return (
    <div className="mx-auto max-w-screen-2xl px-10 py-10">
      <ChapterTitle
        icon={<IconDatabase size={36} stroke={1.5} className="text-blue" />}
        title={t.title}
      />

      <OracleArchitectureDiagram scope="sga" highlightIds={['buffer-cache']} />

      {/* ── 1. What is Buffer Cache ── */}
      <SectionTitle>{t.whatTitle}</SectionTitle>
      <Prose>{t.whatP1}</Prose>
      <Prose>{t.whatP3}</Prose>

      <Divider />

      {/* ── 2. Why Buffer Cache ── */}
      <SectionTitle>{t.whyTitle}</SectionTitle>
      <WhyBufferCacheContent lang={lang} />
      <div className="mt-4">
        <Prose>{t.whatP2}</Prose>
      </div>

      <Divider />

      {/* ── 3. Buffer Pools ── */}
      <SectionTitle>{t.poolsTitle}</SectionTitle>
      <Prose>{t.poolsDesc}</Prose>
      <BufferPoolDiagram lang={lang} />

      <Divider />

      {/* ── 4. LRU + Touch Count ── */}
      <SectionTitle>{t.lruTitle}</SectionTitle>
      <Prose>{t.lruP1}</Prose>
      <Prose>{t.lruP2}</Prose>
      <Prose>{t.lruP3}</Prose>

      <LruDiagram lang={lang} />

      <div className="mt-4 overflow-hidden rounded-panel border">
        <div className="flex items-center gap-2 border-b border-line bg-rail px-4 py-2">
          <span className="rounded border border-line-2 bg-paper-sunk px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink-2">
            {t.touchTitle}
          </span>
        </div>
        {([t.touchRule1, t.touchRule2, t.touchRule3, t.touchRule4] as const).map((rule, i) => (
          <div key={i} className={cn('flex items-start gap-3 border-b px-4 py-2.5 text-xs last:border-0', i % 2 === 0 ? 'bg-paper' : 'bg-rail')}>
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue font-mono text-[9px] font-bold text-paper">{i + 1}</span>
            <span className="leading-relaxed text-ink-2">{rule}</span>
          </div>
        ))}
      </div>

      <Divider />

      {/* ── 5. Buffer States ── */}
      <SectionTitle>{t.statesTitle}</SectionTitle>
      <Prose>{t.statesDesc}</Prose>

      <div className="mb-4 grid sm:grid-cols-3 gap-3">
        {([
          {
            label: t.stateUnused,
            desc: t.stateUnusedDesc,
            color: 'border-line-2 bg-paper-sunk',
            dot: 'bg-line-2',
          },
          {
            label: t.stateClean,
            desc: t.stateCleanDesc,
            color: 'border-green/50 bg-green/5',
            dot: 'bg-green',
          },
          {
            label: t.stateDirty,
            desc: t.stateDirtyDesc,
            color: 'border-amber/50 bg-amber/5',
            dot: 'bg-amber',
          },
        ] as const).map((s) => (
          <div key={s.label} className={cn('rounded-panel border-2 p-4', s.color)}>
            <div className="mb-2 flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', s.dot)} />
              <span className="font-mono text-xs font-bold">{s.label}</span>
            </div>
            <p className="text-xs leading-relaxed text-ink-2">{s.desc}</p>
          </div>
        ))}
      </div>

      <InfoBox variant="note">
        {lang === 'ko' ? (
          <>버퍼는 <strong>Pinned</strong>(현재 사용 중)와 <strong>Free</strong>(즉시 재사용 가능) 두 가지 액세스 상태도 가져요. Pinned 버퍼는 다른 프로세스가 수정 중이므로 잠깐 기다려야 해요.</>
        ) : (
          <>A buffer also has two access states: <strong>Pinned</strong> (currently in use) and <strong>Free</strong> (available immediately). Pinned buffers must be waited on while another process is modifying them.</>
        )}
      </InfoBox>

      <Divider />

      {/* ── 5. Buffer Access Modes ── */}
      <SectionTitle>{t.modesTitle}</SectionTitle>
      <Prose>{t.modesDesc}</Prose>

      <div className="mb-4 grid sm:grid-cols-2 gap-3">
        {/* Current Mode */}
        <div className="rounded-panel border-2 border-blue/30 bg-blue/5 overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="mb-1.5 flex items-center gap-2">
              <IconBolt size={16} className="text-blue" />
              <span className="font-mono text-xs font-bold">{t.modeCurrent}</span>
            </div>
            <div className="mb-2 font-mono text-[10px] text-ink-2">db block get</div>
            <p className="text-xs leading-relaxed text-ink-2">{t.modeCurrentDesc}</p>
          </div>
          <div className="border-t border-blue/30 bg-blue/5 px-4 py-3">
            <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-blue">
              {lang === 'ko' ? '예시 시나리오' : 'Example scenario'}
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-ink-2">{t.modeCurrentExample}</p>
            <div className="space-y-1">
              {t.modeCurrentScenario.map((line, i) => (
                <div key={i} className="flex items-start gap-2 font-mono text-[10px]">
                  <span className={cn(
                    'mt-0.5 shrink-0 rounded px-1 py-px text-[8px] font-bold',
                    i === 2 ? 'bg-blue text-paper' : 'bg-blue/10 text-blue',
                  )}>
                    {i === 2 ? 'B' : 'A'}
                  </span>
                  <span className="leading-snug text-ink-2">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Consistent Mode */}
        <div className="rounded-panel border-2 border-green/30 bg-green/5 overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="mb-1.5 flex items-center gap-2">
              <IconRefresh size={16} className="text-green" />
              <span className="font-mono text-xs font-bold">{t.modeConsistent}</span>
            </div>
            <div className="mb-2 font-mono text-[10px] text-ink-2">consistent get</div>
            <p className="text-xs leading-relaxed text-ink-2">{t.modeConsistentDesc}</p>
          </div>
          <div className="border-t border-green/30 bg-green/5 px-4 py-3">
            <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-green">
              {lang === 'ko' ? '예시 시나리오' : 'Example scenario'}
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-ink-2">{t.modeConsistentExample}</p>
            <div className="space-y-1">
              {t.modeConsistentScenario.map((line, i) => (
                <div key={i} className="flex items-start gap-2 font-mono text-[10px]">
                  <span className={cn(
                    'mt-0.5 shrink-0 rounded px-1 py-px text-[8px] font-bold',
                    i === 2 ? 'bg-amber text-paper' : i === 3 ? 'bg-green text-paper' : 'bg-green/10 text-green',
                  )}>
                    {i === 0 ? 'A' : i === 1 ? 'C' : i === 2 ? 'Undo' : (lang === 'ko' ? '결과' : 'result')}
                  </span>
                  <span className="leading-snug text-ink-2">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <InfoBox variant="note">{t.scnNote}</InfoBox>

      <Divider />

      {/* ── DBWn Write Flow ── */}
      <SectionTitle>{t.dbwnTitle}</SectionTitle>
      <Prose>{t.dbwnDesc}</Prose>
      <DbwnWriteFlow lang={lang} />
      <InfoBox variant="warning">{t.dbwnNote}</InfoBox>

      <Divider />

      {/* ── 10. Full Table Scan ── */}
      <SectionTitle>{t.fullScanTitle}</SectionTitle>

      <div className="mb-4 grid sm:grid-cols-2 gap-3">
        {([
          {
            icon: <IconLayersLinked size={16} className="text-green" />,
            label: lang === 'ko' ? '작은 테이블 Full Scan' : 'Small Table Full Scan',
            desc: t.fullScanP1,
            color: 'border-green/30 bg-green/5',
          },
          {
            icon: <IconDatabase size={16} className="text-ink-2" />,
            label: lang === 'ko' ? '큰 테이블 Full Scan (Direct Path)' : 'Large Table Full Scan (Direct Path)',
            desc: t.fullScanP2,
            color: 'border-line bg-paper-sunk',
          },
        ] as const).map((item) => (
          <div key={item.label} className={cn('rounded-panel border-2 p-4', item.color)}>
            <div className="mb-1.5 flex items-center gap-2">
              {item.icon}
              <span className="font-mono text-xs font-bold">{item.label}</span>
            </div>
            <p className="text-xs leading-relaxed text-ink-2">{item.desc}</p>
          </div>
        ))}
      </div>

      <InfoBox variant="tip">{t.fullScanNote}</InfoBox>

      <Divider />

      {/* ── 11. Key Parameters ── */}
      <SectionTitle>{t.paramsTitle}</SectionTitle>

      <div className="overflow-hidden rounded-panel border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-rail">
              <th className="w-[220px] px-4 py-2.5 text-left font-mono font-bold text-ink-2">
                {lang === 'ko' ? '파라미터' : 'Parameter'}
              </th>
              <th className="px-4 py-2.5 text-left font-mono font-bold text-ink-2">
                {lang === 'ko' ? '설명' : 'Description'}
              </th>
            </tr>
          </thead>
          <tbody>
            {([
              { p: t.param1, d: t.param1Desc },
              { p: t.param2, d: t.param2Desc },
              { p: t.param3, d: t.param3Desc },
              { p: t.param4, d: t.param4Desc },
            ] as const).map((row, i) => (
              <tr key={i} className={cn('border-b last:border-0', i % 2 === 0 ? 'bg-paper' : 'bg-rail')}>
                <td className="px-4 py-2.5 font-mono font-bold text-ink/80">{row.p}</td>
                <td className="px-4 py-2.5 text-ink-2">{row.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Divider />

      {/* ── Summary ── */}
      <SubTitle>{t.summaryTitle}</SubTitle>
      <InfoBox variant="summary">
        <ul className="list-none space-y-1">
          {t.summaryItems.map((item, i) => (
            <li key={i}>• {item}</li>
          ))}
        </ul>
      </InfoBox>
    </div>
  )
}
