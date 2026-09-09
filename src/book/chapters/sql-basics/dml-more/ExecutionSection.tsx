import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PageContainer, ChapterTitle, SectionTitle, Prose } from '../../shared'
import { useSimulationStore } from '@/store/simulationStore'
import { IconPlayerPlay } from '@tabler/icons-react'
import { EMPLOYEES, EMPLOYEE_COLUMNS } from '@/data'
import {
  EXAMPLE_QUERIES,
  SELECT_STEPS,
  UPDATE_STEPS,
  DELETE_STEPS,
  STEP_COLOR,
  type ExampleQuery,
} from './executionQueries'
import { parseAndExecute, type ParsedQuery } from './sqlEngine'
import { SqlHighlight } from './SqlHighlight'
import { EmpRow } from './EmpRow'

const T = {
  ko: {
    chapterTitle: 'SQL 실행 순서',
    chapterSubtitle:
      'Oracle이 SQL을 처리하는 논리적 순서를 예제 쿼리별로 확인합니다.',
    pickQuery: '예제 쿼리를 선택하면 실행 순서가 바로 표시됩니다.',
    stepsTitle: '실행 순서',
    tableTitle: 'EMPLOYEES 테이블',
    resultTitle: '쿼리 결과',
    groupResultTitle: 'GROUP BY 결과',
    rowsMatched: (n: number) => `${n}개 행 일치`,
    updatedRows: (n: number) => `${n}개 행 수정`,
    deletedRows: (n: number) => `${n}개 행 삭제`,
    groupRows: (n: number) => `${n}개 그룹`,
    mergeSourceTitle: '원본 테이블 (SOURCE)',
    mergeTargetTitle: '대상 테이블 (TARGET)',
    mergeResultTitle: 'MERGE 결과',
  },
  en: {
    chapterTitle: 'SQL Execution Order',
    chapterSubtitle:
      'See how Oracle logically processes SQL — step by step — for each example query.',
    pickQuery: 'Click an example query to instantly see the execution order.',
    stepsTitle: 'Execution Order',
    tableTitle: 'EMPLOYEES Table',
    resultTitle: 'Query Result',
    groupResultTitle: 'GROUP BY Result',
    rowsMatched: (n: number) => `${n} row${n === 1 ? '' : 's'} matched`,
    updatedRows: (n: number) => `${n} row${n === 1 ? '' : 's'} updated`,
    deletedRows: (n: number) => `${n} row${n === 1 ? '' : 's'} deleted`,
    groupRows: (n: number) => `${n} group${n === 1 ? '' : 's'}`,
    mergeSourceTitle: 'Source Table (SOURCE)',
    mergeTargetTitle: 'Target Table (TARGET)',
    mergeResultTitle: 'MERGE Result',
  },
}

// ── Result table ────────────────────────────────────────────────────────────

