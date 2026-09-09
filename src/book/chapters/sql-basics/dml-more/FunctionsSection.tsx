import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { PageContainer, ChapterTitle, Prose, Divider } from '../../shared'
import { SqlHighlight } from './SqlHighlight'
import { useSimulationStore } from '@/store/simulationStore'

// ── Types ──────────────────────────────────────────────────────────────────

interface ResultTable {
  sourceHeaders: string[]
  sourceRows: (string | null)[][]
  resultHeaders: string[]
  resultRows: (string | null)[][]
}

interface FuncItem {
  name: string
  signature: string
  desc: { ko: string; en: string }
  example: string
  tables: ResultTable
  note?: { ko: string; en: string }
}

// ── Sample data ─────────────────────────────────────────────────────────────

const EMP_ROWS: (string | null)[][] = [
  ['101', 'Alice', '10', '7200', 'null'],
  ['102', 'Bob', '20', '5400', '101'],
  ['103', 'Carol', '10', '8100', '101'],
  ['104', 'David', '30', '4900', '102'],
  ['105', 'Eva', '20', '6300', '101'],
  ['106', 'Frank', '30', '3800', '102'],
  ['107', 'Grace', '10', '9500', 'null'],
  ['108', 'Henry', '20', '5900', '101'],
]

// ── Data ───────────────────────────────────────────────────────────────────

