import { cn } from '@/lib/utils'

// keyword → color category
type KwCategory =
  | 'ddl'
  | 'dml'
  | 'dcl'
  | 'tcl'
  | 'clause'
  | 'func'
  | 'logic'
  | 'plan'

interface KwDef {
  words: string[]
  category: KwCategory
}

const KW_GROUPS: KwDef[] = [
  {
    category: 'ddl',
    words: [
      'CREATE TABLE',
      'CREATE INDEX',
      'CREATE VIEW',
      'CREATE SEQUENCE',
      'CREATE',
      'ALTER TABLE',
      'ALTER',
      'DROP TABLE',
      'DROP INDEX',
      'DROP VIEW',
      'DROP',
      'TRUNCATE TABLE',
      'TRUNCATE',
      'RENAME',
    ],
  },
  {
    category: 'dml',
    words: [
      'SELECT',
      'INSERT INTO',
      'INSERT',
      'INTO',
      'VALUES',
      'UPDATE',
      'SET',
      'DELETE FROM',
      'DELETE',
      'MERGE INTO',
      'MERGE',
      'USING',
      'WHEN MATCHED THEN',
      'WHEN NOT MATCHED THEN',
    ],
  },
  {
    category: 'dcl',
    words: ['GRANT', 'REVOKE', 'TO', 'FROM'],
  },
  {
    category: 'tcl',
    words: ['COMMIT', 'ROLLBACK TO', 'ROLLBACK', 'SAVEPOINT'],
  },
  {
    category: 'clause',
    words: [
      'LEFT OUTER JOIN',
      'RIGHT OUTER JOIN',
      'FULL OUTER JOIN',
      'INNER JOIN',
      'CROSS JOIN',
      'ORDER BY',
      'GROUP BY',
      'FROM',
      'WHERE',
      'HAVING',
      'JOIN',
      'ON',
      'AND',
      'OR',
      'NOT',
      'IN',
      'IS',
      'NULL',
      'LIKE',
      'BETWEEN',
      'EXISTS',
      'ASC',
      'DESC',
      'CASE WHEN',
      'CASE',
      'WHEN',
      'THEN',
      'ELSE',
      'END',
      'DISTINCT',
      'ALL',
      'AS',
      'PRIMARY KEY',
      'NOT NULL',
      'UNIQUE',
      'REFERENCES',
      'CONSTRAINT',
      'CHECK',
      'DEFAULT',
      'CASCADE',
      'CASCADE CONSTRAINTS',
      'WITH',
    ],
  },
  {
    category: 'plan',
    words: [
      'EXPLAIN PLAN FOR',
      'EXPLAIN PLAN',
      'DBMS_XPLAN.DISPLAY_CURSOR',
      'DBMS_XPLAN.DISPLAY',
      'DBMS_XPLAN.DISPLAY_AWR',
      'SET AUTOTRACE',
      'AUTOTRACE TRACEONLY STATISTICS',
      'AUTOTRACE TRACEONLY',
      'AUTOTRACE ON',
      'AUTOTRACE OFF',
      'GATHER_PLAN_STATISTICS',
      'ALLSTATS LAST',
      'ALLSTATS',
      'STATISTICS_LEVEL',
      'V$SQL_PLAN',
      'PLAN_TABLE',
    ],
  },
  {
    category: 'func',
    words: [
      'COUNT',
      'SUM',
      'AVG',
      'MAX',
      'MIN',
      'MONTHS_BETWEEN',
      'ADD_MONTHS',
      'TO_DATE',
      'TO_CHAR',
      'TRUNC',
      'SYSTIMESTAMP',
      'SYSDATE',
      'SYS_EXTRACT_UTC',
      'FROM_TZ',
      'AT TIME ZONE',
      'INTERVAL',
      'CAST',
      'NVL2',
      'NVL',
      'DECODE',
      'COALESCE',
      'NULLIF',
      'RANK',
      'DENSE_RANK',
      'ROW_NUMBER',
      'OVER',
      'PARTITION BY',
      'LISTAGG',
      'WITHIN GROUP',
    ],
  },
]

