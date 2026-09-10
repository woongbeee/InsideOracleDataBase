import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'
import { ChapterTitle, Prose, InfoBox } from '../../shared'
import { OracleArchitectureDiagram } from '../shared/OracleArchitectureDiagram'
import type { ArchComponentId } from '../shared/OracleArchitectureDiagram'
import { cn } from '@/lib/utils'

// ── Tour items ─────────────────────────────────────────────────────────────

type DetailRow = { termKo: string; termEn: string; descKo: string; descEn: string }

type TourEntry = {
  mapId: ArchComponentId        // OracleArchitectureDiagram에서 data-arch-id와 1:1 대응
  highlightIds: ArchComponentId[] // 다이어그램에서 하이라이트할 블록들
  labelKo: string
  labelEn: string
  titleKo: string
  titleEn: string
  descKo: string
  descEn: string
  details: DetailRow[]
  accentCls: string
  badgeCls: string
}

const TOUR: TourEntry[] = [
  {
    mapId: 'server-process',
    highlightIds: ['server-process'],
    labelKo: 'Server Process',
    labelEn: 'Server Process',
    titleKo: 'Server Process — 내 SQL을 대신 처리해 주는 담당자',
    titleEn: "Server Process — Your SQL's Personal Agent",
    descKo: '내가 SQL을 보내면 Oracle은 그 요청만 전담하는 Server Process를 하나 만들어 줍니다. 마치 식당에서 "이 테이블만 담당하는 웨이터"가 배정되는 것처럼요. 이 프로세스가 SQL이 무슨 뜻인지 해석하고, 가장 빠른 방법을 찾아서, 실제로 데이터를 꺼내 돌려줍니다.',
    descEn: 'When you send a SQL statement, Oracle creates a Server Process dedicated to your request — like a waiter assigned just to your table. It interprets your SQL, finds the fastest way to execute it, fetches the data, and returns the results.',
    details: [
      {
        termKo: 'Dedicated Server (전용 서버)',
        termEn: 'Dedicated Server',
        descKo: '연결 1개당 프로세스 1개가 딱 붙습니다. 가장 흔한 방식이고, 항상 나만 전담하니 응답이 빠릅니다. 다만 접속자가 수천 명이면 프로세스도 수천 개 뜨기 때문에 메모리를 많이 잡아먹습니다.',
        descEn: 'One process is assigned per connection — the most common setup. Your process is always yours, so response is fast. The downside: thousands of connections mean thousands of processes, consuming a lot of memory.',
      },
      {
        termKo: 'Shared Server (공유 서버)',
        termEn: 'Shared Server',
        descKo: '여러 세션이 소수의 프로세스 풀을 돌아가며 써요. 접속자는 많은데 실제 동시 작업은 별로 없을 때 메모리를 아낄 수 있어요. 단, 요청이 한꺼번에 몰리면 대기가 생길 수 있어요.',
        descEn: 'Multiple sessions share a small pool of processes in rotation. Saves memory when there are many connections but few simultaneous active requests. The trade-off: requests may queue when the pool is busy.',
      },
    ],
    accentCls: 'border-green/30 bg-green/5',
    badgeCls: 'bg-green',
  },
  {
    mapId: 'pga',
    highlightIds: ['pga'],
    labelKo: 'PGA',
    labelEn: 'PGA',
    titleKo: 'PGA — 나만 쓰는 개인 작업 공간',
    titleEn: 'PGA — Your Session\'s Private Workspace',
    descKo: 'PGA(Program Global Area)는 Server Process 하나가 독차지하는 메모리 공간이에요. 다른 세션과 절대 나눠 쓰지 않는 "나만의 책상" 같은 곳이에요. SQL을 실행하는 동안 필요한 임시 계산 공간이 모두 여기서 이루어져요.',
    descEn: 'Program Global Area — memory owned exclusively by one Server Process. It is your private workspace, never shared with other sessions. All temporary computation needed while your SQL runs happens here.',
    details: [
      {
        termKo: 'Sort Area (정렬 공간)',
        termEn: 'Sort Area',
        descKo: 'ORDER BY나 GROUP BY를 처리할 때 행들을 임시로 정렬하는 공간이에요. PGA가 충분하면 메모리에서 정렬이 끝나지만, 부족하면 디스크(Temp Tablespace)에 결과를 쓰고 다시 읽는 작업이 생겨서 쿼리가 훨씬 느려져요.',
        descEn: 'The space used to sort rows for ORDER BY or GROUP BY. If PGA is large enough, sorting stays in memory. If not, Oracle spills to disk (Temp Tablespace), which can make a query many times slower.',
      },
      {
        termKo: 'Hash Join Area (해시 조인 공간)',
        termEn: 'Hash Join Area',
        descKo: '두 테이블을 Hash Join으로 합칠 때, 작은 쪽 테이블을 메모리에 해시 테이블 형태로 올려두는 공간이에요. 공간이 부족하면 이 역시 디스크로 넘쳐 성능이 뚝 떨어져요.',
        descEn: 'When joining two tables with a hash join, the smaller table is loaded into memory as a hash table here. If there is not enough room, it spills to disk and performance degrades.',
      },
      {
        termKo: 'Bind Variable 값',
        termEn: 'Bind Variable Values',
        descKo: 'SQL에서 :name 형태로 쓰는 바인드 변수의 실제 값을 세션별로 보관해요. 바인드 변수를 쓰면 SQL 문장 자체가 바뀌지 않아서 Library Cache에 저장된 커서를 재사용할 수 있어요.',
        descEn: 'Stores the actual values of bind variables (:name placeholders) per session. Using bind variables keeps the SQL text identical across executions, allowing the Library Cache to reuse the cursor.',
      },
      {
        termKo: 'Cursor State (커서 상태)',
        termEn: 'Cursor State',
        descKo: '커서(Cursor)란 SQL 실행의 현재 위치를 추적하는 포인터예요. 예를 들어 SELECT 결과를 한꺼번에 다 가져오지 않고 한 줄씩 읽을 때, "지금 몇 번째 행까지 읽었는지"를 여기에 기억해 둬요.',
        descEn: 'A cursor is a pointer that tracks the current position in a SQL execution. For example, when fetching rows one at a time from a SELECT, this area remembers how far through the result set you have read.',
      },
    ],
    accentCls: 'border-green/30 bg-green/5',
    badgeCls: 'bg-green',
  },
  {
    mapId: 'sga',
    highlightIds: ['sga'],
    labelKo: 'SGA',
    labelEn: 'SGA',
    titleKo: 'SGA — 모든 세션이 함께 쓰는 공용 메모리',
    titleEn: 'SGA — The Shared Memory Arena',
    descKo: 'SGA(System Global Area)는 Oracle 인스턴스가 켜질 때 운영체제에서 한 번에 통째로 빌려오는 공용 메모리예요. 모든 Server Process와 Background Process가 이 메모리를 함께 읽고 써요. PGA가 "나만 쓰는 방"이라면 SGA는 "모두가 쓰는 공용 라운지"예요.',
    descEn: 'System Global Area — a large block of memory allocated from the OS when the Oracle instance starts. Every server and background process reads and writes this shared space. If PGA is your private room, SGA is the shared lounge everyone uses.',
    details: [
      {
        termKo: 'Shared Pool',
        termEn: 'Shared Pool',
        descKo: 'SQL을 처음 실행할 때 분석한 결과(파싱 트리·실행 계획)와 테이블·컬럼 구조 정보를 저장해 둬요. 같은 SQL이 다시 들어오면 이 결과를 재사용해서 분석 비용을 확 줄여줘요.',
        descEn: 'Stores the results of analysing SQL (parse tree and execution plan) and table/column structure information. When the same SQL arrives again, these results are reused to avoid re-analysis.',
      },
      {
        termKo: 'Buffer Cache (버퍼 캐시)',
        termEn: 'Buffer Cache',
        descKo: '디스크에서 읽어 온 데이터 블록(Oracle이 데이터를 저장하는 최소 단위, 기본 8KB)을 메모리에 보관해요. 같은 데이터를 다시 읽을 때 디스크 대신 여기서 꺼내면 수천 배 빠르게 가져올 수 있어요.',
        descEn: 'Keeps data blocks (Oracle\'s smallest storage unit, 8 KB by default) in memory after reading them from disk. Serving the same block from here instead of disk is thousands of times faster.',
      },
      {
        termKo: 'Redo Log Buffer (리두 로그 버퍼)',
        termEn: 'Redo Log Buffer',
        descKo: '데이터를 변경할 때마다 "무엇을 어떻게 바꿨는지"를 기록하는 임시 메모리 공간이에요. Background Process인 LGWR(Log Writer, 로그 라이터)가 이 내용을 주기적으로 디스크의 Redo Log File에 써요.',
        descEn: 'A temporary memory area that records "what changed and how" each time data is modified. The LGWR process periodically flushes these records to the on-disk Redo Log Files.',
      },
      {
        termKo: 'Large Pool',
        termEn: 'Large Pool',
        descKo: 'RMAN(Recovery Manager) 백업·복구, 병렬 쿼리, Shared Server의 UGA처럼 크고 일회성인 메모리 요청을 전담하는 선택적 영역이에요. 이런 작업을 Shared Pool에서 처리하면 Library Cache가 밀려날 수 있어서, 따로 분리해 둔 거예요.',
        descEn: 'An optional area for large, one-time memory requests such as RMAN backup/recovery, parallel query, and UGA for Shared Server. Isolating these from the Shared Pool prevents them from crowding out the Library Cache.',
      },
    ],
    accentCls: 'border-blue/30 bg-blue/5',
    badgeCls: 'bg-blue',
  },
  {
    mapId: 'shared-pool',
    highlightIds: ['shared-pool'],
    labelKo: 'Shared Pool',
    labelEn: 'Shared Pool',
    titleKo: 'Shared Pool — SQL 분석 결과와 테이블 구조 정보 캐시',
    titleEn: 'Shared Pool — Cache for SQL Analysis and Table Structure',
    descKo: 'SQL을 실행하려면 Oracle이 먼저 두 가지를 알아야 해요. 첫째, "이 SQL의 뜻이 뭐고, 어떻게 실행하면 제일 빠를까(파싱·최적화)". 둘째, "이 테이블엔 어떤 컬럼이 있고 인덱스는 뭔가(딕셔너리 조회)". Shared Pool은 이 두 결과를 캐시해 두어, 같은 SQL이 다시 들어올 때 처음부터 다시 분석하는 수고를 덜어줍니다.',
    descEn: 'Before Oracle can run any SQL, it needs two things: first, "what does this SQL mean and what is the fastest execution plan?" (parsing and optimisation); second, "what columns and indexes does this table have?" (dictionary lookup). The Shared Pool caches both results so the same work is not repeated when the same SQL arrives again.',
    details: [
      {
        termKo: '파싱(Parsing)이란?',
        termEn: 'What is Parsing?',
        descKo: 'SQL 문장을 받으면 Oracle은 먼저 문법이 맞는지 확인하고, 테이블과 컬럼이 실제로 존재하는지 검사한 다음, "어떤 순서로 테이블을 읽고 어떤 인덱스를 쓸지"를 결정해요. 이 전체 과정을 파싱(Parsing)이라 해요. 파싱 결과는 커서(Cursor)라는 객체로 Library Cache에 저장돼요.',
        descEn: 'When Oracle receives a SQL statement, it checks syntax, verifies that tables and columns exist, then decides the access order and which indexes to use. This whole process is called parsing. The result is stored as a cursor object in the Library Cache.',
      },
      {
        termKo: 'Library Cache',
        termEn: 'Library Cache',
        descKo: '파싱이 끝난 커서(실행 계획 포함)를 저장해 둬요. 완전히 똑같은 SQL이 다시 들어오면 파싱을 건너뛰고 저장된 커서를 재사용해요(Soft Parse). 글자 하나라도 다르면 새 커서를 만들어야 해요(Hard Parse). 그래서 바인드 변수(:id, :name)를 쓰면 값이 달라도 SQL 문장은 똑같으니까 Soft Parse가 가능해요.',
        descEn: 'Stores finished cursors (including execution plans). If the exact same SQL text arrives again, Oracle skips parsing and reuses the stored cursor (Soft Parse). Even one character difference forces a new cursor (Hard Parse). This is why bind variables (:id, :name) matter — the SQL text stays identical even when values change, enabling Soft Parse.',
      },
      {
        termKo: '딕셔너리(Dictionary)란?',
        termEn: 'What is the Dictionary?',
        descKo: 'Oracle이 관리하는 내부 메타데이터 저장소예요. "EMPLOYEES 테이블엔 어떤 컬럼이 있나", "이 유저에겐 어떤 권한이 있나", "이 인덱스는 어느 컬럼에 걸려 있나" 같은 정보가 모두 여기에 있어요. 파싱 중에 Oracle이 수시로 들여다보는 일종의 설계도면이에요.',
        descEn: 'Oracle\'s internal metadata store. It answers questions like "what columns does EMPLOYEES have?", "what privileges does this user hold?", "which column is this index on?". Oracle consults it constantly during parsing — it is the blueprint of the entire database structure.',
      },
      {
        termKo: 'Dictionary Cache (Row Cache)',
        termEn: 'Dictionary Cache (Row Cache)',
        descKo: '딕셔너리는 원래 SYSTEM Tablespace의 디스크 파일에 있어요. SQL을 실행할 때마다 디스크에서 읽으면 너무 느리기 때문에, 자주 쓰는 딕셔너리 정보를 행(Row) 단위로 메모리에 올려 둔 게 Dictionary Cache예요. Row Cache라고도 불러요.',
        descEn: 'The dictionary itself lives on disk in the SYSTEM Tablespace. Reading it from disk on every SQL execution would be far too slow, so the Dictionary Cache (also called the Row Cache) keeps frequently used dictionary rows in memory for fast access.',
      },
    ],
    accentCls: 'border-blue/30 bg-blue/5',
    badgeCls: 'bg-blue',
  },
  {
    mapId: 'bg-processes',
    highlightIds: ['bg-processes'],
    labelKo: 'Background Processes',
    labelEn: 'Background Processes',
    titleKo: 'Background Processes — 보이지 않는 곳에서 일하는 관리자들',
    titleEn: 'Background Processes — The Invisible Managers',
    descKo: 'Oracle 인스턴스가 켜지면 사용자 요청과 상관없이 자동으로 실행되는 시스템 프로세스들이에요. 이들이 없으면 메모리의 변경 내용이 디스크에 저장되지 않고, 서버가 꺼졌을 때 데이터를 복구할 수도 없고, 비정상 종료된 세션이 잠가둔 데이터를 아무도 못 쓰게 돼요.',
    descEn: 'System processes that start automatically when the Oracle instance starts and run in the background independently of user requests. Without them, memory changes would never reach disk, crash recovery would be impossible, and locks held by dead sessions would never be released.',
    details: [
      {
        termKo: 'DBWn (Database Writer)',
        termEn: 'DBWn (Database Writer)',
        descKo: 'Buffer Cache에서 데이터를 바꾸면 그 블록은 "더러워진(Dirty)" 상태가 돼요. DBWn(데이터베이스 라이터)이 이 Dirty 블록들을 모아 디스크의 데이터 파일(.dbf)에 써요. 매번 바꿀 때마다 디스크에 쓰면 너무 느리니, 적절한 시점에 모아서 처리하는 방식이에요.',
        descEn: 'When data is modified in the Buffer Cache, the block becomes "dirty". DBWn collects these dirty blocks and writes them to the on-disk data files (.dbf). Writing to disk on every change would be too slow, so DBWn batches the writes at appropriate intervals.',
      },
      {
        termKo: 'LGWR (Log Writer)',
        termEn: 'LGWR (Log Writer)',
        descKo: 'Redo Log Buffer에 쌓인 변경 기록을 디스크의 Redo Log File에 써요. 중요한 건, COMMIT을 실행하면 반드시 LGWR(로그 라이터)이 해당 변경 기록을 디스크에 써야 COMMIT이 완료돼요. 덕분에 서버가 갑자기 꺼져도 커밋된 데이터는 복구할 수 있어요.',
        descEn: 'Writes redo records from the Redo Log Buffer to the on-disk Redo Log Files. Critically, a COMMIT is not complete until LGWR has written the corresponding records to disk. This guarantees that committed data can always be recovered even after a crash.',
      },
      {
        termKo: 'CKPT (Checkpoint)',
        termEn: 'CKPT (Checkpoint)',
        descKo: '체크포인트란 "이 시점까지의 변경은 모두 디스크에 반영됐다"는 도장을 찍는 작업이에요. CKPT(체크포인트)는 이 시점(SCN)을 컨트롤 파일에 기록해요. 서버가 다시 켜질 때 이 시점 이후의 Redo만 재실행하면 되니, 체크포인트가 자주 일어날수록 복구 시간이 짧아져요.',
        descEn: 'A checkpoint marks the point up to which all changes have been written to disk. CKPT records this point (as an SCN) in the control file. On restart, Oracle only needs to re-apply redo from that point forward — so more frequent checkpoints mean faster recovery.',
      },
      {
        termKo: 'SMON (System Monitor)',
        termEn: 'SMON (System Monitor)',
        descKo: '서버가 비정상 종료된 뒤 다시 켜지면 SMON(시스템 모니터)이 Redo Log를 읽어 커밋된 변경을 재적용하고(Instance Recovery), Undo로 미완료 트랜잭션을 롤백해요. 정렬·조인 도중 남겨진 임시 세그먼트도 함께 정리해요.',
        descEn: 'When the server restarts after a crash, SMON reads the Redo Log to re-apply committed changes (Instance Recovery) and uses Undo to roll back uncommitted transactions. It also cleans up temporary segments left over from sort and join operations.',
      },
      {
        termKo: 'PMON (Process Monitor)',
        termEn: 'PMON (Process Monitor)',
        descKo: '네트워크 끊김 등으로 세션이 비정상 종료되면, 그 세션이 걸어둔 락과 점유한 메모리가 그대로 남아요. PMON(프로세스 모니터)이 이를 감지해 트랜잭션을 롤백하고 리소스를 해제해요. 덕분에 다른 세션이 그 데이터를 다시 쓸 수 있게 돼요.',
        descEn: 'When a user session terminates abnormally (e.g. a network drop), its locks and memory remain held. PMON detects this, rolls back the abandoned transaction, and releases all resources — allowing other sessions to access the data again.',
      },
      {
        termKo: 'ARCn (Archiver)',
        termEn: 'ARCn (Archiver)',
        descKo: 'Redo Log File은 순환하며 재사용돼요. 재사용되기 전에 ARCn(아카이버)이 그 내용을 아카이브 로그로 복사해 둬요. 아카이브 로그가 있으면 "3일 전 오전 9시 상태로 복원"처럼 특정 시점으로 되돌리는 Point-in-Time Recovery가 가능해요. ARCHIVELOG 모드일 때만 동작해요.',
        descEn: 'Redo Log Files are reused in rotation. Before a file is overwritten, ARCn copies its contents to an archive log. Having archive logs enables Point-in-Time Recovery — restoring the database to an exact past moment, such as "9 AM three days ago". ARCn only runs in ARCHIVELOG mode.',
      },
    ],
    accentCls: 'border-amber/30 bg-amber/5',
    badgeCls: 'bg-amber',
  },
  {
    mapId: 'database',
    highlightIds: ['database'],
    labelKo: 'Disk Storage',
    labelEn: 'Disk Storage',
    titleKo: 'Disk Storage — 전원이 꺼져도 사라지지 않는 영구 저장소',
    titleEn: 'Disk Storage — Persistent Storage That Survives Power Loss',
    descKo: '메모리(SGA·PGA)는 전원이 끊기면 내용이 전부 사라져요. 반면 디스크에 저장된 파일은 서버가 꺼졌다 켜져도 그대로 남아있어요. Oracle의 모든 데이터는 결국 디스크 파일에 영구적으로 기록되고, 이 파일들이 Oracle Database의 실체예요.',
    descEn: 'Memory (SGA and PGA) loses all its content when power is cut. Disk files, however, survive a restart. Every piece of Oracle data is ultimately written to disk files — these files are the actual Oracle Database.',
    details: [
      {
        termKo: 'Data Files (.dbf) — 데이터 파일',
        termEn: 'Data Files (.dbf)',
        descKo: '테이블과 인덱스의 실제 데이터가 저장되는 파일이에요. Tablespace라는 논리적 단위로 묶여서 관리돼요. 예를 들어 USERS Tablespace는 users01.dbf 파일로 구성될 수 있어요. Buffer Cache는 이 파일에서 블록을 메모리로 올려 빠르게 접근해요.',
        descEn: 'The files where actual table and index data is stored. They are grouped under logical units called Tablespaces — for example, the USERS Tablespace might consist of a users01.dbf file. The Buffer Cache loads blocks from these files into memory for fast access.',
      },
      {
        termKo: 'Redo Log Files (.log) — 변경 기록 파일',
        termEn: 'Redo Log Files (.log)',
        descKo: '"무엇을 언제 어떻게 바꿨는지"를 기록한 파일이에요. 서버가 갑자기 꺼졌을 때 SMON이 이 파일을 읽어 커밋된 변경을 디스크에 다시 반영해요(Instance Recovery). Redo Log는 최소 2개 그룹이 순환하며 재사용돼요.',
        descEn: 'Records "what changed, when, and how". After a crash, SMON reads these files to re-apply committed changes to the data files (Instance Recovery). Redo Log files are organised in at least two groups that cycle in rotation.',
      },
      {
        termKo: 'Control File (.ctl) — 지도 파일',
        termEn: 'Control File (.ctl)',
        descKo: 'Oracle Database의 구조 정보를 담은 파일이에요. "데이터 파일이 어디 있나", "마지막 체크포인트 SCN이 얼마인가", "DB 이름이 뭔가" 같은 정보가 여기에 있어요. Oracle은 시작할 때 이 파일을 제일 먼저 읽어서 나머지 파일 위치를 파악해요. 손상되면 복구가 매우 어렵기 때문에 여러 복사본을 유지하는 게 권장돼요.',
        descEn: 'The file that holds Oracle\'s structural information: where the data files are, the latest checkpoint SCN, the database name, and more. Oracle reads this file first on startup to locate everything else. Corruption is very hard to recover from, so keeping multiple copies is strongly recommended.',
      },
      {
        termKo: 'Archive Logs — 아카이브 로그',
        termEn: 'Archive Logs',
        descKo: 'Redo Log File이 꽉 차서 재사용되기 전에 ARCn이 복사해 둔 파일이에요. 최신 백업 + 아카이브 로그를 함께 쓰면 "며칠 전 특정 시각 상태로 복원"이 가능해져요. 운영 환경에서는 거의 항상 ARCHIVELOG 모드를 켜서 이 파일을 생성해요.',
        descEn: 'Copies of Redo Log Files made by ARCn before they are overwritten. Combined with a recent backup, archive logs enable Point-in-Time Recovery — restoring the database to any specific past moment. Production databases are almost always run in ARCHIVELOG mode to generate these files.',
      },
    ],
    accentCls: 'border-line bg-paper-sunk',
    badgeCls: 'bg-ink-3',
  },
  // ── SGA 하위 개별 영역 ────────────────────────────────────────────────────
  {
    mapId: 'buffer-cache',
    highlightIds: ['buffer-cache'],
    labelKo: 'Buffer Cache',
    labelEn: 'Buffer Cache',
    titleKo: 'Database Buffer Cache — 디스크 데이터의 메모리 사본',
    titleEn: 'Database Buffer Cache — In-Memory Copies of Disk Data',
    descKo: '디스크에서 읽어 온 데이터 블록(Oracle이 데이터를 저장하는 최소 단위, 기본 8KB)을 메모리에 보관해요. 같은 데이터를 다시 읽을 때 디스크 대신 여기서 꺼내면 수천 배 빠르게 가져올 수 있어요. 오래 안 쓰인 블록은 LRU(Least Recently Used) 방식으로 밀려나요.',
    descEn: "Keeps data blocks (Oracle's smallest storage unit, 8 KB by default) in memory after reading them from disk. Serving the same block from here instead of disk is thousands of times faster. Blocks that go unused the longest are evicted first (LRU).",
    details: [],
    accentCls: 'border-blue/30 bg-blue/5',
    badgeCls: 'bg-blue',
  },
  {
    mapId: 'redo-buffer',
    highlightIds: ['redo-buffer'],
    labelKo: 'Redo Log Buffer',
    labelEn: 'Redo Log Buffer',
    titleKo: 'Redo Log Buffer — 변경 이력을 잠깐 담아두는 순환 버퍼',
    titleEn: 'Redo Log Buffer — A Circular Buffer for Change History',
    descKo: '데이터를 변경할 때마다 "무엇을 어떻게 바꿨는지"를 기록하는 임시 메모리 공간이에요. Background Process인 LGWR(Log Writer, 로그 라이터)가 이 내용을 주기적으로 디스크의 Redo Log File에 써요. 버퍼가 꽉 차면 앞부분부터 순환해서 재사용돼요.',
    descEn: 'A temporary memory area that records "what changed and how" each time data is modified. The LGWR process periodically flushes these records to the on-disk Redo Log Files. Once full, the buffer wraps around and reuses space from the start.',
    details: [],
    accentCls: 'border-amber/30 bg-amber/5',
    badgeCls: 'bg-amber',
  },
  {
    mapId: 'large-pool',
    highlightIds: ['large-pool'],
    labelKo: 'Large Pool',
    labelEn: 'Large Pool',
    titleKo: 'Large Pool — 크고 일회성인 메모리 요청 전담 공간',
    titleEn: 'Large Pool — Dedicated Space for Large, One-Time Requests',
    descKo: 'RMAN(Recovery Manager) 백업·복구, 병렬 쿼리, Shared Server의 UGA처럼 크고 일회성인 메모리 요청을 전담하는 선택적 영역이에요. 이런 작업을 Shared Pool에서 처리하면 Library Cache가 밀려날 수 있어서, 따로 분리해 둔 거예요.',
    descEn: 'An optional area for large, one-time memory requests such as RMAN backup/recovery, parallel query, and UGA for Shared Server. Isolating these from the Shared Pool prevents them from crowding out the Library Cache.',
    details: [],
    accentCls: 'border-green/30 bg-green/5',
    badgeCls: 'bg-green',
  },
  {
    mapId: 'java-pool',
    highlightIds: ['java-pool'],
    labelKo: 'Java Pool',
    labelEn: 'Java Pool',
    titleKo: 'Java Pool — JVM 세션이 쓰는 전용 메모리',
    titleEn: 'Java Pool — Memory Reserved for the JVM',
    descKo: 'Oracle 안에서 자바 스토어드 프로시저(Java Stored Procedure)를 실행할 때, JVM(Java Virtual Machine)이 클래스 정의나 세션별 상태를 올려두는 공간이에요. 자바 기반 기능을 쓰지 않으면 거의 비어 있는 영역이에요.',
    descEn: 'When Oracle runs Java stored procedures internally, the JVM (Java Virtual Machine) uses this area to hold class definitions and per-session state. If your database does not use Java-based features, this area stays mostly empty.',
    details: [],
    accentCls: 'border-green/30 bg-green/5',
    badgeCls: 'bg-green',
  },
  {
    mapId: 'fixed-sga',
    highlightIds: ['fixed-sga'],
    labelKo: 'Fixed SGA',
    labelEn: 'Fixed SGA',
    titleKo: 'Fixed SGA — Oracle이 부팅할 때 쓰는 내부 부품',
    titleEn: 'Fixed SGA — Internal Bootstrap Data',
    descKo: '인스턴스 상태, 백그라운드 프로세스가 서로를 찾는 데 필요한 포인터 등 Oracle 내부적으로만 쓰는 작은 고정 크기 영역이에요. 사용자가 직접 조절할 수 없고, 크기도 아주 작아요(보통 수백 KB 수준).',
    descEn: 'A small, fixed-size area holding internal bookkeeping — instance state, pointers background processes use to locate each other, and similar bootstrap data. Users cannot resize it directly, and it typically stays only a few hundred KB.',
    details: [],
    accentCls: 'border-line bg-paper-sunk',
    badgeCls: 'bg-ink-3',
  },
  // ── Shared Pool 하위 개별 영역 ────────────────────────────────────────────
  {
    mapId: 'library-cache',
    highlightIds: ['library-cache'],
    labelKo: 'Library Cache',
    labelEn: 'Library Cache',
    titleKo: 'Library Cache — 파싱 끝난 커서를 재사용하는 캐시',
    titleEn: 'Library Cache — Reusing Already-Parsed Cursors',
    descKo: '파싱이 끝난 커서(실행 계획 포함)를 저장해 둬요. 완전히 똑같은 SQL이 다시 들어오면 파싱을 건너뛰고 저장된 커서를 재사용해요(Soft Parse). 글자 하나라도 다르면 새 커서를 만들어야 해요(Hard Parse). 그래서 바인드 변수(:id, :name)를 쓰면 값이 달라도 SQL 문장은 똑같으니까 Soft Parse가 가능해요.',
    descEn: 'Stores finished cursors (including execution plans). If the exact same SQL text arrives again, Oracle skips parsing and reuses the stored cursor (Soft Parse). Even one character difference forces a new cursor (Hard Parse). This is why bind variables (:id, :name) matter — the SQL text stays identical even when values change, enabling Soft Parse.',
    details: [],
    accentCls: 'border-blue/30 bg-blue/5',
    badgeCls: 'bg-blue',
  },
  {
    mapId: 'dict-cache',
    highlightIds: ['dict-cache'],
    labelKo: 'Dictionary Cache',
    labelEn: 'Dictionary Cache',
    titleKo: 'Dictionary Cache (Row Cache) — 자주 쓰는 딕셔너리 정보의 메모리 사본',
    titleEn: 'Dictionary Cache (Row Cache) — In-Memory Copy of Frequently Used Metadata',
    descKo: '딕셔너리는 원래 SYSTEM Tablespace의 디스크 파일에 있어요. SQL을 실행할 때마다 디스크에서 읽으면 너무 느리기 때문에, 자주 쓰는 딕셔너리 정보를 행(Row) 단위로 메모리에 올려 둔 게 Dictionary Cache예요. Row Cache라고도 불러요.',
    descEn: 'The dictionary itself lives on disk in the SYSTEM Tablespace. Reading it from disk on every SQL execution would be far too slow, so the Dictionary Cache (also called the Row Cache) keeps frequently used dictionary rows in memory for fast access.',
    details: [],
    accentCls: 'border-blue/30 bg-blue/5',
    badgeCls: 'bg-blue',
  },
  // ── PGA 하위 개별 영역 ────────────────────────────────────────────────────
  {
    mapId: 'private-sql',
    highlightIds: ['private-sql'],
    labelKo: 'Private SQL Area',
    labelEn: 'Private SQL Area',
    titleKo: 'Private SQL Area — 커서 하나의 개인 공간',
    titleEn: 'Private SQL Area — One Cursor\'s Private Space',
    descKo: '커서(Cursor)란 SQL 실행의 현재 위치를 추적하는 포인터예요. 예를 들어 SELECT 결과를 한꺼번에 다 가져오지 않고 한 줄씩 읽을 때, "지금 몇 번째 행까지 읽었는지"를 여기에 기억해 둬요. 바인드 변수(:name)의 실제 값도 세션별로 여기 보관돼요.',
    descEn: 'A cursor is a pointer that tracks the current position in a SQL execution. For example, when fetching rows one at a time from a SELECT, this area remembers how far through the result set you have read. It also holds the actual values of bind variables (:name) for this session.',
    details: [],
    accentCls: 'border-purple/30 bg-purple/5',
    badgeCls: 'bg-purple',
  },
  {
    mapId: 'sql-work-area',
    labelKo: 'SQL Work Areas',
    labelEn: 'SQL Work Areas',
    highlightIds: ['sql-work-area'],
    titleKo: 'SQL Work Areas — 정렬·조인용 임시 작업 공간',
    titleEn: 'SQL Work Areas — Scratch Space for Sort and Join',
    descKo: 'ORDER BY·GROUP BY를 처리할 때 행을 정렬하는 Sort Area, 두 테이블을 Hash Join으로 합칠 때 작은 쪽 테이블을 올려두는 Hash Join Area가 모두 여기 속해요. PGA가 충분하면 메모리에서 끝나지만, 부족하면 디스크(Temp Tablespace)로 넘쳐 쿼리가 훨씬 느려져요.',
    descEn: 'This holds the Sort Area (used for ORDER BY / GROUP BY) and the Hash Join Area (used to build a hash table from the smaller table in a hash join). If PGA is large enough, the work stays in memory — if not, it spills to disk (Temp Tablespace) and the query slows down dramatically.',
    details: [],
    accentCls: 'border-blue/30 bg-blue/5',
    badgeCls: 'bg-blue',
  },
  {
    mapId: 'session-memory',
    highlightIds: ['session-memory'],
    labelKo: 'Session Memory (UGA)',
    labelEn: 'Session Memory (UGA)',
    titleKo: 'Session Memory (UGA) — 세션 하나의 상태 정보',
    titleEn: 'Session Memory (UGA) — This Session\'s State',
    descKo: '로그인 정보, 세션에서 설정한 옵션(NLS 설정 등), 현재 세션의 상태 같은 값들을 담고 있는 UGA(User Global Area)예요. Dedicated Server 방식에선 PGA 안에 있지만, Shared Server 방식에선 SGA의 Large Pool로 옮겨가요.',
    descEn: 'Holds logon information, session-level settings (such as NLS parameters), and other session state — collectively called the UGA (User Global Area). With Dedicated Server it lives inside the PGA; with Shared Server it moves into the SGA\'s Large Pool instead.',
    details: [],
    accentCls: 'border-green/30 bg-green/5',
    badgeCls: 'bg-green',
  },
  // ── Background Processes 하위 개별 프로세스 ─────────────────────────────
  {
    mapId: 'dbwr',
    highlightIds: ['dbwr'],
    labelKo: 'DBWn',
    labelEn: 'DBWn',
    titleKo: 'DBWn (Database Writer) — Dirty 블록을 디스크로 내려보내는 관리자',
    titleEn: 'DBWn (Database Writer) — Flushing Dirty Blocks to Disk',
    descKo: 'Buffer Cache에서 데이터를 바꾸면 그 블록은 "더러워진(Dirty)" 상태가 돼요. DBWn(데이터베이스 라이터)이 이 Dirty 블록들을 모아 디스크의 데이터 파일(.dbf)에 써요. 매번 바꿀 때마다 디스크에 쓰면 너무 느리니, 적절한 시점에 모아서 처리하는 방식이에요.',
    descEn: 'When data is modified in the Buffer Cache, the block becomes "dirty". DBWn collects these dirty blocks and writes them to the on-disk data files (.dbf). Writing to disk on every change would be too slow, so DBWn batches the writes at appropriate intervals.',
    details: [],
    accentCls: 'border-amber/30 bg-amber/5',
    badgeCls: 'bg-amber',
  },
  {
    mapId: 'lgwr',
    highlightIds: ['lgwr'],
    labelKo: 'LGWR',
    labelEn: 'LGWR',
    titleKo: 'LGWR (Log Writer) — COMMIT을 완성시키는 프로세스',
    titleEn: 'LGWR (Log Writer) — The Process That Completes a COMMIT',
    descKo: 'Redo Log Buffer에 쌓인 변경 기록을 디스크의 Redo Log File에 써요. 중요한 건, COMMIT을 실행하면 반드시 LGWR(로그 라이터)이 해당 변경 기록을 디스크에 써야 COMMIT이 완료돼요. 덕분에 서버가 갑자기 꺼져도 커밋된 데이터는 복구할 수 있어요.',
    descEn: 'Writes redo records from the Redo Log Buffer to the on-disk Redo Log Files. Critically, a COMMIT is not complete until LGWR has written the corresponding records to disk. This guarantees that committed data can always be recovered even after a crash.',
    details: [],
    accentCls: 'border-amber/30 bg-amber/5',
    badgeCls: 'bg-amber',
  },
  {
    mapId: 'ckpt',
    highlightIds: ['ckpt'],
    labelKo: 'CKPT',
    labelEn: 'CKPT',
    titleKo: 'CKPT (Checkpoint) — "여기까진 디스크에 반영됐다"는 도장',
    titleEn: 'CKPT (Checkpoint) — Marking "Everything Up to Here Is on Disk"',
    descKo: '체크포인트란 "이 시점까지의 변경은 모두 디스크에 반영됐다"는 도장을 찍는 작업이에요. CKPT(체크포인트)는 이 시점(SCN)을 컨트롤 파일에 기록해요. 서버가 다시 켜질 때 이 시점 이후의 Redo만 재실행하면 되니, 체크포인트가 자주 일어날수록 복구 시간이 짧아져요.',
    descEn: 'A checkpoint marks the point up to which all changes have been written to disk. CKPT records this point (as an SCN) in the control file. On restart, Oracle only needs to re-apply redo from that point forward — so more frequent checkpoints mean faster recovery.',
    details: [],
    accentCls: 'border-amber/30 bg-amber/5',
    badgeCls: 'bg-amber',
  },
  {
    mapId: 'smon',
    highlightIds: ['smon'],
    labelKo: 'SMON',
    labelEn: 'SMON',
    titleKo: 'SMON (System Monitor) — 서버 재시작 후 복구를 담당',
    titleEn: 'SMON (System Monitor) — Recovery After a Restart',
    descKo: '서버가 비정상 종료된 뒤 다시 켜지면 SMON(시스템 모니터)이 Redo Log를 읽어 커밋된 변경을 재적용하고(Instance Recovery), Undo로 미완료 트랜잭션을 롤백해요. 정렬·조인 도중 남겨진 임시 세그먼트도 함께 정리해요.',
    descEn: 'When the server restarts after a crash, SMON reads the Redo Log to re-apply committed changes (Instance Recovery) and uses Undo to roll back uncommitted transactions. It also cleans up temporary segments left over from sort and join operations.',
    details: [],
    accentCls: 'border-amber/30 bg-amber/5',
    badgeCls: 'bg-amber',
  },
  {
    mapId: 'pmon',
    highlightIds: ['pmon'],
    labelKo: 'PMON',
    labelEn: 'PMON',
    titleKo: 'PMON (Process Monitor) — 죽은 세션의 뒷정리 담당',
    titleEn: 'PMON (Process Monitor) — Cleaning Up After Dead Sessions',
    descKo: '네트워크 끊김 등으로 세션이 비정상 종료되면, 그 세션이 걸어둔 락과 점유한 메모리가 그대로 남아요. PMON(프로세스 모니터)이 이를 감지해 트랜잭션을 롤백하고 리소스를 해제해요. 덕분에 다른 세션이 그 데이터를 다시 쓸 수 있게 돼요.',
    descEn: 'When a user session terminates abnormally (e.g. a network drop), its locks and memory remain held. PMON detects this, rolls back the abandoned transaction, and releases all resources — allowing other sessions to access the data again.',
    details: [],
    accentCls: 'border-amber/30 bg-amber/5',
    badgeCls: 'bg-amber',
  },
  {
    mapId: 'arcn',
    highlightIds: ['arcn'],
    labelKo: 'ARCn',
    labelEn: 'ARCn',
    titleKo: 'ARCn (Archiver) — 재사용되기 전에 Redo Log를 복사',
    titleEn: 'ARCn (Archiver) — Copying Redo Logs Before Reuse',
    descKo: 'Redo Log File은 순환하며 재사용돼요. 재사용되기 전에 ARCn(아카이버)이 그 내용을 아카이브 로그로 복사해 둬요. 아카이브 로그가 있으면 "3일 전 오전 9시 상태로 복원"처럼 특정 시점으로 되돌리는 Point-in-Time Recovery가 가능해요. ARCHIVELOG 모드일 때만 동작해요.',
    descEn: 'Redo Log Files are reused in rotation. Before a file is overwritten, ARCn copies its contents to an archive log. Having archive logs enables Point-in-Time Recovery — restoring the database to an exact past moment, such as "9 AM three days ago". ARCn only runs in ARCHIVELOG mode.',
    details: [],
    accentCls: 'border-amber/30 bg-amber/5',
    badgeCls: 'bg-amber',
  },
  // ── Database 하위 개별 파일 ───────────────────────────────────────────────
  {
    mapId: 'data-file',
    highlightIds: ['data-file'],
    labelKo: 'Data Files',
    labelEn: 'Data Files',
    titleKo: 'Data Files (.dbf) — 테이블·인덱스의 실제 데이터',
    titleEn: 'Data Files (.dbf) — Actual Table and Index Data',
    descKo: '테이블과 인덱스의 실제 데이터가 저장되는 파일이에요. Tablespace라는 논리적 단위로 묶여서 관리돼요. 예를 들어 USERS Tablespace는 users01.dbf 파일로 구성될 수 있어요. Buffer Cache는 이 파일에서 블록을 메모리로 올려 빠르게 접근해요.',
    descEn: 'The files where actual table and index data is stored. They are grouped under logical units called Tablespaces — for example, the USERS Tablespace might consist of a users01.dbf file. The Buffer Cache loads blocks from these files into memory for fast access.',
    details: [],
    accentCls: 'border-line bg-paper-sunk',
    badgeCls: 'bg-ink-3',
  },
  {
    mapId: 'redo-log-file',
    highlightIds: ['redo-log-file'],
    labelKo: 'Online Redo Log',
    labelEn: 'Online Redo Log',
    titleKo: 'Redo Log Files (.log) — 변경 기록 파일',
    titleEn: 'Redo Log Files (.log) — The Change History File',
    descKo: '"무엇을 언제 어떻게 바꿨는지"를 기록한 파일이에요. 서버가 갑자기 꺼졌을 때 SMON이 이 파일을 읽어 커밋된 변경을 디스크에 다시 반영해요(Instance Recovery). Redo Log는 최소 2개 그룹이 순환하며 재사용돼요.',
    descEn: 'Records "what changed, when, and how". After a crash, SMON reads these files to re-apply committed changes to the data files (Instance Recovery). Redo Log files are organised in at least two groups that cycle in rotation.',
    details: [],
    accentCls: 'border-line bg-paper-sunk',
    badgeCls: 'bg-ink-3',
  },
  {
    mapId: 'control-file',
    highlightIds: ['control-file'],
    labelKo: 'Control Files',
    labelEn: 'Control Files',
    titleKo: 'Control File (.ctl) — DB의 지도 파일',
    titleEn: 'Control File (.ctl) — The Database\'s Map',
    descKo: 'Oracle Database의 구조 정보를 담은 파일이에요. "데이터 파일이 어디 있나", "마지막 체크포인트 SCN이 얼마인가", "DB 이름이 뭔가" 같은 정보가 여기에 있어요. Oracle은 시작할 때 이 파일을 제일 먼저 읽어서 나머지 파일 위치를 파악해요. 손상되면 복구가 매우 어렵기 때문에 여러 복사본을 유지하는 게 권장돼요.',
    descEn: 'The file that holds Oracle\'s structural information: where the data files are, the latest checkpoint SCN, the database name, and more. Oracle reads this file first on startup to locate everything else. Corruption is very hard to recover from, so keeping multiple copies is strongly recommended.',
    details: [],
    accentCls: 'border-line bg-paper-sunk',
    badgeCls: 'bg-ink-3',
  },
  {
    mapId: 'archive-log',
    highlightIds: ['archive-log'],
    labelKo: 'Archived Redo Log',
    labelEn: 'Archived Redo Log',
    titleKo: 'Archive Logs — 아카이브 로그',
    titleEn: 'Archive Logs',
    descKo: 'Redo Log File이 꽉 차서 재사용되기 전에 ARCn이 복사해 둔 파일이에요. 최신 백업 + 아카이브 로그를 함께 쓰면 "며칠 전 특정 시각 상태로 복원"이 가능해져요. 운영 환경에서는 거의 항상 ARCHIVELOG 모드를 켜서 이 파일을 생성해요.',
    descEn: 'Copies of Redo Log Files made by ARCn before they are overwritten. Combined with a recent backup, archive logs enable Point-in-Time Recovery — restoring the database to any specific past moment. Production databases are almost always run in ARCHIVELOG mode to generate these files.',
    details: [],
    accentCls: 'border-line bg-paper-sunk',
    badgeCls: 'bg-ink-3',
  },
]