const FUNC_ITEMS: FuncItem[] = [
  {
    name: 'CASE WHEN',
    signature: 'CASE WHEN cond THEN val … ELSE val END',
    desc: {
      ko: 'ANSI 표준 조건 표현식입니다. 조건을 위에서 아래로 순서대로 평가하고, 처음으로 TRUE가 되는 THEN 값을 반환합니다. 어떤 조건도 TRUE가 아니면 ELSE 값을 반환하고, ELSE가 없으면 NULL을 반환합니다.',
      en: 'An ANSI standard conditional expression. Conditions are evaluated top to bottom and the first TRUE branch is returned. If no condition matches, the ELSE value is returned — or NULL if ELSE is omitted.',
    },
    example:
      "SELECT first_name, salary,\n       CASE\n         WHEN salary >= 8000 THEN 'Senior'\n         WHEN salary >= 5000 THEN 'Mid'\n         ELSE 'Junior'\n       END AS grade\nFROM   employees",
    tables: {
      sourceHeaders: ['first_name', 'salary'],
      sourceRows: EMP_ROWS.map((r) => [r[1], r[3]]),
      resultHeaders: ['first_name', 'salary', 'grade'],
      resultRows: EMP_ROWS.map((r) => {
        const sal = Number(r[3])
        const grade = sal >= 8000 ? 'Senior' : sal >= 5000 ? 'Mid' : 'Junior'
        return [r[1], r[3], grade]
      }),
    },
    note: {
      ko: 'DECODE와 달리 범위 조건(>=, BETWEEN), 복합 조건(AND, OR), 서브쿼리도 WHEN 절에 사용할 수 있습니다.',
      en: 'Unlike DECODE, the WHEN clause supports range conditions (>=, BETWEEN), compound conditions (AND, OR), and subqueries.',
    },
  },
  {
    name: 'DECODE',
    signature: 'DECODE(expr, s1,r1, s2,r2, …, default)',
    desc: {
      ko: 'Oracle 전용 조건 함수입니다. expr을 s1, s2 순서로 등치(=) 비교하여 일치하는 결과값을 반환합니다. 어떤 값과도 일치하지 않으면 default를 반환하고, default가 없으면 NULL을 반환합니다.',
      en: 'An Oracle-specific conditional function. Compares expr against s1, s2 in order using equality and returns the matching result. If no value matches, returns default — or NULL if default is omitted.',
    },
    example:
      "SELECT first_name, dept_id,\n       DECODE(dept_id,\n              10, 'Engineering',\n              20, 'Analytics',\n              30, 'Support',\n              'Other') AS dept_label\nFROM   employees",
    tables: {
      sourceHeaders: ['first_name', 'dept_id'],
      sourceRows: EMP_ROWS.map((r) => [r[1], r[2]]),
      resultHeaders: ['first_name', 'dept_id', 'dept_label'],
      resultRows: EMP_ROWS.map((r) => {
        const label =
          r[2] === '10'
            ? 'Engineering'
            : r[2] === '20'
              ? 'Analytics'
              : r[2] === '30'
                ? 'Support'
                : 'Other'
        return [r[1], r[2], label]
      }),
    },
    note: {
      ko: 'DECODE는 등치(=) 비교만 가능합니다. 범위 조건이 필요하면 CASE WHEN을 사용하세요.',
      en: 'DECODE only supports equality (=) comparisons. Use CASE WHEN when you need range conditions.',
    },
  },
  {
    name: 'NVL',
    signature: 'NVL(expr, replacement)',
    desc: {
      ko: 'expr이 NULL이면 replacement를 반환하고, NULL이 아니면 expr을 그대로 반환합니다. NULL 값을 기본값으로 대체할 때 사용합니다.',
      en: 'Returns replacement if expr is NULL; otherwise returns expr as-is. Used to substitute a default value for NULLs.',
    },
    example:
      'SELECT first_name,\n       manager_id,\n       NVL(manager_id, 0) AS mgr\nFROM   employees',
    tables: {
      sourceHeaders: ['first_name', 'manager_id'],
      sourceRows: EMP_ROWS.map((r) => [r[1], r[4]]),
      resultHeaders: ['first_name', 'manager_id', 'mgr'],
      resultRows: EMP_ROWS.map((r) => [
        r[1],
        r[4],
        r[4] === 'null' ? '0' : r[4],
      ]),
    },
    note: {
      ko: 'expr과 replacement의 데이터 타입이 같아야 합니다. 타입이 다르면 Oracle이 암묵적으로 변환하거나 오류가 발생할 수 있습니다.',
      en: 'expr and replacement must be the same data type. If they differ, Oracle will attempt implicit conversion, which may cause errors.',
    },
  },
  {
    name: 'NVL2',
    signature: 'NVL2(expr, not_null_val, null_val)',
    desc: {
      ko: 'expr이 NULL이 아니면 not_null_val을, NULL이면 null_val을 반환합니다. NVL과 달리 NULL인 경우와 아닌 경우에 각각 다른 값을 지정할 수 있습니다.',
      en: 'Returns not_null_val if expr is not NULL; returns null_val if it is. Unlike NVL, you can specify a different value for both the NULL and non-NULL cases.',
    },
    example:
      "SELECT first_name,\n       manager_id,\n       NVL2(manager_id, 'Member', 'Leader') AS role\nFROM   employees",
    tables: {
      sourceHeaders: ['first_name', 'manager_id'],
      sourceRows: EMP_ROWS.map((r) => [r[1], r[4]]),
      resultHeaders: ['first_name', 'manager_id', 'role'],
      resultRows: EMP_ROWS.map((r) => [
        r[1],
        r[4],
        r[4] === 'null' ? 'Leader' : 'Member',
      ]),
    },
    note: {
      ko: 'NVL2는 Oracle 전용 함수입니다. 표준 SQL에서는 CASE WHEN expr IS NULL THEN … ELSE … END로 동일하게 표현할 수 있습니다.',
      en: 'NVL2 is Oracle-specific. In standard SQL, the equivalent is CASE WHEN expr IS NULL THEN … ELSE … END.',
    },
  },
]

const C = {
  bg: 'bg-rail',
  border: 'border-line',
  text: 'text-ink/80',
  active: 'bg-blue/10 text-blue',
}

// ── MiniTable ───────────────────────────────────────────────────────────────

