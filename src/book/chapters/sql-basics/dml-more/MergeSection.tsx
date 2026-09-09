import { cn } from '@/lib/utils'
import {
  PageContainer,
  ChapterTitle,
  SectionTitle,
  SubTitle,
  Prose,
  InfoBox,
  Divider,
} from '../../shared'
import {
  IconGitMerge,
  IconRefresh,
  IconPackageImport,
  IconTrash,
} from '@tabler/icons-react'
import { SqlHighlight } from './SqlHighlight'
import { useSimulationStore } from '@/store/simulationStore'

const T = {
  ko: {
    chapterTitle: 'MERGE INTO',
    chapterSubtitle:
      'MERGE INTO는 INSERT와 UPDATE를 한 번에 처리하는 구문이에요. 대상(Target) 테이블과 참조(Source) 테이블의 데이터를 비교해서 "있으면 UPDATE, 없으면 INSERT"를 한 번에 처리해요.',
    structureTitle: '기본 구조',
    matchedTitle: 'WHEN MATCHED — 일치하는 행이 있을 때',
    matchedDesc:
      '대상 테이블에서 ON 조건에 맞는 행이 있으면 실행됩니다. 보통 UPDATE로 기존 값을 갱신합니다.',
    notMatchedTitle: 'WHEN NOT MATCHED — 일치하는 행이 없을 때',
    notMatchedDesc:
      'ON 조건에 맞는 행이 대상 테이블에 없으면 이 절이 실행됩니다. 보통 INSERT로 새 행을 추가합니다.',
    deleteTitle: 'WHEN MATCHED THEN DELETE',
    exampleTitle: '예시 쿼리 1 — UPDATE + INSERT',
    example2Title: '예시 쿼리 2 — UPDATE + DELETE (WHEN MATCHED만)',
    example2Desc:
      'WHEN MATCHED만 단독으로 써도 돼요. UPDATE 후 DELETE WHERE 조건을 검사할 때, 조건은 UPDATE된 값을 기준으로 해요. 아래 예시에서 emp_id=102는 salary가 5600으로 업데이트된 뒤 dept_id=99가 아니므로 유지되고, emp_id=104는 원래 dept_id=99이지만 소스에 없어서 이 MERGE에서 변경되지 않아요.',
    example2MatchDesc: '일치 + dept_id=99 → UPDATE 후 DELETE',
    example2MatchKeep: '일치 + dept_id≠99 → UPDATE 유지',
    example2NoSource: '소스에 없음 → 변경 없음',
    sourceTable: '참조 테이블 (SOURCE)',
    targetTable: '대상 테이블 (TARGET)',
    resultTable: 'MERGE 결과',
    matched: '일치 → UPDATE',
    notMatched: '불일치 → INSERT',
    usecaseTitle: '언제 쓰나요?',
    usecases: [
      {
        icon: <IconRefresh size={16} color="var(--color-blue)" stroke={1.5} />,
        title: '동기화',
        desc: '외부 시스템에서 받아온 데이터를 내부 테이블에 반영할 때',
      },
      {
        icon: (
          <IconPackageImport
            size={16}
            color="var(--color-green)"
            stroke={1.5}
          />
        ),
        title: 'Upsert',
        desc: '있으면 업데이트, 없으면 삽입 — 중복 체크 없이 한 번에',
      },
      {
        icon: <IconTrash size={16} color="var(--color-red)" stroke={1.5} />,
        title: '조건부 삭제',
        desc: '특정 조건을 만족하는 행을 업데이트 후 삭제할 때',
      },
    ],
    targetLabel: '변경 대상',
    onColumnTitle: 'ON 절 컬럼은 UPDATE/DELETE 할 수 없어요',
    onColumnDesc:
      'ON 절에서 두 테이블을 연결하는 데 쓰인 컬럼은 WHEN MATCHED THEN UPDATE나 DELETE의 대상이 될 수 없어요. Oracle이 행을 식별하는 기준 자체를 바꾸는 것이기 때문이에요.',
    onColumnWhy:
      '왜 그럴까요? ON 절은 "이 행이 원본과 같은 행인지" 판별하는 키예요. 이 값을 UPDATE로 바꾸면 Oracle이 같은 행을 다시 찾을 수 없게 되므로 허용하지 않아요.',
    onColumnBadLabel: '오류 — ON 절 컬럼(emp_id)을 UPDATE 시도',
    onColumnGoodLabel: '올바른 방법 — ON 절 컬럼이 아닌 컬럼만 UPDATE',
    sqlError: 'SQL — 오류',
    sqlCorrect: 'SQL — 올바른 예',
    noteTitle: '주의사항',
    noteItems: ['Oracle 9i 이상에서 지원해요.'],
  },
  en: {
    chapterTitle: 'MERGE INTO',
    chapterSubtitle:
      'MERGE INTO handles INSERT and UPDATE in one shot. It compares rows between a target table and a source table — "update if matched, insert if not." No need to split it into two separate SQL statements.',
    structureTitle: 'Basic Structure',
    matchedTitle: 'WHEN MATCHED — Row found in target',
    matchedDesc:
      'When the ON condition finds a matching row in the target table, this clause executes. Typically used to UPDATE the existing row.',
    notMatchedTitle: 'WHEN NOT MATCHED — No matching row',
    notMatchedDesc:
      'When the ON condition finds no match in the target table, this clause executes. Typically used to INSERT a new row.',
    deleteTitle: 'WHEN MATCHED THEN DELETE',
    exampleTitle: 'Example Query 1 — UPDATE + INSERT',
    example2Title: 'Example Query 2 — UPDATE + DELETE (WHEN MATCHED only)',
    example2Desc:
      'WHEN MATCHED can be used on its own without WHEN NOT MATCHED. When DELETE follows UPDATE, the DELETE WHERE condition is checked against the already-updated values. In the example below, emp_id=102 keeps its row because dept_id stays 30 after the update; emp_id=104 has no matching source row so it is untouched by this MERGE.',
    example2MatchDesc: 'Matched + dept_id=99 → UPDATE then DELETE',
    example2MatchKeep: 'Matched + dept_id≠99 → UPDATE, row kept',
    example2NoSource: 'No source row → unchanged',
    sourceTable: 'Source Table (SOURCE)',
    targetTable: 'Target Table (TARGET)',
    resultTable: 'MERGE Result',
    matched: 'Matched → UPDATE',
    notMatched: 'Not matched → INSERT',
    usecaseTitle: 'When to use it?',
    usecases: [
      {
        icon: <IconRefresh size={16} color="var(--color-blue)" stroke={1.5} />,
        title: 'Sync',
        desc: 'Apply incoming data from an external system to an internal table',
      },
      {
        icon: (
          <IconPackageImport
            size={16}
            color="var(--color-green)"
            stroke={1.5}
          />
        ),
        title: 'Upsert',
        desc: 'Update if exists, insert if not — no duplicate checks needed',
      },
      {
        icon: <IconTrash size={16} color="var(--color-red)" stroke={1.5} />,
        title: 'Conditional delete',
        desc: 'Delete rows that meet a condition after an update',
      },
    ],
    targetLabel: 'modified',
    onColumnTitle: 'ON clause columns cannot be UPDATE-d or DELETE-d',
    onColumnDesc:
      'Columns used in the ON clause to join the two tables cannot be the target of WHEN MATCHED THEN UPDATE or DELETE. They are the key Oracle uses to identify the row.',
    onColumnWhy:
      'Why? The ON clause is how Oracle decides "is this the same row as the source?" If you update that key, Oracle can no longer find the row again — so it simply disallows it.',
    onColumnBadLabel: 'Error — trying to UPDATE the ON clause column (emp_id)',
    onColumnGoodLabel: 'Correct — only UPDATE columns not used in ON',
    sqlError: 'SQL — Error',
    sqlCorrect: 'SQL — Correct',
    noteTitle: 'Important notes',
    noteItems: ['Supported in Oracle 9i and above.'],
  },
}

