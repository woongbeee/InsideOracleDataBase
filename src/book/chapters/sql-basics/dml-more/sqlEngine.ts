// 작은 SQL 실행 엔진 — 예시 쿼리 문자열을 파싱해 EMPLOYEES 위에서 흉내로 실행한다.
// ExecutionSection(실행 순서 시뮬레이터)과 MiniSimulator(구문별 미니 시뮬)가 공유한다.
//
// 데이터·타입은 @/data 의 공용 Employee / EMPLOYEE_COLUMNS 를 쓴다.
import { EMPLOYEE_COLUMNS, type Employee } from '@/data'

// ── 파싱 결과 타입 ─────────────────────────────────────────────────────────

export interface GroupRow {
  dept_id: number
  cnt?: number
  avg_sal?: number
  total_sal?: number
  max_sal?: number
  min_sal?: number
  stddev_sal?: number
  variance_sal?: number
  median_sal?: number
}

export interface ParsedQuery {
  type: 'SELECT' | 'UPDATE' | 'DELETE' | 'GROUPBY' | 'UNKNOWN'
  columns: string[]
  whereExpr: string
  setExpr: string
  matchedRows: Employee[]
  resultRows: Employee[]
  groupRows?: GroupRow[]
  groupCols?: string[]
  orderKey?: keyof Employee
  orderDir?: 'ASC' | 'DESC'
  orderKey2?: keyof Employee
  orderDir2?: 'ASC' | 'DESC'
}

// ── ORDER BY ──────────────────────────────────────────────────────────────

export function parseOrderPart(
  s: string,
  selectCols?: string[]
): { key: keyof Employee; dir: 'ASC' | 'DESC'; nulls?: 'FIRST' | 'LAST' } {
  const upper = s.trim().toUpperCase()
  const nulls: 'FIRST' | 'LAST' | undefined = upper.includes('NULLS FIRST')
    ? 'FIRST'
    : upper.includes('NULLS LAST')
      ? 'LAST'
      : undefined
  const cleaned = s
    .trim()
    .replace(/NULLS\s+(FIRST|LAST)/i, '')
    .trim()
  const parts = cleaned.split(/\s+/)
  const dir = parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
  if (/^\d+$/.test(parts[0])) {
    const pos = parseInt(parts[0]) - 1
    const colName = selectCols?.[pos] ?? EMPLOYEE_COLUMNS[pos] ?? 'emp_id'
    return { key: colName as keyof Employee, dir, nulls }
  }
  const key = parts[0].toLowerCase() as keyof Employee
  return { key, dir, nulls }
}

export function sortRows(
  rows: Employee[],
  key: keyof Employee,
  dir: 'ASC' | 'DESC',
  key2?: keyof Employee,
  dir2?: 'ASC' | 'DESC',
  nulls?: 'FIRST' | 'LAST',
  nulls2?: 'FIRST' | 'LAST'
): Employee[] {
  return rows.slice().sort((a, b) => {
    const av = a[key],
      bv = b[key]
    const aNull = av === null || av === undefined
    const bNull = bv === null || bv === undefined
    if (aNull || bNull) {
      const nullLast = nulls === 'LAST' || (!nulls && dir === 'ASC')
      if (aNull && bNull) return 0
      return aNull ? (nullLast ? 1 : -1) : nullLast ? -1 : 1
    }
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
    if (cmp !== 0) return dir === 'DESC' ? -cmp : cmp
    if (key2) {
      const av2 = a[key2],
        bv2 = b[key2]
      const a2Null = av2 === null || av2 === undefined
      const b2Null = bv2 === null || bv2 === undefined
      if (a2Null || b2Null) {
        const null2Last = nulls2 === 'LAST' || (!nulls2 && dir2 === 'ASC')
        if (a2Null && b2Null) return 0
        return a2Null ? (null2Last ? 1 : -1) : null2Last ? -1 : 1
      }
      const cmp2 =
        typeof av2 === 'number' && typeof bv2 === 'number'
          ? av2 - bv2
          : String(av2).localeCompare(String(bv2))
      return dir2 === 'DESC' ? -cmp2 : cmp2
    }
    return 0
  })
}

// ── GROUP BY / HAVING ─────────────────────────────────────────────────────

export function parseGroupCols(selectPart: string): string[] {
  const cols: string[] = ['dept_id']
  const u = selectPart.toUpperCase()
  if (u.includes('COUNT')) cols.push('cnt')
  if (u.includes('AVG')) cols.push('avg_sal')
  if (u.includes('SUM')) cols.push('total_sal')
  if (u.includes('MAX')) cols.push('max_sal')
  if (u.includes('MIN')) cols.push('min_sal')
  if (u.includes('STDDEV')) cols.push('stddev_sal')
  if (u.includes('VARIANCE')) cols.push('variance_sal')
  if (u.includes('MEDIAN')) cols.push('median_sal')
  return cols
}