// ── Subtitle JSX ──────────────────────────────────────────────────────────

const B = ({ children }: { children: React.ReactNode }) => (
  <strong className="font-semibold text-ink">{children}</strong>
)
const Hi = ({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'amber' | 'teal' | 'orange' }) => {
  const cls = {
    blue:   'text-blue font-semibold',
    amber:  'text-amber font-semibold',
    teal:   'text-green font-semibold',
    orange: 'text-amber font-semibold',
  }[color]
  return <span className={cls}>{children}</span>
}

const SUBTITLE_KO = (
  <div className="space-y-3">
    <p>
      <B>인덱스가 왜 빠른지</B>, <B>SQL 실행 계획이 어떻게 정해지는지</B>, <B>파티셔닝이 왜 I/O를 줄이는지</B> —
      이런 주제를 공부할 때 Oracle 내부 구조가 머릿속에 그림처럼 그려져 있으면 훨씬 직관적으로 이해할 수 있어요.
      구조 없이 외우면 단편적인 지식만 쌓이고 새로운 상황에서 응용하기가 어렵거든요.
      <Hi color="teal"> 이 챕터는 바로 그 기초를 다지기 위한 챕터예요.</Hi>
    </p>
    <p>
      Oracle을 실행하면 두 가지가 함께 동작해요.
      하나는 메모리와 프로세스로 이루어진 <Hi color="blue">Instance</Hi>이고,
      다른 하나는 디스크 위의 파일 묶음인 <Hi color="orange">Database</Hi>예요.
    </p>
    <p>
      <Hi color="blue">Instance</Hi>는 Oracle이 살아 있는 동안에만 존재하는 <B>"실행 중인 상태"</B>예요.
      서버를 끄면 사라지지만, 디스크의 파일(<Hi color="orange">Database</Hi>)은 그대로 남아요.
      다시 켜면 새 Instance가 같은 파일을 마운트해서 이어서 달려요.
    </p>
    <p>
      <Hi color="blue">메모리(SGA·PGA)</Hi>는 CPU가 직접 읽고 쓸 수 있어 <B>수 나노초 단위로 빠르지만</B>,
      전원이 끊기면 내용이 날아가요.
      <Hi color="orange"> 디스크</Hi>는 꺼져도 데이터가 남아 있지만 <B>메모리보다 수천 배 느려요</B>.
      Oracle의 핵심 설계 목표는 자주 쓰는 데이터를 메모리에 올려 두고(<Hi color="blue">Buffer Cache</Hi>),
      변경 이력을 먼저 로그로 남겨(<Hi color="amber">Redo</Hi>) 디스크 접근을 최대한 줄이는 거예요.
    </p>
    <div className="mt-5" />
  </div>
)