// ── Data ──────────────────────────────────────────────────────────────────────

interface SourceRow {
  emp_id: number
  first_name: string
  dept_id: number
  salary: number
}
interface TargetRow {
  emp_id: number
  first_name: string
  dept_id: number
  salary: number
  status?: string
}

const SOURCE_ROWS: SourceRow[] = [
  { emp_id: 101, first_name: 'Alice', dept_id: 10, salary: 8000 },
  { emp_id: 102, first_name: 'Bob', dept_id: 20, salary: 5600 },
  { emp_id: 110, first_name: 'Iris', dept_id: 30, salary: 4200 },
  { emp_id: 111, first_name: 'Jake', dept_id: 10, salary: 7100 },
]

const INITIAL_TARGET: TargetRow[] = [
  { emp_id: 101, first_name: 'Alice', dept_id: 10, salary: 7200 },
  { emp_id: 102, first_name: 'Bob', dept_id: 20, salary: 5400 },
  { emp_id: 103, first_name: 'Carol', dept_id: 10, salary: 8100 },
  { emp_id: 104, first_name: 'David', dept_id: 30, salary: 4900 },
]

const MERGE_SQL = `MERGE INTO employees t
USING new_salaries s
  ON (t.emp_id = s.emp_id)
WHEN MATCHED THEN
  UPDATE SET t.salary = s.salary
WHEN NOT MATCHED THEN
  INSERT (emp_id, first_name, dept_id, salary)
  VALUES (s.emp_id, s.first_name,
          s.dept_id, s.salary)`