function ResultTable({
  parsed,
  overrideResult,
}: {
  parsed: ParsedQuery
  overrideResult?: ExampleQuery['overrideResult']
}) {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const ALL_COLUMNS = EMPLOYEE_COLUMNS
  type EmpKey = (typeof EMPLOYEE_COLUMNS)[number]

  if (overrideResult) {
    const { columns, rows, summary } = overrideResult
    const summaryText = summary
      ? summary[lang]
      : lang === 'ko'
        ? `${rows.length}개 행`
        : `${rows.length} rows`
    return (
      <div>
        <div className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
          {t.resultTitle} — <span className="text-green">{summaryText}</span>
        </div>
        <div className="rounded-card inline-block border">
          <table className="text-xs">
            <thead>
              <tr className="bg-rail border-b">
                {columns.map((h) => (
                  <th
                    key={h}
                    className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b last:border-0',
                    i % 2 === 0 ? 'bg-paper' : 'bg-rail'
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c}
                      className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap"
                    >
                      {row[c] == null ? (
                        <span className="text-ink-2/50 italic">NULL</span>
                      ) : (
                        String(row[c])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (parsed.type === 'GROUPBY' && parsed.groupRows) {
    const cols = parsed.groupCols ?? ['dept_id']
    return (
      <div>
        <div className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
          {t.groupResultTitle} — {t.groupRows(parsed.groupRows.length)}
        </div>
        <div className="rounded-card inline-block border">
          <table className="text-xs">
            <thead>
              <tr className="bg-rail border-b">
                {cols.map((h) => (
                  <th
                    key={h}
                    className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.groupRows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b last:border-0',
                    i % 2 === 0 ? 'bg-paper' : 'bg-rail'
                  )}
                >
                  {cols.map((c) => (
                    <td
                      key={c}
                      className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap"
                    >
                      {String(
                        (row as unknown as Record<string, unknown>)[c] ?? 'NULL'
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (parsed.type === 'SELECT') {
    const headers: EmpKey[] =
      parsed.columns.length > 0
        ? (parsed.columns as EmpKey[])
        : [...ALL_COLUMNS]
    const summaryText = t.rowsMatched(parsed.resultRows.length)
    return (
      <div>
        <div className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
          {t.resultTitle} — <span className="text-green">{summaryText}</span>
        </div>
        <div className="rounded-card inline-block border">
          <table className="text-xs">
            <thead>
              <tr className="bg-rail border-b">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.resultRows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b last:border-0',
                    i % 2 === 0 ? 'bg-paper' : 'bg-rail'
                  )}
                >
                  {headers.map((c) => (
                    <td
                      key={c}
                      className="text-ink/80 px-3 py-1.5 font-mono text-[11px] whitespace-nowrap"
                    >
                      {String(row[c] ?? 'NULL')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (parsed.type === 'UPDATE') {
    return (
      <div>
        <div className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
          {t.resultTitle} —{' '}
          <span className="text-amber">
            {t.updatedRows(parsed.matchedRows.length)}
          </span>
        </div>
        <div className="rounded-card inline-block border">
          <table className="text-xs">
            <thead>
              <tr className="bg-rail border-b">
                {ALL_COLUMNS.map((h) => (
                  <th
                    key={h}
                    className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.matchedRows.map((emp) => {
                const resultRow = parsed.resultRows.find(
                  (r) => r.emp_id === emp.emp_id
                )
                return (
                  <EmpRow
                    key={emp.emp_id}
                    row={resultRow ?? emp}
                    highlighted={true}
                    deleted={false}
                    columns={[]}
                    original={emp}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (parsed.type === 'DELETE') {
    return (
      <div>
        <div className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
          {t.resultTitle} —{' '}
          <span className="text-red">
            {t.deletedRows(parsed.matchedRows.length)}
          </span>
        </div>
        <div className="rounded-card inline-block border">
          <table className="text-xs">
            <thead>
              <tr className="bg-rail border-b">
                {ALL_COLUMNS.map((h) => (
                  <th
                    key={h}
                    className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.matchedRows.map((emp) => (
                <EmpRow
                  key={emp.emp_id}
                  row={emp}
                  highlighted={true}
                  deleted={true}
                  columns={[]}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return null
}

// ── Merge panel ─────────────────────────────────────────────────────────────

const MERGE_COLS = ['emp_id', 'first_name', 'dept_id', 'salary']

function SimpleTable({
  rows,
  highlightIds,
  strikeIds,
  joinKey,
}: {
  rows: Record<string, unknown>[]
  highlightIds?: unknown[]
  strikeIds?: unknown[]
  joinKey: string
}) {
  return (
    <div className="rounded-card inline-block overflow-hidden border">
      <table className="text-xs">
        <thead>
          <tr className="bg-rail border-b">
            {MERGE_COLS.map((h) => (
              <th
                key={h}
                className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const id = row[joinKey]
            const isHighlighted = highlightIds?.includes(id)
            const isStruck = strikeIds?.includes(id)
            return (
              <tr
                key={i}
                className={cn(
                  'border-b last:border-0',
                  isHighlighted
                    ? 'bg-blue/10'
                    : i % 2 === 0
                      ? 'bg-paper'
                      : 'bg-rail'
                )}
              >
                {MERGE_COLS.map((c) => (
                  <td
                    key={c}
                    className={cn(
                      'px-3 py-1.5 font-mono text-[11px] whitespace-nowrap',
                      isStruck ? 'text-ink-2/50 line-through' : 'text-ink/80'
                    )}
                  >
                    {String(row[c] ?? 'NULL')}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MergePanel({
  mergeData,
}: {
  mergeData: NonNullable<ExampleQuery['mergeData']>
}) {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const statusStyle: Record<string, string> = {
    updated: 'bg-amber/10 border-amber/30',
    inserted: 'bg-green/10 border-green/30',
    unchanged: '',
  }
  const statusBadge: Record<string, { cls: string; label: string }> = {
    updated: { cls: 'bg-amber/15 text-amber', label: 'UPDATED' },
    inserted: { cls: 'bg-green/15 text-green', label: 'INSERTED' },
    unchanged: { cls: 'bg-rail text-ink-2', label: '—' },
  }

  return (
    <div className="flex flex-col gap-5">
      {/* SOURCE + TARGET side by side */}
      <div className="flex flex-wrap gap-4">
        <div>
          <div className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
            {t.mergeSourceTitle}
          </div>
          <SimpleTable
            rows={mergeData.sourceRows}
            highlightIds={[...mergeData.matchedIds, ...mergeData.insertedIds]}
            joinKey={mergeData.joinKey}
          />
        </div>
        <div>
          <div className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
            {t.mergeTargetTitle}
          </div>
          <SimpleTable
            rows={mergeData.targetRows}
            highlightIds={mergeData.matchedIds}
            joinKey={mergeData.joinKey}
          />
        </div>
      </div>

      {/* Result */}
      <div>
        <div className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-widest uppercase">
          {t.mergeResultTitle} —{' '}
          <span className="text-amber">
            {mergeData.matchedIds.length}개 Updated
          </span>
          {' · '}
          <span className="text-green">
            {mergeData.insertedIds.length}개 Inserted
          </span>
        </div>
        <div className="rounded-card inline-block overflow-hidden border">
          <table className="text-xs">
            <thead>
              <tr className="bg-rail border-b">
                {MERGE_COLS.map((h) => (
                  <th
                    key={h}
                    className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
                <th className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap">
                  status
                </th>
              </tr>
            </thead>
            <tbody>
              {mergeData.resultRows.map((row, i) => {
                const status = String(row['_status'] ?? 'unchanged')
                const orig = mergeData.targetRows.find(
                  (r) => r[mergeData.joinKey] === row[mergeData.joinKey]
                )
                return (
                  <tr
                    key={i}
                    className={cn(
                      'border-b transition-colors last:border-0',
                      statusStyle[status] ??
                        (i % 2 === 0 ? 'bg-paper' : 'bg-rail')
                    )}
                  >
                    {MERGE_COLS.map((c) => {
                      const isChangedSalary =
                        c === 'salary' &&
                        status === 'updated' &&
                        orig &&
                        orig[c] !== row[c]
                      return (
                        <td
                          key={c}
                          className={cn(
                            'px-3 py-1.5 font-mono text-[11px] whitespace-nowrap',
                            isChangedSalary
                              ? 'text-amber font-bold'
                              : 'text-ink/80'
                          )}
                        >
                          {String(row[c] ?? 'NULL')}
                          {isChangedSalary && (
                            <span className="text-ink-2/60 ml-1.5 text-[10px] font-normal line-through">
                              {String(orig[c])}
                            </span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold',
                          statusBadge[status]?.cls
                        )}
                      >
                        {statusBadge[status]?.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function ExecutionSimulator() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const [selectedId, setSelectedId] = useState<string>(EXAMPLE_QUERIES[0].id)

  const selectedQuery =
    EXAMPLE_QUERIES.find((q) => q.id === selectedId) ?? EXAMPLE_QUERIES[0]
  const parsed = parseAndExecute(selectedQuery.sql, EMPLOYEES)

  const steps = selectedQuery.steps
    ? selectedQuery.steps
    : parsed.type === 'UPDATE'
      ? UPDATE_STEPS
      : parsed.type === 'DELETE'
        ? DELETE_STEPS
        : SELECT_STEPS

  const ALL_COLUMNS = EMPLOYEE_COLUMNS

  return (
    <PageContainer className="max-w-[1200px]">
      <ChapterTitle
        icon={
          <IconPlayerPlay size={36} color="var(--color-green)" stroke={1.5} />
        }
        title={t.chapterTitle}
        subtitle={t.chapterSubtitle}
      />

      {/* Query picker */}
      <div className="mb-6">
        <Prose>{t.pickQuery}</Prose>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedId(q.id)}
              className={cn(
                'rounded-card border px-3 py-1.5 font-mono text-[11px] transition-all',
                selectedId === q.id
                  ? 'border-blue/50 bg-blue/10 text-blue font-bold'
                  : 'border-line bg-rail text-ink-2 hover:bg-rail'
              )}
            >
              {q.label[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Steps (left) + Table & Result (right) */}
      <div className="flex items-start gap-6">
        {/* Left: SQL + execution steps — fixed width, vertical list */}
        <div className="w-[414px] shrink-0">
          {/* SQL display */}
          <div className="rounded-panel mb-4 overflow-hidden border">
            <div className="bg-rail border-b px-4 py-2">
              <span className="text-ink-2 font-mono text-[10px] tracking-widest uppercase">
                SQL
              </span>
            </div>
            <div className="bg-code-bg p-4">
              <SqlHighlight sql={selectedQuery.sql} bare />
            </div>
          </div>
          <SectionTitle>{t.stepsTitle}</SectionTitle>
          <div className="flex flex-col gap-2">
            {steps.map((step, idx) => {
              const c = STEP_COLOR[step.color] ?? STEP_COLOR.blue
              return (
                <div
                  key={step.id}
                  className={cn('rounded-card border p-3', c.bg, c.border)}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-full', c.dot)}
                    />
                    <span
                      className={cn('font-mono text-[11px] font-bold', c.text)}
                    >
                      {step.phase}
                    </span>
                    <span className="text-ink-2/60 ml-auto font-mono text-[10px]">
                      Step {idx + 1}
                    </span>
                  </div>
                  <p className={cn('text-[11px] leading-relaxed', c.text)}>
                    {step.desc[lang]}
                  </p>
                  {step.hint && (
                    <div className="border-muted-foreground/20 bg-paper/60 mt-2 rounded border px-2.5 py-1.5">
                      <span className="mr-1 text-[10px]">💡</span>
                      <span className="text-ink-2 text-[10px] leading-relaxed">
                        {step.hint[lang]}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: tables + result — takes remaining space */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {selectedQuery.type === 'MERGE' && selectedQuery.mergeData ? (
            <MergePanel mergeData={selectedQuery.mergeData} />
          ) : (
            <>
              <div>
                <div className="text-ink-2 mb-2 font-mono text-[10px] font-bold tracking-widest uppercase">
                  {t.tableTitle}
                </div>
                <div className="rounded-card inline-block overflow-x-auto border">
                  <table className="text-xs">
                    <thead>
                      <tr className="bg-rail border-b">
                        {ALL_COLUMNS.map((h) => (
                          <th
                            key={h}
                            className="text-ink-2 px-3 py-2 text-left font-mono font-bold whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {EMPLOYEES.map((emp) => {
                        const isHighlighted = parsed.matchedRows.some(
                          (r) => r.emp_id === emp.emp_id
                        )
                        const resultRow = parsed.resultRows.find(
                          (r) => r.emp_id === emp.emp_id
                        )
                        const isDeleted =
                          parsed.type === 'DELETE' && isHighlighted
                        return (
                          <EmpRow
                            key={emp.emp_id}
                            row={
                              parsed.type === 'UPDATE' && resultRow
                                ? resultRow
                                : emp
                            }
                            highlighted={isHighlighted}
                            deleted={!!isDeleted}
                            columns={[]}
                            original={
                              parsed.type === 'UPDATE' && isHighlighted
                                ? emp
                                : undefined
                            }
                          />
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <ResultTable
                parsed={parsed}
                overrideResult={selectedQuery.overrideResult}
              />
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