export function evalHaving(g: GroupRow, expr: string): boolean {
  const cntGte = expr.match(/COUNT\s*\(\s*\*\s*\)\s*>=\s*(\d+)/i)
  if (cntGte) return (g.cnt ?? 0) >= parseInt(cntGte[1])
  const cntGt = expr.match(/COUNT\s*\(\s*\*\s*\)\s*>\s*(\d+)/i)
  if (cntGt) return (g.cnt ?? 0) > parseInt(cntGt[1])
  const cntLte = expr.match(/COUNT\s*\(\s*\*\s*\)\s*<=\s*(\d+)/i)
  if (cntLte) return (g.cnt ?? 0) <= parseInt(cntLte[1])
  const cntLt = expr.match(/COUNT\s*\(\s*\*\s*\)\s*<\s*(\d+)/i)
  if (cntLt) return (g.cnt ?? 0) < parseInt(cntLt[1])
  const avgGte = expr.match(/AVG\s*\(\s*salary\s*\)\s*>=\s*(\d+)/i)
  if (avgGte) return (g.avg_sal ?? 0) >= parseInt(avgGte[1])
  const sumGte = expr.match(/SUM\s*\(\s*salary\s*\)\s*>=\s*(\d+)/i)
  if (sumGte) return (g.total_sal ?? 0) >= parseInt(sumGte[1])
  return true
}

// ── WHERE ─────────────────────────────────────────────────────────────────

export function filterRows(rows: Employee[], expr: string): Employee[] {
  return rows.filter((r) => evalCond(r, expr))
}

export function evalCond(r: Employee, expr: string): boolean {
  const trimmed = expr.trim()

  const notBetween = trimmed.match(
    /salary\s+NOT\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)/i
  )
  if (notBetween)
    return (
      r.salary < parseInt(notBetween[1]) || r.salary > parseInt(notBetween[2])
    )

  const between = trimmed.match(/salary\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)/i)
  if (between)
    return r.salary >= parseInt(between[1]) && r.salary <= parseInt(between[2])

  const u = trimmed.toUpperCase()

  const andIdx = findTopLevelAnd(u)
  if (andIdx !== -1) {
    return (
      evalCond(r, trimmed.slice(0, andIdx).trim()) &&
      evalCond(r, trimmed.slice(andIdx + 5).trim())
    )
  }
  const orIdx = findTopLevelOr(u)
  if (orIdx !== -1) {
    return (
      evalCond(r, trimmed.slice(0, orIdx).trim()) ||
      evalCond(r, trimmed.slice(orIdx + 4).trim())
    )
  }

  if (/manager_id\s+IS\s+NOT\s+NULL/i.test(trimmed))
    return r.manager_id !== null
  if (/manager_id\s+IS\s+NULL/i.test(trimmed)) return r.manager_id === null

  const inMatch = trimmed.match(/dept_id\s+IN\s*\(([^)]+)\)/i)
  if (inMatch) {
    const vals = inMatch[1].split(',').map((v) => parseInt(v.trim()))
    return vals.includes(r.dept_id)
  }

  const inStrMatch = trimmed.match(/job_title\s+IN\s*\(([^)]+)\)/i)
  if (inStrMatch) {
    const vals = inStrMatch[1]
      .split(',')
      .map((v) => v.trim().replace(/'/g, '').toUpperCase())
    return vals.includes(r.job_title.toUpperCase())
  }

  const likeMatch = trimmed.match(/last_name\s+LIKE\s+'([^']+)'/i)
  if (likeMatch) {
    const pat = likeMatch[1]
    const name = r.last_name.toUpperCase()
    if (pat.startsWith('%') && pat.endsWith('%'))
      return name.includes(pat.slice(1, -1).toUpperCase())
    if (pat.startsWith('%')) return name.endsWith(pat.slice(1).toUpperCase())
    if (pat.endsWith('%'))
      return name.startsWith(pat.slice(0, -1).toUpperCase())
    return name === pat.toUpperCase()
  }

  const likeFirst = trimmed.match(/first_name\s+LIKE\s+'([^']+)'/i)
  if (likeFirst) {
    const pat = likeFirst[1]
    const name = r.first_name.toUpperCase()
    if (pat.startsWith('%') && pat.endsWith('%'))
      return name.includes(pat.slice(1, -1).toUpperCase())
    if (pat.startsWith('%')) return name.endsWith(pat.slice(1).toUpperCase())
    if (pat.endsWith('%'))
      return name.startsWith(pat.slice(0, -1).toUpperCase())
    return name === pat.toUpperCase()
  }

  const deptNe = trimmed.match(/dept_id\s*(?:!=|<>)\s*(\d+)/i)
  if (deptNe) return r.dept_id !== parseInt(deptNe[1])
  const deptEq = trimmed.match(/dept_id\s*=\s*(\d+)/i)
  if (deptEq) return r.dept_id === parseInt(deptEq[1])

  const salNe = trimmed.match(/salary\s*(?:!=|<>)\s*(\d+)/i)
  if (salNe) return r.salary !== parseInt(salNe[1])
  const salGte = trimmed.match(/salary\s*>=\s*(\d+)/i)
  if (salGte) return r.salary >= parseInt(salGte[1])
  const salLte = trimmed.match(/salary\s*<=\s*(\d+)/i)
  if (salLte) return r.salary <= parseInt(salLte[1])
  const salLt = trimmed.match(/salary\s*<\s*(\d+)/i)
  if (salLt) return r.salary < parseInt(salLt[1])
  const salGt = trimmed.match(/salary\s*>\s*(\d+)/i)
  if (salGt) return r.salary > parseInt(salGt[1])
  const salEq = trimmed.match(/salary\s*=\s*(\d+)/i)
  if (salEq) return r.salary === parseInt(salEq[1])

  const jobEq = trimmed.match(/job_title\s*=\s*'([^']+)'/i)
  if (jobEq) return r.job_title.toUpperCase() === jobEq[1].toUpperCase()

  return true
}