// Example 2: WHEN MATCHED only — UPDATE then DELETE WHERE (on updated values)
// SOURCE has emp_id 101 (dept_id=10) and 102 (dept_id=99)
// TARGET has emp_id 101 (dept_id=10, salary=7200), 102 (dept_id=30, salary=5400),
//              103 (dept_id=10, salary=8100), 104 (dept_id=99, salary=4900)
// After UPDATE: emp_id=102 gets dept_id=99 → DELETE WHERE dept_id=99 fires → deleted
//               emp_id=101 gets dept_id=10 → dept_id≠99 → kept
// emp_id=103, 104 have no source row → untouched
const MERGE2_SQL = `MERGE INTO employees t
USING dept_changes s
  ON (t.emp_id = s.emp_id)
WHEN MATCHED THEN
  UPDATE SET t.salary  = s.salary,
             t.dept_id = s.dept_id
  DELETE WHERE t.dept_id = 99`

const STRUCTURE_SQL = `MERGE INTO target_table t
USING source_table s
  ON (t.join_key = s.join_key)
WHEN MATCHED THEN
  UPDATE SET t.col1 = s.col1,
             t.col2 = s.col2
WHEN NOT MATCHED THEN
  INSERT (col1, col2, col3)
  VALUES (s.col1, s.col2, s.col3)`

const ON_COLUMN_BAD_SQL = `-- ❌ ORA-38104: ON 절에서 참조된 컬럼은 업데이트할 수 없습니다
MERGE INTO employees t
USING new_data s
  ON (t.emp_id = s.emp_id)   -- emp_id 가 ON 절 컬럼
WHEN MATCHED THEN
  UPDATE SET t.emp_id = s.emp_id,  -- ❌ 오류: ON 절 컬럼 수정 불가
             t.salary = s.salary`

const ON_COLUMN_GOOD_SQL = `-- ✅ ON 절 컬럼(emp_id)은 건드리지 않고
--    나머지 컬럼만 UPDATE
MERGE INTO employees t
USING new_data s
  ON (t.emp_id = s.emp_id)
WHEN MATCHED THEN
  UPDATE SET t.salary  = s.salary,
             t.dept_id = s.dept_id`

// ── Example 2 data ────────────────────────────────────────────────────────────
// SOURCE: emp_id 101 (dept_id=10), 102 (dept_id=99)
// TARGET: emp_id 101~104; after UPDATE emp_id=102 gets dept_id=99 → DELETE fires

interface Ex2SourceRow {
  emp_id: number
  dept_id: number
  salary: number
}
interface Ex2TargetRow {
  emp_id: number
  first_name: string
  dept_id: number
  salary: number
}

const EX2_SOURCE: Ex2SourceRow[] = [
  { emp_id: 101, dept_id: 10, salary: 8000 },
  { emp_id: 102, dept_id: 99, salary: 5600 },
]