const SUBTITLE_EN = (
  <div className="space-y-3">
    <p>
      <B>Why is an index fast?</B> <B>How does Oracle decide an execution plan?</B> <B>Why does partitioning reduce I/O?</B>{' '}
      These questions become much easier to answer once you have Oracle's internal structure in your head.
      Without that mental model, knowledge stays fragmented and hard to apply in new situations.
      <Hi color="teal"> This chapter builds that foundation.</Hi>
    </p>
    <p>
      When Oracle runs, two things operate together:
      the <Hi color="blue">Instance</Hi> (memory structures + processes) and
      the <Hi color="orange">Database</Hi> (the set of files on disk).
    </p>
    <p>
      The <Hi color="blue">Instance</Hi> is the <B>"live, running state"</B> that exists only while Oracle is up.
      Shut the server down and the Instance disappears — but the files on disk (<Hi color="orange">Database</Hi>) remain.
      When you restart, a new Instance mounts those same files and picks up where it left off.
    </p>
    <p>
      <Hi color="blue">Memory (SGA &amp; PGA)</Hi> can be read and written by the CPU <B>in nanoseconds</B>,
      but its contents vanish when power is cut.
      <Hi color="orange"> Disk</Hi> survives a power loss, but is <B>thousands of times slower</B>.
      Oracle's core design goal is to keep frequently-used data in memory (<Hi color="blue">Buffer Cache</Hi>)
      and record changes as a log first (<Hi color="amber">Redo</Hi>), so that slow disk I/O is minimised.
    </p>
    <div className="mt-5" />
  </div>
)