export function findTopLevelAnd(u: string): number {
  let depth = 0
  for (let i = 0; i < u.length - 4; i++) {
    if (u[i] === '(') depth++
    else if (u[i] === ')') depth--
    else if (depth === 0 && u.slice(i, i + 5) === ' AND ') return i
  }
  return -1
}

export function findTopLevelOr(u: string): number {
  let depth = 0
  for (let i = 0; i < u.length - 3; i++) {
    if (u[i] === '(') depth++
    else if (u[i] === ')') depth--
    else if (depth === 0 && u.slice(i, i + 4) === ' OR ') return i
  }
  return -1
}

// ── SELECT / UPDATE 투영·적용 ─────────────────────────────────────────────

export function projectRow(r: Employee, cols: string[]): Employee {
  const out: Partial<Employee> = {}
  for (const c of cols) {
    const k = c as keyof Employee
    if (k in r) (out as Record<string, unknown>)[k] = r[k]
  }
  return out as Employee
}

export function applySet(r: Employee, setExpr: string): Employee {
  const clone = { ...r }
  const salMul = setExpr.match(/salary\s*=\s*salary\s*\*\s*([\d.]+)/i)
  if (salMul) {
    clone.salary = Math.round(clone.salary * parseFloat(salMul[1]))
  }
  const salSet = setExpr.match(/salary\s*=\s*(\d+)/i)
  if (salSet && !salMul) {
    clone.salary = parseInt(salSet[1])
  }
  return clone
}

// ── 통합 파서 ─────────────────────────────────────────────────────────────