const EX2_TARGET: Ex2TargetRow[] = [
  { emp_id: 101, first_name: 'Alice', dept_id: 10, salary: 7200 },
  { emp_id: 102, first_name: 'Bob', dept_id: 30, salary: 5400 },
  { emp_id: 103, first_name: 'Carol', dept_id: 10, salary: 8100 },
  { emp_id: 104, first_name: 'David', dept_id: 99, salary: 4900 },
]

type Ex2RowState = 'updated' | 'deleted' | 'unchanged'

// After UPDATE applied first, then DELETE WHERE dept_id=99 on updated values
// emp_id=101: matched, dept_id stays 10 → updated, kept
// emp_id=102: matched, dept_id becomes 99 → updated then deleted
// emp_id=103,104: no source row → unchanged (104 has dept_id=99 but no match → untouched)
const EX2_RESULT: (Ex2TargetRow & { state: Ex2RowState })[] = [
  {
    emp_id: 101,
    first_name: 'Alice',
    dept_id: 10,
    salary: 8000,
    state: 'updated',
  },
  {
    emp_id: 103,
    first_name: 'Carol',
    dept_id: 10,
    salary: 8100,
    state: 'unchanged',
  },
  {
    emp_id: 104,
    first_name: 'David',
    dept_id: 99,
    salary: 4900,
    state: 'unchanged',
  },
]

// ── Static merge table ────────────────────────────────────────────────────────

const MERGE_TABLE_COLS = ['emp_id', 'first_name', 'dept_id', 'salary'] as const

function MergeTableHeader({
  cols = MERGE_TABLE_COLS as readonly string[],
  extraCol,
}: {
  cols?: readonly string[]
  extraCol?: string
}) {
  return (
    <thead>
      <tr className="bg-rail border-b">
        {cols.map((h) => (
          <th
            key={h}
            className="text-ink-2 px-3 py-2 text-left font-mono text-[10px] font-bold whitespace-nowrap"
          >
            {h}
          </th>
        ))}
        {extraCol && (
          <th className="text-ink-2 px-3 py-2 text-left font-mono text-[10px] font-bold whitespace-nowrap">
            {extraCol}
          </th>
        )}
      </tr>
    </thead>
  )
}

type RowState = 'updated' | 'inserted'

const MERGE_ROW_STATES: Record<number, RowState> = Object.fromEntries([
  ...SOURCE_ROWS.map((s) => [
    s.emp_id,
    INITIAL_TARGET.some((r) => r.emp_id === s.emp_id) ? 'updated' : 'inserted',
  ]),
]) as Record<number, RowState>

const RESULT_ROWS: TargetRow[] = [
  ...INITIAL_TARGET.map((r) => {
    const src = SOURCE_ROWS.find((s) => s.emp_id === r.emp_id)
    if (src) return { ...r, salary: src.salary }
    return { ...r }
  }),
  ...SOURCE_ROWS.filter(
    (s) => !INITIAL_TARGET.some((r) => r.emp_id === s.emp_id)
  ),
]

