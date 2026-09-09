import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSimulationStore } from '@/store/simulationStore'
import {
  EMPLOYEES,
  EMPLOYEE_COLUMNS,
  employeeCell,
  type Employee,
} from '@/data'
import { parseAndExecute, type GroupRow } from './sqlEngine'
import type { ClauseDemo } from './clauseDemos'
import { SqlHighlight } from './SqlHighlight'

// ── MiniSimulatorTable ─────────────────────────────────────────────────────

export function MiniSimulatorTable({ sql }: { sql: string }) {
  const ALL_COLS: readonly (keyof Employee)[] = EMPLOYEE_COLUMNS
  const parsed = parseAndExecute(sql, EMPLOYEES)

  if (parsed.type === 'GROUPBY' && parsed.groupRows) {
    const cols = parsed.groupCols ?? ['dept_id', 'cnt']
    const DEPT_COLOR: Record<number, string> = {
      10: 'bg-blue/10',
      20: 'bg-green/10',
      30: 'bg-rail',
    }
    return (
      <>
        <div className="rounded-card overflow-x-auto border text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-rail border-b">
                {cols.map((h) => (
                  <th
                    key={h}
                    className="text-ink-2 px-2 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.groupRows.map((g: GroupRow) => (
                <tr
                  key={g.dept_id}
                  className={cn(
                    'border-b last:border-0',
                    DEPT_COLOR[g.dept_id] ?? ''
                  )}
                >
                  {cols.map((col) => {
                    const val =
                      col === 'dept_id'
                        ? g.dept_id
                        : col === 'cnt'
                          ? g.cnt
                          : col === 'avg_sal'
                            ? g.avg_sal
                            : col === 'total_sal'
                              ? g.total_sal
                              : col === 'max_sal'
                                ? g.max_sal
                                : col === 'min_sal'
                                  ? g.min_sal
                                  : '—'
                    return (
                      <td
                        key={col}
                        className="px-2 py-1.5 font-mono text-[10px] font-medium"
                      >
                        {String(val ?? '—')}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="font-mono text-[11px]">
          <span className="text-green font-bold">
            {parsed.groupRows.length} groups
          </span>
        </div>
      </>
    )
  }

  const isDistinctQuery = /^\s*SELECT\s+DISTINCT\s+/i.test(sql)

  if (
    isDistinctQuery &&
    parsed.type === 'SELECT' &&
    parsed.columns.length > 0
  ) {
    return (
      <>
        <div className="rounded-card overflow-x-auto border text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-rail border-b">
                {(parsed.columns as string[]).map((h) => (
                  <th
                    key={h}
                    className="text-ink-2 px-2 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.matchedRows.map((r, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className={cn(
                    'border-b last:border-0',
                    i % 2 === 0 ? 'bg-green/10' : 'bg-green/10'
                  )}
                >
                  {(parsed.columns as Array<keyof Employee>).map((col) => (
                    <td
                      key={col}
                      className="text-green px-2 py-1 font-mono text-[10px] font-medium"
                    >
                      {employeeCell(r, col)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="font-mono text-[11px]">
          <span className="text-green font-bold">
            {parsed.matchedRows.length} distinct rows
          </span>
        </div>
      </>
    )
  }

  const matchedIds = new Set(parsed.matchedRows.map((r) => r.emp_id))
  const updatedMap = new Map<number, Employee>()
  if (parsed.type === 'UPDATE')
    parsed.resultRows.forEach((r) => updatedMap.set(r.emp_id, r))

  const showCols: readonly (keyof Employee)[] =
    parsed.type === 'SELECT' && parsed.columns.length > 0
      ? (parsed.columns as Array<keyof Employee>)
      : ALL_COLS

  const hasWhere = parsed.whereExpr !== ''
  const baseRows: Employee[] =
    parsed.type === 'SELECT' && parsed.orderKey
      ? parsed.resultRows
          .map((r) => EMPLOYEES.find((e) => e.emp_id === r.emp_id)!)
          .filter(Boolean)
      : hasWhere || parsed.type === 'UPDATE' || parsed.type === 'DELETE'
        ? EMPLOYEES.filter((e) => matchedIds.has(e.emp_id))
        : EMPLOYEES

  return (
    <>
      <div className="rounded-card overflow-x-auto border text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-rail border-b">
              {showCols.map((h) => {
                const isOrderKey =
                  parsed.orderKey === h || parsed.orderKey2 === h
                const dir =
                  parsed.orderKey === h ? parsed.orderDir : parsed.orderDir2
                return (
                  <th
                    key={h}
                    className={cn(
                      'px-2 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap',
                      isOrderKey ? 'text-blue' : 'text-ink-2'
                    )}
                  >
                    {h}
                    {isOrderKey ? (dir === 'DESC' ? ' ↓' : ' ↑') : ''}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {baseRows.map((emp, i) => {
              const matched = matchedIds.has(emp.emp_id)
              const isDeleted = parsed.type === 'DELETE' && matched
              const displayRow =
                parsed.type === 'UPDATE' &&
                matched &&
                updatedMap.has(emp.emp_id)
                  ? updatedMap.get(emp.emp_id)!
                  : emp

              return (
                <motion.tr
                  key={emp.emp_id}
                  initial={parsed.orderKey ? { opacity: 0, y: -4 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: parsed.orderKey ? i * 0.04 : 0,
                  }}
                  className={cn(
                    'border-b last:border-0',
                    matched && !isDeleted && !parsed.orderKey && 'bg-blue/10',
                    isDeleted && 'bg-red/10'
                  )}
                >
                  {showCols.map((col) => {
                    const origVal =
                      parsed.type === 'UPDATE' && matched
                        ? employeeCell(emp, col)
                        : undefined
                    const newVal = employeeCell(displayRow, col)
                    const changed = origVal !== undefined && origVal !== newVal
                    return (
                      <td
                        key={col}
                        className={cn(
                          'px-2 py-1 font-mono text-[10px]',
                          isDeleted && 'text-red line-through'
                        )}
                      >
                        {changed ? (
                          <span>
                            <span className="text-red mr-1 line-through">
                              {origVal}
                            </span>
                            <span className="text-green font-bold">
                              {newVal}
                            </span>
                          </span>
                        ) : (
                          newVal
                        )}
                      </td>
                    )
                  })}
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="font-mono text-[11px]">
        {parsed.type === 'SELECT' && (
          <span className="text-green font-bold">
            {matchedIds.size} rows returned
          </span>
        )}
        {parsed.type === 'UPDATE' && (
          <span className="text-amber font-bold">
            {matchedIds.size} rows updated
          </span>
        )}
        {parsed.type === 'DELETE' && (
          <span className="text-red font-bold">
            {matchedIds.size} rows deleted
          </span>
        )}
      </div>
    </>
  )
}

// ── MiniSimulator ──────────────────────────────────────────────────────────

export function MiniSimulator({
  demo,
  variantIdx = 0,
}: {
  demo: ClauseDemo
  variantIdx?: number
}) {
  const lang = useSimulationStore((s) => s.lang)
  const variants = demo.variants
  const activeSql = variants ? variants[variantIdx].sql : demo.sql
  const activeDesc = variants ? variants[variantIdx].desc[lang] : undefined

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSql}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-2"
        >
          <SqlHighlight sql={activeSql} />
          {activeDesc && (
            <p className="text-ink-2 font-mono text-[11px] leading-relaxed">
              {activeDesc}
            </p>
          )}
          <MiniSimulatorTable sql={activeSql} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── ClickableSyntaxRow ─────────────────────────────────────────────────────

export function ClickableSyntaxRow({
  demo,
  header,
  rows,
  topContent,
  bottomContent,
}: {
  demo: ClauseDemo
  header: string[]
  rows: string[][]
  topContent?: React.ReactNode
  bottomContent?: React.ReactNode
}) {
  const [selectedRow, setSelectedRow] = useState(0)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <div>
        {topContent}
        <div className="rounded-card overflow-hidden border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-rail border-b">
                {header.map((h, i) => (
                  <th
                    key={i}
                    className="text-ink-2 px-3 py-2 text-left font-mono font-bold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  onClick={() => setSelectedRow(ri)}
                  className={cn(
                    'cursor-pointer border-b transition-colors last:border-0',
                    ri === selectedRow
                      ? 'bg-blue/10 outline-blue/50 outline outline-1'
                      : ri % 2 === 0
                        ? 'bg-paper hover:bg-rail'
                        : 'bg-rail hover:bg-rail'
                  )}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        'px-3 py-1.5 font-mono text-[11px]',
                        ri === selectedRow
                          ? 'text-blue font-medium'
                          : 'text-ink/80'
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bottomContent}
      </div>

      <div className="rounded-panel bg-paper border p-4">
        <MiniSimulator demo={demo} variantIdx={selectedRow} />
      </div>
    </div>
  )
}

// ── SyntaxRow ──────────────────────────────────────────────────────────────

export function SyntaxRow({
  left,
  demo,
}: {
  left: React.ReactNode
  demo: ClauseDemo
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <div>{left}</div>
      <div className="rounded-panel bg-paper border p-4">
        <MiniSimulator demo={demo} />
      </div>
    </div>
  )
}