export function parseAndExecute(sql: string, data: Employee[]): ParsedQuery {
  const upper = sql.trim().toUpperCase()
  const EMPTY: ParsedQuery = {
    type: 'UNKNOWN',
    columns: [],
    whereExpr: '',
    setExpr: '',
    matchedRows: [],
    resultRows: [],
  }

  if (upper.includes('GROUP BY')) {
    const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s+GROUP BY|\s+HAVING|$)/is)
    const havingMatch = sql.match(/HAVING\s+(.+)/i)
    const whereExpr = whereMatch ? whereMatch[1].trim() : ''
    const filtered = whereExpr ? filterRows(data, whereExpr) : [...data]

    const groups = new Map<number, Employee[]>()
    for (const r of filtered) {
      const arr = groups.get(r.dept_id) ?? []
      arr.push(r)
      groups.set(r.dept_id, arr)
    }

    let groupRows: GroupRow[] = Array.from(groups.entries())
      .map(([dept_id, rows]) => {
        const avg = rows.reduce((s, r) => s + r.salary, 0) / rows.length
        const variance =
          rows.reduce((s, r) => s + (r.salary - avg) ** 2, 0) / rows.length
        const sorted = rows.map((r) => r.salary).sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        const median =
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid]
        return {
          dept_id,
          cnt: rows.length,
          avg_sal: Math.round(avg),
          total_sal: rows.reduce((s, r) => s + r.salary, 0),
          max_sal: Math.max(...rows.map((r) => r.salary)),
          min_sal: Math.min(...rows.map((r) => r.salary)),
          stddev_sal: Math.round(Math.sqrt(variance)),
          variance_sal: Math.round(variance),
          median_sal: median,
        }
      })
      .sort((a, b) => a.dept_id - b.dept_id)

    if (havingMatch) {
      const hExpr = havingMatch[1].trim()
      groupRows = groupRows.filter((g) => evalHaving(g, hExpr))
    }

    const selectPart = sql.substring(6, upper.indexOf('FROM')).trim()
    const groupCols = parseGroupCols(selectPart)

    return {
      type: 'GROUPBY',
      columns: [],
      whereExpr,
      setExpr: '',
      matchedRows: filtered,
      resultRows: [],
      groupRows,
      groupCols,
    }
  }

  if (upper.startsWith('SELECT')) {
    const fromMatch = sql.match(/FROM\s+\w+/i)
    if (!fromMatch) return EMPTY

    const isDistinct = /^SELECT\s+DISTINCT\s+/i.test(sql.trim())
    const rawSelectPart = sql.substring(6, upper.indexOf('FROM')).trim()
    const selectPart = isDistinct
      ? rawSelectPart.replace(/^DISTINCT\s+/i, '')
      : rawSelectPart
    const columns =
      selectPart === '*'
        ? []
        : selectPart.split(',').map((c) => c.trim().toLowerCase())

    const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s+ORDER BY|$)/is)
    const whereExpr = whereMatch ? whereMatch[1].trim() : ''
    const matched = whereExpr ? filterRows(data, whereExpr) : [...data]

    let distinctMatched = matched
    if (isDistinct && columns.length > 0) {
      const seen = new Set<string>()
      distinctMatched = matched.filter((r) => {
        const key = columns
          .map((c) => String(r[c as keyof Employee] ?? ''))
          .join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    let result =
      columns.length === 0
        ? [...distinctMatched]
        : distinctMatched.map((r) => projectRow(r, columns))
    const orderMatch = sql.match(/ORDER BY\s+(.+)/i)
    let orderKey: keyof Employee | undefined
    let orderDir: 'ASC' | 'DESC' = 'ASC'
    let orderKey2: keyof Employee | undefined
    let orderDir2: 'ASC' | 'DESC' = 'ASC'

    if (orderMatch) {
      const parts = orderMatch[1].split(',').map((s) => s.trim())
      const parse1 = parseOrderPart(parts[0], columns)
      orderKey = parse1.key
      orderDir = parse1.dir
      const nulls1 = parse1.nulls
      let nulls2: 'FIRST' | 'LAST' | undefined
      if (parts[1]) {
        const p2 = parseOrderPart(parts[1], columns)
        orderKey2 = p2.key
        orderDir2 = p2.dir
        nulls2 = p2.nulls
      }
      result = sortRows(
        [...distinctMatched],
        orderKey,
        orderDir,
        orderKey2,
        orderDir2,
        nulls1,
        nulls2
      ).map((r) => (columns.length === 0 ? r : projectRow(r, columns)))
    }

    return {
      type: 'SELECT',
      columns,
      whereExpr,
      setExpr: '',
      matchedRows: distinctMatched,
      resultRows: result,
      orderKey,
      orderDir,
      orderKey2,
      orderDir2,
    }
  }

  if (upper.startsWith('UPDATE')) {
    const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i)
    const whereMatch = sql.match(/WHERE\s+(.+)/i)
    const setExpr = setMatch ? setMatch[1].trim() : ''
    const whereExpr = whereMatch ? whereMatch[1].trim() : ''
    const matched = whereExpr ? filterRows(data, whereExpr) : [...data]
    const result = matched.map((r) => applySet(r, setExpr))

    return {
      type: 'UPDATE',
      columns: [],
      whereExpr,
      setExpr,
      matchedRows: matched,
      resultRows: result,
    }
  }

  if (upper.startsWith('DELETE')) {
    const whereMatch = sql.match(/WHERE\s+(.+)/i)
    const whereExpr = whereMatch ? whereMatch[1].trim() : ''
    const matched = whereExpr ? filterRows(data, whereExpr) : [...data]

    return {
      type: 'DELETE',
      columns: [],
      whereExpr,
      setExpr: '',
      matchedRows: matched,
      resultRows: matched,
    }
  }

  return EMPTY
}