function MergeTables({ t }: { t: (typeof T)['ko'] }) {
  return (
    <div className="rounded-panel bg-rail mb-6 overflow-hidden border">
      {/* Legend */}
      <div className="bg-rail flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="rounded-chip bg-amber/10 border-amber/30 inline-block h-2.5 w-2.5 border" />
          <span className="text-amber font-bold">{t.matched}</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="rounded-chip bg-green/10 border-green/30 inline-block h-2.5 w-2.5 border" />
          <span className="text-green font-bold">{t.notMatched}</span>
        </span>
      </div>

      {/* 3-panel layout: TARGET | SOURCE | RESULT */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-3 lg:divide-x">
        {/* TARGET */}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
            <span className="text-ink/70">{t.targetTable}</span>
            <span className="bg-amber/15 text-amber rounded px-1.5 py-0.5 text-[9px] font-bold tracking-normal normal-case">
              {t.targetLabel}
            </span>
          </div>
          <div className="rounded-card border-amber/30 overflow-x-auto border-2">
            <table className="w-full text-xs">
              <MergeTableHeader />
              <tbody>
                {INITIAL_TARGET.map((row) => {
                  const state = MERGE_ROW_STATES[row.emp_id]
                  return (
                    <tr
                      key={row.emp_id}
                      className={cn(
                        'border-b last:border-0',
                        state === 'updated' ? 'bg-amber/10' : ''
                      )}
                    >
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.emp_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.first_name}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.dept_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.salary.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SOURCE */}
        <div className="border-t p-4 lg:border-t-0">
          <div className="text-ink-2 mb-2 font-mono text-[10px] font-bold tracking-widest uppercase">
            {t.sourceTable}
          </div>
          <div className="rounded-card overflow-x-auto border">
            <table className="w-full text-xs">
              <MergeTableHeader />
              <tbody>
                {SOURCE_ROWS.map((src) => {
                  const state = MERGE_ROW_STATES[src.emp_id]
                  return (
                    <tr
                      key={src.emp_id}
                      className={cn(
                        'border-b last:border-0',
                        state === 'updated' ? 'bg-amber/10' : 'bg-green/10'
                      )}
                    >
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {src.emp_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {src.first_name}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {src.dept_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {src.salary.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RESULT */}
        <div className="border-t p-4 lg:border-t-0">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
            <span className="text-ink/70">{t.resultTable}</span>
          </div>
          <div className="rounded-card border-amber/30 overflow-x-auto border-2">
            <table className="w-full text-xs">
              <MergeTableHeader extraCol="status" />
              <tbody>
                {RESULT_ROWS.map((row) => {
                  const state = MERGE_ROW_STATES[row.emp_id]
                  const orig = INITIAL_TARGET.find(
                    (r) => r.emp_id === row.emp_id
                  )
                  return (
                    <tr
                      key={row.emp_id}
                      className={cn(
                        'border-b last:border-0',
                        state === 'updated'
                          ? 'bg-amber/10'
                          : state === 'inserted'
                            ? 'bg-green/10'
                            : ''
                      )}
                    >
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.emp_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.first_name}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.dept_id}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {state === 'updated' &&
                        orig &&
                        orig.salary !== row.salary ? (
                          <span>
                            <span className="text-red mr-1 text-[10px] line-through">
                              {orig.salary.toLocaleString()}
                            </span>
                            <span className="text-amber font-bold">
                              {row.salary.toLocaleString()}
                            </span>
                          </span>
                        ) : (
                          <span className="text-ink/80">
                            {row.salary.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {state === 'updated' && (
                          <span className="bg-amber/20 text-amber rounded px-1.5 py-0.5 text-[10px] font-bold">
                            UPDATED
                          </span>
                        )}
                        {state === 'inserted' && (
                          <span className="bg-green/20 text-green rounded px-1.5 py-0.5 text-[10px] font-bold">
                            INSERTED
                          </span>
                        )}
                        {!state && <span className="text-ink-2/40">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Example 2 table (UPDATE + DELETE) ─────────────────────────────────────────

const EX2_SOURCE_COLS = ['emp_id', 'dept_id', 'salary'] as const

function MergeTables2({ t }: { t: (typeof T)['ko'] }) {
  const deletedRow = EX2_TARGET.find((r) => r.emp_id === 102)!
  const deletedSrc = EX2_SOURCE.find((s) => s.emp_id === 102)!

  return (
    <div className="rounded-panel bg-rail mb-6 overflow-hidden border">
      {/* Legend */}
      <div className="bg-rail flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="rounded-chip bg-amber/10 border-amber/30 inline-block h-2.5 w-2.5 border" />
          <span className="text-amber font-bold">{t.example2MatchKeep}</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="rounded-chip bg-red/10 border-red/30 inline-block h-2.5 w-2.5 border" />
          <span className="text-red font-bold">{t.example2MatchDesc}</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="rounded-chip bg-rail border-line inline-block h-2.5 w-2.5 border" />
          <span className="text-ink-2 font-bold">{t.example2NoSource}</span>
        </span>
      </div>

      {/* 3-panel layout: TARGET | SOURCE | RESULT */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-3 lg:divide-x">
        {/* TARGET */}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
            <span className="text-ink/70">{t.targetTable}</span>
            <span className="bg-amber/15 text-amber rounded px-1.5 py-0.5 text-[9px] font-bold tracking-normal normal-case">
              {t.targetLabel}
            </span>
          </div>
          <div className="rounded-card border-amber/30 overflow-x-auto border-2">
            <table className="w-full text-xs">
              <MergeTableHeader />
              <tbody>
                {EX2_TARGET.map((row) => {
                  const src = EX2_SOURCE.find((s) => s.emp_id === row.emp_id)
                  const willDelete = src?.dept_id === 99
                  const willUpdate = !!src && !willDelete
                  return (
                    <tr
                      key={row.emp_id}
                      className={cn(
                        'border-b last:border-0',
                        willDelete
                          ? 'bg-red/10'
                          : willUpdate
                            ? 'bg-amber/10'
                            : ''
                      )}
                    >
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.emp_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.first_name}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.dept_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.salary.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SOURCE */}
        <div className="border-t p-4 lg:border-t-0">
          <div className="text-ink-2 mb-2 font-mono text-[10px] font-bold tracking-widest uppercase">
            {t.sourceTable}
          </div>
          <div className="rounded-card overflow-x-auto border">
            <table className="w-full text-xs">
              <MergeTableHeader cols={EX2_SOURCE_COLS} />
              <tbody>
                {EX2_SOURCE.map((src) => {
                  const willDelete = src.dept_id === 99
                  return (
                    <tr
                      key={src.emp_id}
                      className={cn(
                        'border-b last:border-0',
                        willDelete ? 'bg-red/10' : 'bg-amber/10'
                      )}
                    >
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {src.emp_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {src.dept_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {src.salary.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RESULT */}
        <div className="border-t p-4 lg:border-t-0">
          <div className="text-ink/70 mb-2 font-mono text-[10px] font-bold tracking-widest uppercase">
            {t.resultTable}
          </div>
          <div className="rounded-card border-amber/30 overflow-x-auto border-2">
            <table className="w-full text-xs">
              <MergeTableHeader extraCol="status" />
              <tbody>
                {/* deleted row with strikethrough */}
                <tr className="bg-red/10 border-b opacity-60">
                  <td className="text-ink/50 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap line-through">
                    {deletedRow.emp_id}
                  </td>
                  <td className="text-ink/50 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap line-through">
                    {deletedRow.first_name}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                    <span className="text-ink/50 mr-1 text-[10px] line-through">
                      {deletedRow.dept_id}
                    </span>
                    <span className="text-red font-bold">
                      {deletedSrc.dept_id}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                    <span className="text-ink/50 mr-1 text-[10px] line-through">
                      {deletedRow.salary.toLocaleString()}
                    </span>
                    <span className="text-red font-bold">
                      {deletedSrc.salary.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                    <span className="bg-red/20 text-red rounded px-1.5 py-0.5 text-[10px] font-bold">
                      DELETED
                    </span>
                  </td>
                </tr>
                {EX2_RESULT.map((row) => {
                  const orig = EX2_TARGET.find((r) => r.emp_id === row.emp_id)
                  return (
                    <tr
                      key={row.emp_id}
                      className={cn(
                        'border-b last:border-0',
                        row.state === 'updated' ? 'bg-amber/10' : ''
                      )}
                    >
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.emp_id}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.first_name}
                      </td>
                      <td className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.dept_id}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.state === 'updated' &&
                        orig &&
                        orig.salary !== row.salary ? (
                          <span>
                            <span className="text-red mr-1 text-[10px] line-through">
                              {orig.salary.toLocaleString()}
                            </span>
                            <span className="text-amber font-bold">
                              {row.salary.toLocaleString()}
                            </span>
                          </span>
                        ) : (
                          <span className="text-ink/80">
                            {row.salary.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {row.state === 'updated' && (
                          <span className="bg-amber/20 text-amber rounded px-1.5 py-0.5 text-[10px] font-bold">
                            UPDATED
                          </span>
                        )}
                        {row.state === 'unchanged' && (
                          <span className="text-ink-2/40">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SqlCard ───────────────────────────────────────────────────────────────────
// 라벨 헤더 바 + 함몰된 코드 본문. tone 으로 정상/오류/정답 3색.

const SQL_CARD_TONE = {
  plain: { card: 'border', bar: 'bg-rail border-b', label: 'text-ink-2' },
  error: {
    card: 'border border-red/30',
    bar: 'border-b border-red/30 bg-red/10',
    label: 'text-red',
  },
  ok: {
    card: 'border border-green/30',
    bar: 'border-b border-green/30 bg-green/10',
    label: 'text-green',
  },
} as const

function SqlCard({
  label = 'SQL',
  sql,
  tone = 'plain',
  className,
}: {
  label?: string
  sql: string
  tone?: keyof typeof SQL_CARD_TONE
  className?: string
}) {
  const c = SQL_CARD_TONE[tone]
  return (
    <div className={cn('rounded-panel overflow-hidden', c.card, className)}>
      <div className={cn('px-4 py-2', c.bar)}>
        <span
          className={cn(
            'font-mono text-[10px] tracking-widest uppercase',
            c.label
          )}
        >
          {label}
        </span>
      </div>
      <div className="bg-code-bg p-4">
        <SqlHighlight sql={sql} bare />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MergeSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]

  return (
    <PageContainer className="max-w-5xl">
      <ChapterTitle
        icon={<IconGitMerge size={36} color="var(--color-red)" stroke={1.5} />}
        title={t.chapterTitle}
        subtitle={t.chapterSubtitle}
      />

      <InfoBox variant="usage">
        <div className="mt-1 flex flex-col gap-2">
          {t.usecases.map((u, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 text-base">{u.icon}</span>
              <div>
                <span className="font-bold">{u.title}</span>
                <span className="ml-1 text-current/80">— {u.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </InfoBox>

      <Divider />

      {/* Basic structure */}
      <SectionTitle>{t.structureTitle}</SectionTitle>
      <SqlCard sql={STRUCTURE_SQL} className="mb-6" />

      {/* WHEN MATCHED */}
      <SubTitle>{t.matchedTitle}</SubTitle>
      <Prose>{t.matchedDesc}</Prose>

      {/* WHEN NOT MATCHED */}
      <SubTitle>{t.notMatchedTitle}</SubTitle>
      <Prose>{t.notMatchedDesc}</Prose>

      <Divider />

      {/* Example query 1 */}
      <SectionTitle>{t.exampleTitle}</SectionTitle>
      <SqlCard sql={MERGE_SQL} className="mb-6" />
      <MergeTables t={t} />

      <Divider />

      {/* Example query 2 — UPDATE + DELETE, WHEN MATCHED only */}
      <SectionTitle>{t.example2Title}</SectionTitle>
      <Prose>{t.example2Desc}</Prose>
      <SqlCard sql={MERGE2_SQL} className="mb-6" />
      <MergeTables2 t={t} />

      <Divider />

      {/* ON column restriction */}
      <SectionTitle>{t.onColumnTitle}</SectionTitle>
      <Prose>{t.onColumnDesc}</Prose>
      <InfoBox variant="note">
        <span>{t.onColumnWhy}</span>
      </InfoBox>

      <div className="text-red mb-3 flex items-center gap-1.5 font-mono text-[11px] font-bold">
        <span className="bg-red/10 rounded px-2 py-0.5">
          {t.onColumnBadLabel}
        </span>
      </div>
      <SqlCard
        tone="error"
        label={t.sqlError}
        sql={ON_COLUMN_BAD_SQL}
        className="mb-5"
      />

      <div className="text-green mb-3 flex items-center gap-1.5 font-mono text-[11px] font-bold">
        <span className="bg-green/10 rounded px-2 py-0.5">
          {t.onColumnGoodLabel}
        </span>
      </div>
      <SqlCard
        tone="ok"
        label={t.sqlCorrect}
        sql={ON_COLUMN_GOOD_SQL}
        className="mb-6"
      />

      <Divider />

      {/* Notes */}
      <InfoBox variant="warning">
        <ul className="mt-1 flex list-inside list-disc flex-col gap-1">
          {t.noteItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </InfoBox>
    </PageContainer>
  )
}