function MiniTable({
  headers,
  rows,
  highlightLast,
}: {
  headers: string[]
  rows: (string | null)[][]
  highlightLast?: boolean
}) {
  return (
    <div className="rounded-card overflow-hidden border text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-rail border-b">
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  'px-2.5 py-1.5 text-left font-mono text-[10px] font-bold',
                  highlightLast && i === headers.length - 1
                    ? 'text-blue'
                    : 'text-ink-2'
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {row.map((cell, ci) => {
                const isNull = cell === 'null'
                const isHighlight = highlightLast && ci === row.length - 1
                return (
                  <td
                    key={ci}
                    className={cn(
                      'px-2.5 py-1 font-mono text-[11px]',
                      isNull
                        ? 'text-ink-2/40 italic'
                        : isHighlight
                          ? 'text-blue font-bold'
                          : 'text-ink/80'
                    )}
                  >
                    {isNull ? 'NULL' : cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── FunctionsSection ────────────────────────────────────────────────────────

export function FunctionsSection() {
  const lang = useSimulationStore((s) => s.lang)
  const [openItem, setOpenItem] = useState<string>(FUNC_ITEMS[0].name)
  const item = FUNC_ITEMS.find((f) => f.name === openItem)!

  return (
    <PageContainer>
      <ChapterTitle
        icon="📋"
        title={lang === 'ko' ? 'Oracle 주요 함수' : 'Oracle Key Functions'}
        subtitle={
          lang === 'ko'
            ? 'SQL에서 조건 분기와 NULL 처리에 자주 쓰이는 CASE WHEN, DECODE, NVL, NVL2를 알아봅니다.'
            : 'Learn CASE WHEN, DECODE, NVL, and NVL2 — the most-used functions for conditional logic and NULL handling in SQL.'
        }
      />

      <div className="grid grid-cols-[160px_1fr] items-start gap-4">
        {/* LEFT: 함수 목록 */}
        <div className="rounded-panel bg-rail flex flex-col gap-1 border p-2">
          {FUNC_ITEMS.map((f) => {
            const isActive = f.name === openItem
            return (
              <button
                key={f.name}
                onClick={() => setOpenItem(f.name)}
                className={cn(
                  'rounded-card px-3 py-2 text-left font-mono text-xs font-bold transition-all',
                  isActive ? C.active : 'text-ink-2 hover:bg-rail'
                )}
              >
                {f.name}
              </button>
            )
          })}
        </div>

        {/* RIGHT: 상세 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            {/* 헤더 */}
            <div
              className={cn(
                'rounded-panel border px-4 py-3',
                C.bg,
                C.border,
                C.text
              )}
            >
              <div className="mb-1 font-mono text-[10px] font-bold tracking-wider uppercase opacity-60">
                {lang === 'ko'
                  ? '조건 / NULL 처리 함수'
                  : 'Conditional / NULL Functions'}
              </div>
              <div className="font-mono text-xl font-black">{item.name}</div>
              <div
                className={cn(
                  'mt-1.5 inline-block rounded border px-2 py-0.5 font-mono text-[11px]',
                  C.active
                )}
              >
                {item.signature}
              </div>
            </div>

            {/* 설명 */}
            <div className="rounded-panel bg-paper border px-4 py-3">
              <Prose>{item.desc[lang]}</Prose>
            </div>

            {/* 예시 쿼리 */}
            <div>
              <p className="text-ink-2 mb-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
                {lang === 'ko' ? '예시 쿼리' : 'Example Query'}
              </p>
              <SqlHighlight sql={item.example} />
            </div>

            {/* 실행 결과 */}
            <div>
              <p className="text-ink-2 mb-2 font-mono text-[11px] font-bold tracking-wider uppercase">
                {lang === 'ko' ? '실행 결과' : 'Result'}
              </p>
              <MiniTable
                headers={item.tables.resultHeaders}
                rows={item.tables.resultRows}
                highlightLast
              />
            </div>

            {/* 참고 */}
            {item.note && (
              <>
                <Divider />
                <div
                  className={cn(
                    'rounded-panel border px-4 py-3 text-xs leading-relaxed',
                    C.bg,
                    C.border,
                    C.text
                  )}
                >
                  <span className="mr-1.5 font-bold">💡</span>
                  {item.note[lang]}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageContainer>
  )
}