// ── Strings ────────────────────────────────────────────────────────────────

const T = {
  ko: {
    title: '오라클의 내부 구조',
    subtitle: SUBTITLE_KO,
    clickHint: '구성 요소를 클릭하세요',
  },
  en: {
    title: 'Oracle Internal Structure',
    subtitle: SUBTITLE_EN,
    clickHint: 'Click a component',
  },
}

// ── OverviewSection ────────────────────────────────────────────────────────

export function OverviewSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const active = activeIdx !== null ? TOUR[activeIdx] : null

  function handleSelect(id: ArchComponentId) {
    const idx = TOUR.findIndex((item) => item.mapId === id)
    if (idx !== -1) setActiveIdx((prev) => (prev === idx ? null : idx))
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-10 py-10">
      <ChapterTitle title={t.title} subtitle={t.subtitle} />

      {/* ── Map (left, ~40%) + Detail card (right) ── */}
      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:sticky lg:top-6 lg:w-[40%] lg:shrink-0">
          <ClickableMap
            activeIds={active?.highlightIds ?? []}
            onSelect={handleSelect}
          />
        </div>

        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn('rounded-panel border-2 overflow-hidden', active.accentCls)}
              >
                {/* 헤더 */}
                <div className={cn('flex items-center gap-2.5 px-5 py-3 border-b border-black/5', active.accentCls)}>
                  <span className={cn('rounded px-2.5 py-0.5 font-mono text-xs font-bold text-paper', active.badgeCls)}>
                    {lang === 'ko' ? active.labelKo : active.labelEn}
                  </span>
                  <span className="text-sm font-bold text-ink/90">
                    {lang === 'ko' ? active.titleKo : active.titleEn}
                  </span>
                </div>
                {/* 개요 */}
                <div className="px-5 py-3 border-b border-black/5">
                  <Prose>{lang === 'ko' ? active.descKo : active.descEn}</Prose>
                </div>
                {/* 세부 항목 — PGA는 가로 카드 그리드, 나머지는 세로 테이블 */}
                {active.details.length > 0 && (
                  active.mapId === 'pga' ? (
                    <div className="grid grid-cols-2 gap-3 p-4">
                      {active.details.map((row, i) => (
                        <div key={i} className="rounded-card border border-black/10 bg-paper/60 px-3 py-2.5">
                          <div className="mb-1 font-mono text-[11px] font-bold text-ink">
                            {lang === 'ko' ? row.termKo : row.termEn}
                          </div>
                          <div className="text-[11px] leading-snug text-ink-2">
                            {lang === 'ko' ? row.descKo : row.descEn}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-black/5">
                      {active.details.map((row, i) => (
                        <div key={i} className="grid grid-cols-[160px_1fr] text-xs">
                          <div className="flex items-center border-r border-black/5 bg-ink/[0.03] px-4 py-2.5">
                            <span className="font-mono font-bold text-ink">
                              {lang === 'ko' ? row.termKo : row.termEn}
                            </span>
                          </div>
                          <div className="flex items-center px-4 py-2.5">
                            <span className="leading-snug text-ink-2">
                              {lang === 'ko' ? row.descKo : row.descEn}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-24 items-center justify-center rounded-panel border-2 border-dashed border-line lg:h-full lg:min-h-[16rem]"
              >
                <span className="font-mono text-sm text-ink-2">{t.clickHint}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Cursor란? ── */}
      <div className="mt-10">
        <InfoBox variant="note">
          {lang === 'ko' ? (
            <>
              <strong>커서(Cursor)란?</strong>
              <br />
              Oracle이 SQL 실행 상태를 추적하려고 메모리(PGA)에 만드는 객체예요. SQL을 파싱하면 커서가 하나 생기고, 그 안에 실행 계획, 바인드 변수, 지금까지 읽은 위치 등이 담겨요.
              <br /><br />
              같은 SQL이 다시 실행되면 Oracle은 Library Cache에서 <strong>공유 커서(Shared Cursor)</strong>를 찾아 파싱을 건너뜁니다. 커서의 생애 주기는 세 단계예요: <strong>OPEN</strong>(커서 생성·SQL 파싱) → <strong>FETCH</strong>(행 단위 데이터 읽기) → <strong>CLOSE</strong>(커서 반환·자원 해제).
            </>
          ) : (
            <>
              <strong>What is a Cursor?</strong>
              <br />
              A cursor is an object Oracle creates in the PGA to track SQL execution state. When a SQL statement is parsed, a cursor is opened to hold the execution plan, bind variables, and the current read position.
              <br /><br />
              When the same SQL runs again, Oracle looks for a <strong>shared cursor</strong> in the Library Cache to skip re-parsing. The cursor lifecycle has three phases: <strong>OPEN</strong> (create cursor, parse SQL) → <strong>FETCH</strong> (read rows one at a time) → <strong>CLOSE</strong> (release cursor and resources).
            </>
          )}
        </InfoBox>
      </div>
    </div>
  )
}

// ── ClickableMap ───────────────────────────────────────────────────────────

function ClickableMap({
  activeIds,
  onSelect,
}: {
  activeIds: ArchComponentId[]
  onSelect: (id: ArchComponentId) => void
}) {
  const lang = useSimulationStore((s) => s.lang)

  return (
    <div className="w-full">
      <h3 className="mb-3 text-sm font-bold text-ink/90">
        {lang === 'ko' ? '오라클 데이터베이스 내부구조' : 'Oracle Database Internal Structure'}
      </h3>
      <OracleArchitectureDiagram
        variant="simple"
        onSelect={onSelect}
        highlightIds={activeIds}
        callout={lang === 'ko' ? '각 영역을 클릭해보세요' : 'Click each area to explore'}
      />
    </div>
  )
}