// 색은 tokens.css §2c 콘텐츠 색 (테마 따라 자동 스왑).
const CATEGORY_CLASS: Record<KwCategory, string> = {
  ddl: 'text-purple',
  dml: 'text-blue',
  dcl: 'text-green',
  tcl: 'text-amber',
  clause: 'text-blue',
  func: 'text-purple',
  logic: 'text-blue',
  plan: 'text-red',
}

const ACTIVE_CLASS = 'bg-amber/15 text-amber ring-1 ring-amber/40'

// flatten to [{word, category}] sorted longest-first so multi-word keywords match first
const ALL_KEYWORDS = KW_GROUPS.flatMap(({ words, category }) =>
  words.map((w) => ({ word: w, category }))
).sort((a, b) => b.word.length - a.word.length)

const PATTERN = new RegExp(
  '(?<![\\w.])(' +
    ALL_KEYWORDS.map((k) =>
      k.word.replace(/\./g, '\\.').replace(/\s+/g, '\\s+')
    ).join('|') +
    ')(?![\\w.])',
  'gi'
)

const KW_MAP = new Map(
  ALL_KEYWORDS.map((k) => [k.word.toUpperCase(), k.category])
)

// Split a line into [before-comment, comment] parts
function splitLineComment(line: string): [string, string] {
  const idx = line.indexOf('--')
  if (idx === -1) return [line, '']
  return [line.slice(0, idx), line.slice(idx)]
}

export function SqlHighlight({
  sql,
  activeClause,
  bare = false,
  className,
}: {
  sql: string
  activeClause?: string
  /** true 면 배경·보더·패딩 없이 <pre> 만. 이미 코드 셸(SqlBlock 등)로 감싼 경우. */
  bare?: boolean
  className?: string
}) {
  const lines = sql.split('\n')

  function highlightCode(
    code: string
  ): Array<{ text: string; isKw: boolean; category?: KwCategory }> {
    const parts: Array<{ text: string; isKw: boolean; category?: KwCategory }> =
      []
    let lastIndex = 0
    let match: RegExpExecArray | null
    const re = new RegExp(PATTERN.source, 'gi')

    while ((match = re.exec(code)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: code.slice(lastIndex, match.index), isKw: false })
      }
      const matched = match[0]
      const upper = matched.replace(/\s+/g, ' ').toUpperCase()
      parts.push({ text: matched, isKw: true, category: KW_MAP.get(upper) })
      lastIndex = match.index + matched.length
    }
    if (lastIndex < code.length) {
      parts.push({ text: code.slice(lastIndex), isKw: false })
    }
    return parts
  }

  const pre = (
    <pre
      className={cn(
        'text-ink font-mono text-xs leading-relaxed break-all whitespace-pre-wrap',
        !bare &&
          'rounded-card border-code-border bg-code-bg overflow-x-auto border px-4 py-3',
        className
      )}
    >
      {lines.map((line, li) => {
        const [code, comment] = splitLineComment(line)
        const parts = highlightCode(code)
        return (
          <span key={li}>
            {parts.map((p, i) => {
              if (!p.isKw) return <span key={i}>{p.text}</span>
              const upper = p.text.replace(/\s+/g, ' ').toUpperCase()
              const isActive = activeClause && upper === activeClause
              return (
                <span
                  key={i}
                  className={cn(
                    'rounded px-0.5 font-bold transition-all duration-200',
                    isActive
                      ? ACTIVE_CLASS
                      : CATEGORY_CLASS[p.category ?? 'clause']
                  )}
                >
                  {p.text}
                </span>
              )
            })}
            {comment && <span className="text-ink-3 italic">{comment}</span>}
            {li < lines.length - 1 && '\n'}
          </span>
        )
      })}
    </pre>
  )

  return pre
}
