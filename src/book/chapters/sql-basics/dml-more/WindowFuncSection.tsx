import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  PageContainer,
  ChapterTitle,
  SectionTitle,
  Prose,
  Divider,
} from '../../shared'
import { IconChartBar } from '@tabler/icons-react'
import { SqlHighlight } from './SqlHighlight'
import { useSimulationStore } from '@/store/simulationStore'
import { EMPLOYEES } from '@/data'

// ── Types ──────────────────────────────────────────────────────────────────

interface FuncItem {
  name: string
  signature: string
  desc: { ko: string; en: string }
  queryDesc: { ko: string; en: string }
  example: string
  resultHeaders: string[]
  resultRows: (string | null)[][]
  note?: { ko: string; en: string }
}

interface FrameFuncItem {
  name: string
  signature: string
  desc: { ko: string; en: string }
  queryDesc: { ko: string; en: string }
  example: string
  resultHeaders: string[]
  resultRows: (string | null)[][]
  note?: { ko: string; en: string }
}

interface WordEntry {
  word: string
  literal: string
  meaning: string
  example: string
}

// ── Sample data (derived from shared EMPLOYEES, first 3 dept groups) ─────────

// Pick up to 3 members from each of the first 3 distinct dept_ids encountered
const _deptSample: Record<number, typeof EMPLOYEES> = {}
for (const e of EMPLOYEES) {
  if (Object.keys(_deptSample).length === 3 && !_deptSample[e.dept_id]) continue
  ;(_deptSample[e.dept_id] ??= []).push(e)
  if (_deptSample[e.dept_id].length > 3) _deptSample[e.dept_id].pop()
}
const _sampleEmps = Object.values(_deptSample).flat().slice(0, 9)
const _deptKeys = Object.keys(_deptSample)

// [emp_id, first_name, dept_id, salary]
const EMP_ROWS = _sampleEmps.map((e) => [
  String(e.emp_id),
  e.first_name,
  String(e.dept_id),
  String(e.salary),
])

// ── Precomputed result rows ─────────────────────────────────────────────────

function rowNumberPartitioned(): (string | null)[][] {
  const byDept: Record<string, typeof EMP_ROWS> = {}
  for (const r of EMP_ROWS) {
    ;(byDept[r[2]] ??= []).push(r)
  }
  const result: (string | null)[][] = []
  for (const dept of _deptKeys) {
    const sorted = [...(byDept[dept] ?? [])].sort(
      (a, b) => Number(b[3]) - Number(a[3])
    )
    sorted.forEach((r, i) => result.push([r[1], r[2], r[3], String(i + 1)]))
  }
  return result
}

function rankRows(): (string | null)[][] {
  const sorted = [...EMP_ROWS].sort((a, b) => Number(b[3]) - Number(a[3]))
  let rank = 1
  return sorted.map((r, i) => {
    if (i > 0 && r[3] !== sorted[i - 1][3]) rank = i + 1
    return [r[1], r[2], r[3], String(rank)]
  })
}

function denseRankRows(): (string | null)[][] {
  const sorted = [...EMP_ROWS].sort((a, b) => Number(b[3]) - Number(a[3]))
  let rank = 1
  return sorted.map((r, i) => {
    if (i > 0 && r[3] !== sorted[i - 1][3]) rank++
    return [r[1], r[2], r[3], String(rank)]
  })
}

function lagRows(): (string | null)[][] {
  const sorted = [...EMP_ROWS].sort((a, b) => Number(a[0]) - Number(b[0]))
  return sorted.map((r, i) => {
    const prev = i > 0 ? sorted[i - 1][3] : null
    const diff = prev !== null ? String(Number(r[3]) - Number(prev)) : null
    return [r[1], r[3], prev, diff]
  })
}

function leadRows(): (string | null)[][] {
  const sorted = [...EMP_ROWS].sort((a, b) => Number(a[0]) - Number(b[0]))
  return sorted.map((r, i) => {
    const next = i < sorted.length - 1 ? sorted[i + 1][3] : null
    const diff = next !== null ? String(Number(next) - Number(r[3])) : null
    return [r[1], r[3], next, diff]
  })
}

function aggWindowRows(): (string | null)[][] {
  const deptGroups: Record<string, typeof EMP_ROWS> = {}
  for (const r of EMP_ROWS) (deptGroups[r[2]] ??= []).push(r)
  const result: (string | null)[][] = []
  for (const dept of _deptKeys) {
    const rows = deptGroups[dept] ?? []
    const total = rows.reduce((s, r) => s + Number(r[3]), 0)
    const avg = Math.round(total / rows.length)
    const cnt = rows.length
    const mx = Math.max(...rows.map((r) => Number(r[3])))
    const mn = Math.min(...rows.map((r) => Number(r[3])))
    for (const r of rows)
      result.push([
        r[1],
        r[2],
        r[3],
        String(total),
        String(avg),
        String(cnt),
        String(mx),
        String(mn),
      ])
  }
  return result
}

function firstLastValueRows(): (string | null)[][] {
  const deptGroups: Record<string, typeof EMP_ROWS> = {}
  for (const r of EMP_ROWS) (deptGroups[r[2]] ??= []).push(r)
  const result: (string | null)[][] = []
  for (const dept of _deptKeys) {
    const rows = [...(deptGroups[dept] ?? [])].sort(
      (a, b) => Number(b[3]) - Number(a[3])
    )
    const first = rows[0][3]
    const last = rows[rows.length - 1][3]
    for (const r of rows) result.push([r[1], r[2], r[3], first, last])
  }
  return result
}

// running total with SUM + ORDER BY (no explicit frame = default cumulative)
function runningSumRows(): (string | null)[][] {
  const rows = [...EMP_ROWS]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .slice(0, 6)
  let acc = 0
  return rows.map((r) => {
    acc += Number(r[3])
    return [r[1], r[3], String(acc)]
  })
}

// rolling 3-row average: ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
function rollingAvgRows(): (string | null)[][] {
  const rows = [...EMP_ROWS]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .slice(0, 6)
  return rows.map((r, i) => {
    const window = rows.slice(Math.max(0, i - 1), i + 2)
    const avg = Math.round(
      window.reduce((s, w) => s + Number(w[3]), 0) / window.length
    )
    return [r[1], r[3], String(avg)]
  })
}

// ROWS vs RANGE: ORDER BY salary, emp_id <= 106 (6명), salary 오름차순
function rowsVsRangeRows(): (string | null)[][] {
  const rows = [...EMP_ROWS]
    .filter((r) => Number(r[0]) <= 106)
    .sort((a, b) => Number(a[3]) - Number(b[3]))
  return rows.map((r, i) => {
    const sal = Number(r[3])
    // ROWS BETWEEN 2 PRECEDING AND CURRENT ROW: 물리적 2행 앞~현재
    const rowsWindow = rows.slice(Math.max(0, i - 2), i + 1)
    const rowsSum = rowsWindow.reduce((s, w) => s + Number(w[3]), 0)
    // RANGE BETWEEN 1000 PRECEDING AND CURRENT ROW: salary >= sal-1000 인 행~현재
    const rangeWindow = rows.filter(
      (w) => Number(w[3]) >= sal - 1000 && Number(w[3]) <= sal
    )
    const rangeSum = rangeWindow.reduce((s, w) => s + Number(w[3]), 0)
    return [r[1], r[3], String(rowsSum), String(rangeSum)]
  })
}

function ntileRows(): (string | null)[][] {
  const sorted = [...EMP_ROWS].sort((a, b) => Number(b[3]) - Number(a[3]))
  const n = 4
  const total = sorted.length
  return sorted.map((r, i) => {
    const bucket = Math.ceil((i + 1) / (total / n))
    return [r[1], r[3], String(Math.min(bucket, n))]
  })
}

function nthValueRows(): (string | null)[][] {
  const deptGroups: Record<string, typeof EMP_ROWS> = {}
  for (const r of EMP_ROWS) (deptGroups[r[2]] ??= []).push(r)
  const result: (string | null)[][] = []
  for (const dept of _deptKeys) {
    const rows = [...(deptGroups[dept] ?? [])].sort(
      (a, b) => Number(b[3]) - Number(a[3])
    )
    const second = rows.length >= 2 ? rows[1][3] : null
    for (const r of rows) result.push([r[1], r[2], r[3], second])
  }
  return result
}

function cumeDistRows(): (string | null)[][] {
  const sorted = [...EMP_ROWS].sort((a, b) => Number(a[3]) - Number(b[3]))
  const total = sorted.length
  return sorted.map((r, i) => {
    // 같은 값인 행까지 포함한 누적 count
    let cnt = i + 1
    while (cnt < total && sorted[cnt][3] === r[3]) cnt++
    const cd = (cnt / total).toFixed(4)
    return [r[1], r[3], cd]
  })
}

function percentRankRows(): (string | null)[][] {
  const sorted = [...EMP_ROWS].sort((a, b) => Number(a[3]) - Number(b[3]))
  const total = sorted.length
  let rank = 1
  return sorted.map((r, i) => {
    if (i > 0 && r[3] !== sorted[i - 1][3]) rank = i + 1
    const pr = total === 1 ? '0.0000' : ((rank - 1) / (total - 1)).toFixed(4)
    return [r[1], r[3], pr]
  })
}

// ── Part 1: Window function items ──────────────────────────────────────────

const FUNC_ITEMS: FuncItem[] = [
  {
    name: 'ROW_NUMBER',
    signature: 'ROW_NUMBER() OVER ([PARTITION BY …] ORDER BY …)',
    desc: {
      ko: '각 행에 고유한 순번을 부여합니다. 동일한 값이 있어도 순번이 중복되지 않습니다. PARTITION BY를 추가하면 그룹 내에서 순번을 다시 시작합니다.',
      en: 'Assigns a unique sequential number to each row. Even with duplicate values, no two rows share the same number. Adding PARTITION BY restarts numbering within each group.',
    },
    queryDesc: {
      ko: 'employees 테이블에서 부서(dept_id)별로 급여가 높은 순서대로 순번(rn)을 매깁니다. 같은 부서 안에서 급여가 가장 높은 직원이 rn = 1이 됩니다.',
      en: 'Assigns a rank number within each department, ordered by salary descending. The highest-paid employee in each department gets rn = 1.',
    },
    example:
      'SELECT first_name, dept_id, salary,\n       ROW_NUMBER() OVER\n         (PARTITION BY dept_id\n          ORDER BY salary DESC) AS rn\nFROM   employees',
    resultHeaders: ['first_name', 'dept_id', 'salary', 'rn'],
    resultRows: rowNumberPartitioned(),
    note: {
      ko: 'ROW_NUMBER는 순번에 중복이 없으므로, 각 부서에서 급여가 가장 높은 1명만 뽑을 때 WHERE rn = 1 조건으로 사용합니다.',
      en: 'Because ROW_NUMBER has no ties, WHERE rn = 1 reliably selects exactly one top-salary employee per department.',
    },
  },
  {
    name: 'RANK',
    signature: 'RANK() OVER ([PARTITION BY …] ORDER BY …)',
    desc: {
      ko: '동일한 값에 같은 순위를 부여하고, 다음 순위는 동순위 행 수만큼 건너뜁니다. 예를 들어 2위가 2명이면 다음 순위는 4위가 됩니다.',
      en: 'Assigns the same rank to equal values, then skips the next rank(s) by the number of tied rows. For example, if two rows share rank 2, the next rank is 4.',
    },
    queryDesc: {
      ko: 'employees 전체에서 급여 내림차순으로 순위(rnk)를 매깁니다. 급여가 같은 직원이 있으면 같은 순위를 공유하고, 다음 순위는 동순위 수만큼 건너뜁니다.',
      en: 'Ranks all employees by salary descending across the entire table. Employees with the same salary share the same rank, and the next rank skips by the number of tied rows.',
    },
    example:
      'SELECT first_name, dept_id, salary,\n       RANK() OVER\n         (ORDER BY salary DESC) AS rnk\nFROM   employees',
    resultHeaders: ['first_name', 'dept_id', 'salary', 'rnk'],
    resultRows: rankRows(),
    note: {
      ko: '동순위 처리가 필요하지만 순위 번호에 공백이 생겨도 괜찮을 때 사용합니다. 공백 없이 연속된 순위가 필요하면 DENSE_RANK를 사용하세요.',
      en: 'Use when ties are valid but gaps in rank numbers are acceptable. Use DENSE_RANK if you need consecutive rank numbers without gaps.',
    },
  },
  {
    name: 'DENSE_RANK',
    signature: 'DENSE_RANK() OVER ([PARTITION BY …] ORDER BY …)',
    desc: {
      ko: '동일한 값에 같은 순위를 부여하되, 다음 순위를 건너뛰지 않습니다. 예를 들어 2위가 2명이면 다음 순위는 3위가 됩니다.',
      en: 'Assigns the same rank to equal values, but the next rank is consecutive (no gap). For example, if two rows share rank 2, the next rank is 3.',
    },
    queryDesc: {
      ko: 'RANK와 동일하게 급여 내림차순 순위를 매기지만, 공동 순위가 있어도 다음 순위를 건너뛰지 않습니다. RANK와 결과를 나란히 비교해 차이를 확인해 보세요.',
      en: 'Same setup as RANK — salary descending across all employees — but the next rank after a tie is consecutive, with no gap. Compare the results side-by-side with RANK to see the difference.',
    },
    example:
      'SELECT first_name, dept_id, salary,\n       DENSE_RANK() OVER\n         (ORDER BY salary DESC) AS drnk\nFROM   employees',
    resultHeaders: ['first_name', 'dept_id', 'salary', 'drnk'],
    resultRows: denseRankRows(),
    note: {
      ko: 'RANK와 달리 순위 번호가 연속적입니다. 등급이나 레벨을 부여할 때 공백 없는 연속 순위가 필요하면 DENSE_RANK를 선택하세요.',
      en: 'Unlike RANK, the rank numbers are always consecutive. Choose DENSE_RANK when you need gapless ranks, such as for grades or tiers.',
    },
  },
  {
    name: 'LAG',
    signature: 'LAG(col [, offset [, default]]) OVER (ORDER BY …)',
    desc: {
      ko: '현재 행에서 offset만큼 이전 행의 값을 반환합니다. offset 기본값은 1, default는 NULL입니다. 이전 행이 없으면 default 값을 반환합니다.',
      en: 'Returns the value from the row offset rows before the current row. Default offset is 1; default value is NULL. Returns the default if no prior row exists.',
    },
    queryDesc: {
      ko: 'emp_id 순서로 정렬한 뒤, 각 직원의 이전 직원 급여(prev_sal)와 현재 급여와의 차이(diff)를 한 행에서 조회합니다. 첫 번째 직원은 이전 행이 없으므로 prev_sal과 diff가 NULL입니다.',
      en: "Sorted by emp_id, shows each employee's previous employee's salary (prev_sal) and the difference from the current salary (diff) in the same row. The first employee has no prior row, so prev_sal and diff are NULL.",
    },
    example:
      'SELECT first_name, salary,\n       LAG(salary) OVER\n         (ORDER BY emp_id) AS prev_sal,\n       salary - LAG(salary) OVER\n         (ORDER BY emp_id) AS diff\nFROM   employees',
    resultHeaders: ['first_name', 'salary', 'prev_sal', 'diff'],
    resultRows: lagRows(),
    note: {
      ko: '연속된 행 간의 변화량(증감)을 계산하거나, 이전 달과 이번 달 데이터를 비교할 때 활용합니다.',
      en: 'Useful for calculating changes between consecutive rows or comparing current and previous period values.',
    },
  },
  {
    name: 'LEAD',
    signature: 'LEAD(col [, offset [, default]]) OVER (ORDER BY …)',
    desc: {
      ko: '현재 행에서 offset만큼 다음 행의 값을 반환합니다. LAG와 반대 방향입니다. 다음 행이 없으면 default 값을 반환합니다.',
      en: 'Returns the value from the row offset rows after the current row — the opposite direction of LAG. Returns the default if no following row exists.',
    },
    queryDesc: {
      ko: 'emp_id 순서로 정렬한 뒤, 각 직원의 다음 직원 급여(next_sal)와 현재 급여와의 차이(diff)를 한 행에서 조회합니다. 마지막 직원은 다음 행이 없으므로 next_sal과 diff가 NULL입니다.',
      en: "Sorted by emp_id, shows each employee's next employee's salary (next_sal) and the difference from the current salary (diff) in the same row. The last employee has no following row, so next_sal and diff are NULL.",
    },
    example:
      'SELECT first_name, salary,\n       LEAD(salary) OVER\n         (ORDER BY emp_id) AS next_sal,\n       LEAD(salary) OVER\n         (ORDER BY emp_id) - salary AS diff\nFROM   employees',
    resultHeaders: ['first_name', 'salary', 'next_sal', 'diff'],
    resultRows: leadRows(),
    note: {
      ko: '다음 행의 데이터를 현재 행과 함께 비교하는 데 활용합니다. 예를 들어, 다음 분기 목표와 현재 실적을 한 행에서 비교할 때 유용합니다.',
      en: 'Use to compare next-row data alongside the current row — for example, viewing current performance alongside next-quarter targets in a single row.',
    },
  },
  {
    name: 'SUM / AVG / COUNT',
    signature: 'AGG(col) OVER ([PARTITION BY …] [ORDER BY …])',
    desc: {
      ko: 'SUM, AVG, COUNT, MAX, MIN 등 모든 집계 함수를 OVER 절과 함께 윈도우 함수로 사용할 수 있습니다. GROUP BY처럼 행을 합치지 않고, 각 행에 집계 결과를 나란히 붙여줍니다. 부서별 평균 급여와 개인 급여를 한 행에서 비교하는 패턴에 자주 쓰입니다.',
      en: 'All aggregate functions — SUM, AVG, COUNT, MAX, MIN — can be used as window functions with OVER. Unlike GROUP BY they preserve each row, attaching the aggregate result alongside it. Commonly used to compare individual values against group aggregates in a single query.',
    },
    queryDesc: {
      ko: '각 직원 행에 소속 부서의 급여 합계·평균·인원 수·최고·최솟값을 함께 표시합니다. GROUP BY로는 개별 직원 정보와 부서 집계를 한 쿼리에 담을 수 없지만, 윈도우 함수는 원본 행을 유지하면서 집계 결과를 나란히 붙여줍니다.',
      en: 'Attaches the department-level aggregates (total salary, average, headcount, max, min) alongside each individual employee row. Unlike GROUP BY, which collapses rows, window functions keep every row intact and append the aggregate results.',
    },
    example:
      'SELECT first_name, dept_id, salary,\n       SUM(salary)   OVER (PARTITION BY dept_id) AS dept_sum,\n       ROUND(\n         AVG(salary)  OVER (PARTITION BY dept_id)\n       )                                        AS dept_avg,\n       COUNT(*)      OVER (PARTITION BY dept_id) AS dept_cnt,\n       MAX(salary)   OVER (PARTITION BY dept_id) AS dept_max,\n       MIN(salary)   OVER (PARTITION BY dept_id) AS dept_min\nFROM   employees\nORDER BY dept_id, salary DESC',
    resultHeaders: [
      'first_name',
      'dept_id',
      'salary',
      'dept_sum',
      'dept_avg',
      'dept_cnt',
      'dept_max',
      'dept_min',
    ],
    resultRows: aggWindowRows(),
    note: {
      ko: '집계 윈도우 함수는 서브쿼리 없이 그룹 집계와 개별 행 데이터를 한 번에 조회할 수 있습니다. salary / SUM(salary) OVER (PARTITION BY dept_id) 패턴으로 부서 내 급여 비중도 계산할 수 있습니다.',
      en: "Aggregate window functions let you fetch group totals and individual row data in a single query without subqueries. The pattern salary / SUM(salary) OVER (PARTITION BY dept_id) also computes each employee's share of the department payroll.",
    },
  },
  {
    name: 'NTILE',
    signature: 'NTILE(n) OVER ([PARTITION BY …] ORDER BY …)',
    desc: {
      ko: '정렬된 행들을 n개의 구간(버킷)으로 균등하게 나누고 각 행에 버킷 번호(1~n)를 부여합니다. 전체 행 수가 n으로 나누어 떨어지지 않으면 앞쪽 버킷에 한 행씩 더 배분됩니다.',
      en: 'Divides the sorted rows into n equal buckets and assigns each row a bucket number (1 through n). If the total row count is not evenly divisible by n, the earlier buckets receive one extra row.',
    },
    queryDesc: {
      ko: '전체 직원을 급여 내림차순으로 정렬한 뒤 4개 등급(1~4)으로 나눕니다. 급여 상위 25%가 1등급, 하위 25%가 4등급이 됩니다.',
      en: 'Sorts all employees by salary descending and divides them into 4 tiers. The top 25% by salary fall into tier 1, the bottom 25% into tier 4.',
    },
    example:
      'SELECT first_name, salary,\n       NTILE(4) OVER\n         (ORDER BY salary DESC) AS tier\nFROM   employees',
    resultHeaders: ['first_name', 'salary', 'tier'],
    resultRows: ntileRows(),
    note: {
      ko: '성과 평가·등급 분류처럼 전체를 n등분해 구간별로 처리하고 싶을 때 사용합니다. RANK/DENSE_RANK와 달리 동점자도 강제로 서로 다른 버킷에 들어갈 수 있습니다.',
      en: 'Use when you need to divide a population into equal bands — performance tiers, quantiles, etc. Unlike RANK/DENSE_RANK, ties can end up in different buckets because the split is positional, not value-based.',
    },
  },
  {
    name: 'NTH_VALUE',
    signature: 'NTH_VALUE(col, n) OVER ([PARTITION BY …] ORDER BY … [frame])',
    desc: {
      ko: '윈도우(또는 파티션) 내에서 ORDER BY 기준으로 정렬했을 때 n번째 행의 값을 반환합니다. n = 1이면 FIRST_VALUE와 동일합니다. NTH_VALUE는 frame 절의 영향을 받는 함수입니다. frame 절이 무엇인지는 바로 아래 Part 2에서 자세히 다룹니다.',
      en: 'Returns the value of the nth row within the window (sorted by ORDER BY). When n = 1 it is equivalent to FIRST_VALUE. NTH_VALUE is one of the functions that respects the frame clause — Part 2 just below covers what the frame clause is in detail.',
    },
    queryDesc: {
      ko: '부서별로 급여 내림차순 정렬 후, 각 부서에서 두 번째로 급여가 높은 직원의 급여(2nd_salary)를 모든 행에 표시합니다.',
      en: 'Within each department sorted by salary descending, shows the salary of the second-highest-paid employee (2nd_salary) on every row.',
    },
    example:
      'SELECT first_name, dept_id, salary,\n       NTH_VALUE(salary, 2) OVER\n         (PARTITION BY dept_id\n          ORDER BY salary DESC\n          ROWS BETWEEN UNBOUNDED PRECEDING\n                   AND UNBOUNDED FOLLOWING) AS "2nd_salary"\nFROM   employees\nORDER BY dept_id, salary DESC',
    resultHeaders: ['first_name', 'dept_id', 'salary', '2nd_salary'],
    resultRows: nthValueRows(),
    note: {
      ko: 'frame 절(ROWS BETWEEN …)이 무엇인지는 Part 2에서 설명합니다. 지금은 "파티션 전체를 보려면 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING을 써야 한다"는 점만 기억하세요. 이 절을 생략하면 기본 frame이 CURRENT ROW에서 멈춰 n번째 이전 행에서 NULL이 반환됩니다.',
      en: 'Part 2 explains what the frame clause (ROWS BETWEEN …) means in full. For now, just remember: add ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING to cover the entire partition. Without it, the default frame stops at CURRENT ROW and rows before the nth position return NULL.',
    },
  },
  {
    name: 'CUME_DIST',
    signature: 'CUME_DIST() OVER ([PARTITION BY …] ORDER BY …)',
    desc: {
      ko: '현재 행의 값 이하인 행이 전체에서 차지하는 비율을 반환합니다. 계산식은 (현재 행 이하인 행 수) / (전체 행 수)이며, 결과는 0 초과 1 이하의 값입니다. 동일한 값을 가진 행들은 같은 CUME_DIST 값을 공유합니다.',
      en: "Returns the proportion of rows with a value less than or equal to the current row's value. Formula: (number of rows ≤ current value) / (total rows). Result is in the range (0, 1]. Rows with equal values share the same CUME_DIST.",
    },
    queryDesc: {
      ko: '전체 직원을 급여 오름차순으로 정렬해 각 직원의 누적 분포 비율을 계산합니다. 예를 들어 CUME_DIST = 0.5라면 해당 직원보다 급여가 낮거나 같은 직원이 전체의 50%라는 의미입니다.',
      en: "Sorts all employees by salary ascending and computes the cumulative distribution. A CUME_DIST of 0.5 means 50% of employees have a salary less than or equal to this employee's salary.",
    },
    example:
      'SELECT first_name, salary,\n       ROUND(\n         CUME_DIST() OVER\n           (ORDER BY salary)\n       , 4) AS cume_dist\nFROM   employees\nORDER BY salary',
    resultHeaders: ['first_name', 'salary', 'cume_dist'],
    resultRows: cumeDistRows(),
    note: {
      ko: '"상위 30% 직원 조회" 같은 백분위 필터에 활용됩니다. WHERE 절에 직접 쓸 수 없으므로 서브쿼리나 CTE로 감싼 뒤 CUME_DIST <= 0.3 조건을 적용합니다.',
      en: 'Useful for percentile-based filters like "top 30% of employees." Since window functions cannot appear directly in WHERE, wrap the query in a subquery or CTE and filter with CUME_DIST <= 0.3.',
    },
  },
  {
    name: 'PERCENT_RANK',
    signature: 'PERCENT_RANK() OVER ([PARTITION BY …] ORDER BY …)',
    desc: {
      ko: '현재 행의 상대적 순위를 0~1 사이의 백분율로 반환합니다. 계산식은 (RANK - 1) / (전체 행 수 - 1)이며, 첫 번째 행은 항상 0, 마지막 행은 항상 1입니다. CUME_DIST와 달리 현재 행보다 작은 값의 비율을 나타냅니다.',
      en: 'Returns the relative rank of the current row as a value between 0 and 1. Formula: (RANK − 1) / (total rows − 1). The first row is always 0 and the last is always 1. Unlike CUME_DIST, it represents the proportion of rows strictly less than the current value.',
    },
    queryDesc: {
      ko: '전체 직원을 급여 오름차순으로 정렬해 각 직원의 상대적 순위 비율을 계산합니다. 0에 가까울수록 하위권, 1에 가까울수록 상위권에 해당합니다.',
      en: "Sorts all employees by salary ascending and computes each employee's relative rank. Values closer to 0 are in the lower range; values closer to 1 are at the top.",
    },
    example:
      'SELECT first_name, salary,\n       ROUND(\n         PERCENT_RANK() OVER\n           (ORDER BY salary)\n       , 4) AS pct_rank\nFROM   employees\nORDER BY salary',
    resultHeaders: ['first_name', 'salary', 'pct_rank'],
    resultRows: percentRankRows(),
    note: {
      ko: 'CUME_DIST와 혼동하기 쉽습니다. PERCENT_RANK는 현재 행보다 작은 값의 비율(첫 행 = 0), CUME_DIST는 현재 행 이하인 값의 비율(첫 행 > 0)입니다. 두 함수 모두 마지막 행에서는 1을 반환합니다.',
      en: 'Easy to confuse with CUME_DIST. PERCENT_RANK counts rows strictly less than the current value (first row = 0); CUME_DIST counts rows less than or equal to it (first row > 0). Both return 1 for the last row.',
    },
  },
]

// ── Part 2: Frame clause items ─────────────────────────────────────────────

const FRAME_ITEMS: FrameFuncItem[] = [
  {
    name: 'UNBOUNDED PRECEDING ~ CURRENT ROW',
    signature: 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW',
    desc: {
      ko: '파티션의 첫 번째 행부터 현재 행까지를 집계 범위로 지정합니다. ORDER BY와 함께 사용하면 누적합(running total)을 계산할 수 있습니다. ORDER BY가 있을 때 frame 절을 생략하면 이 값이 기본값으로 적용됩니다.',
      en: 'Includes all rows from the start of the partition up to the current row. When combined with ORDER BY this computes a running total. This is the default frame when ORDER BY is present and no frame clause is specified.',
    },
    queryDesc: {
      ko: 'emp_id 순서로 정렬하면서, 첫 번째 행부터 현재 행까지의 급여를 누적합산합니다. 행이 아래로 내려갈수록 running_sum 값이 계속 커집니다.',
      en: 'Sorted by emp_id, accumulates salary from the very first row up to the current row. The running_sum grows with each successive row.',
    },
    example:
      'SELECT first_name, salary,\n       SUM(salary) OVER (\n         ORDER BY emp_id\n         ROWS BETWEEN UNBOUNDED PRECEDING\n                  AND CURRENT ROW\n       ) AS running_sum\nFROM   employees\nWHERE  emp_id <= 106',
    resultHeaders: ['first_name', 'salary', 'running_sum'],
    resultRows: runningSumRows(),
    note: {
      ko: 'ORDER BY만 쓰고 frame 절을 생략해도 기본값이 RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW이므로 누적합이 계산됩니다. 단, 동일 값(피어)이 있을 때 ROWS와 RANGE의 결과가 달라지므로 명시적으로 ROWS를 지정하는 것이 안전합니다.',
      en: 'Omitting the frame clause with ORDER BY defaults to RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, which also produces a running total. However, when ties exist, ROWS and RANGE behave differently — explicitly specifying ROWS is safer.',
    },
  },
  {
    name: 'N PRECEDING ~ N FOLLOWING',
    signature: 'ROWS BETWEEN N PRECEDING AND N FOLLOWING',
    desc: {
      ko: '현재 행을 중심으로 앞 N행부터 뒤 N행까지를 집계 범위로 지정합니다. 1 PRECEDING AND 1 FOLLOWING은 앞 1행 + 현재 행 + 뒤 1행, 총 3개 행을 대상으로 집계합니다. 이동 평균(moving average)이나 슬라이딩 윈도우 집계에 사용됩니다.',
      en: 'Includes N rows before the current row, the current row itself, and N rows after. ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING covers a 3-row window. Used for moving averages and sliding-window aggregations.',
    },
    queryDesc: {
      ko: '각 직원 기준으로 앞뒤 1행씩, 총 3행의 급여 이동 평균(rolling_avg_3)을 계산합니다. 경계 행(첫 행·마지막 행)에서는 윈도우가 줄어들어 2행만 평균 냅니다.',
      en: 'Computes a 3-row moving average for each employee — the row before, the current row, and the row after. At the boundaries (first and last rows) the window shrinks to 2 rows.',
    },
    example:
      'SELECT first_name, salary,\n       ROUND(AVG(salary) OVER (\n         ORDER BY emp_id\n         ROWS BETWEEN 1 PRECEDING\n                  AND 1 FOLLOWING\n       )) AS rolling_avg_3\nFROM   employees\nWHERE  emp_id <= 106',
    resultHeaders: ['first_name', 'salary', 'rolling_avg_3'],
    resultRows: rollingAvgRows(),
    note: {
      ko: '파티션 경계에서는 윈도우가 자동으로 줄어듭니다. 예를 들어 첫 번째 행에는 이전 행이 없으므로 현재 행 + 다음 행 2개만 포함됩니다.',
      en: 'At partition boundaries the window shrinks automatically. For the first row there is no preceding row, so the window contains only the current row and the one following it.',
    },
  },
  {
    name: 'UNBOUNDED PRECEDING ~ UNBOUNDED FOLLOWING',
    signature: 'ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING',
    desc: {
      ko: '파티션 전체(첫 행부터 마지막 행까지)를 항상 집계 범위로 지정합니다. ORDER BY가 있어도 현재 행 위치와 무관하게 파티션 전체를 대상으로 집계합니다. LAST_VALUE로 파티션의 실제 마지막 값을 가져올 때 반드시 필요합니다.',
      en: 'Covers the entire partition — from the first row to the last — regardless of the current row position. Required when using LAST_VALUE to retrieve the true last value of a partition, since the default frame stops at the current row.',
    },
    queryDesc: {
      ko: '부서별로 급여 내림차순 정렬 후, LAST_VALUE로 파티션의 마지막(최저 급여) 값을 모든 행에 표시합니다. frame을 명시하지 않으면 기본 frame이 CURRENT ROW에서 멈춰 올바른 값이 나오지 않습니다.',
      en: 'Within each department sorted by salary descending, shows the last (lowest) salary via LAST_VALUE on every row. Without this explicit frame, the default frame stops at the current row and returns the wrong value.',
    },
    example:
      'SELECT first_name, dept_id, salary,\n       LAST_VALUE(salary) OVER\n         (PARTITION BY dept_id\n          ORDER BY salary DESC\n          ROWS BETWEEN UNBOUNDED PRECEDING\n                   AND UNBOUNDED FOLLOWING) AS bottom_salary,\n       SUM(salary) OVER\n         (PARTITION BY dept_id\n          ROWS BETWEEN UNBOUNDED PRECEDING\n                   AND UNBOUNDED FOLLOWING) AS dept_total\nFROM   employees\nORDER BY dept_id, salary DESC',
    resultHeaders: [
      'first_name',
      'dept_id',
      'salary',
      'top_salary',
      'bottom_salary',
    ],
    resultRows: firstLastValueRows(),
    note: {
      ko: 'ORDER BY 없이 PARTITION BY만 사용하면 기본 frame이 RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING이므로 자동으로 파티션 전체를 집계합니다. ORDER BY를 추가하는 순간 기본 frame이 바뀌므로, LAST_VALUE 등 파티션 전체가 필요한 경우엔 명시적으로 지정하세요.',
      en: 'With only PARTITION BY (no ORDER BY), the default frame is already RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING. The moment you add ORDER BY, the default changes — so always specify this frame explicitly when you need the full partition.',
    },
  },
  {
    name: 'ROWS vs RANGE',
    signature: 'ROWS BETWEEN … | RANGE BETWEEN …',
    desc: {
      ko: 'ROWS는 물리적 행 번호(위치)를 기준으로 범위를 결정합니다. RANGE는 ORDER BY 컬럼의 값 차이로 범위를 결정하며, 동일한 값(피어, peer)을 가진 행을 모두 같은 경계로 묶습니다.\n\n동순위 데이터가 없으면 두 모드의 결과가 동일합니다. 급여처럼 중복 값이 생길 수 있는 컬럼으로 ORDER BY할 때는 ROWS와 RANGE의 결과가 달라질 수 있습니다.',
      en: 'ROWS uses physical row positions to define the boundary. RANGE uses the value difference of the ORDER BY column, grouping all peer rows (same value) within the same boundary.\n\nWhen there are no ties, both modes produce identical results. When ORDER BY is on a column that can have duplicates (like salary), ROWS and RANGE can differ.',
    },
    queryDesc: {
      ko: '같은 SUM이지만 ROWS는 "물리적으로 2행 앞", RANGE는 "salary 값이 현재 -1000 이상인 행"을 범위로 삼아 집계합니다. 두 결과를 비교해 어떻게 달라지는지 확인해 보세요.',
      en: 'Both queries compute SUM, but ROWS uses "2 physical rows back" while RANGE uses "rows where salary ≥ current − 1000". Compare the two result columns to see where they diverge.',
    },
    example:
      '-- ROWS: 물리적 행 2개 앞부터 현재까지\nSELECT first_name, salary,\n       SUM(salary) OVER (\n         ORDER BY salary\n         ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\n       ) AS rows_sum,\n-- RANGE: salary가 현재값 -1000 이상인 행부터 현재까지\n       SUM(salary) OVER (\n         ORDER BY salary\n         RANGE BETWEEN 1000 PRECEDING AND CURRENT ROW\n       ) AS range_sum\nFROM   employees\nWHERE  emp_id <= 106\nORDER BY salary',
    resultHeaders: ['first_name', 'salary', 'rows_sum', 'range_sum'],
    resultRows: rowsVsRangeRows(),
    note: {
      ko: '【언제 ROWS를 쓸까】 행의 개수(위치)로 범위를 정하고 싶을 때. 직전 3건, 이동 3행 평균 등.\n【언제 RANGE를 쓸까】 날짜나 금액처럼 값의 범위로 경계를 정하고 싶을 때. 오늘 기준 최근 7일, 현재 급여 ±500 범위 등.',
      en: '[When to use ROWS] When the boundary should be based on a fixed number of rows: "the previous 3 rows", "a 3-row moving average".\n[When to use RANGE] When the boundary should be based on value distance: "the last 7 days", "salaries within ±500 of the current row".',
    },
  },
  {
    name: 'Frame 적용 함수 정리',
    signature: '— frame 적용 여부 요약 —',
    desc: {
      ko: 'Frame 절(ROWS/RANGE BETWEEN …)은 모든 윈도우 함수에 적용되는 것이 아닙니다. 함수의 종류에 따라 frame 절을 인식하는 함수와 무시하는 함수로 나뉩니다.\n\n【Frame 적용】 SUM, AVG, COUNT, MAX, MIN (집계 함수) / FIRST_VALUE, LAST_VALUE, NTH_VALUE\n\n【Frame 무시】 ROW_NUMBER, RANK, DENSE_RANK, PERCENT_RANK, CUME_DIST (순위 함수) / LAG, LEAD, NTILE (탐색/분배 함수)\n\n순위·탐색 함수는 파티션 전체를 항상 대상으로 하므로 frame 절을 지정해도 효과가 없습니다.',
      en: 'The frame clause (ROWS/RANGE BETWEEN …) does not apply to all window functions. Functions fall into two groups: those that respect the frame and those that ignore it.\n\n[Frame respected] SUM, AVG, COUNT, MAX, MIN (aggregate functions) / FIRST_VALUE, LAST_VALUE, NTH_VALUE\n\n[Frame ignored] ROW_NUMBER, RANK, DENSE_RANK, PERCENT_RANK, CUME_DIST (ranking functions) / LAG, LEAD, NTILE (navigation/distribution functions)\n\nRanking and navigation functions always operate over the full partition, so specifying a frame clause has no effect.',
    },
    queryDesc: {
      ko: 'ROW_NUMBER에는 frame 절을 써도 무시되고, SUM에는 그대로 적용됩니다. 같은 쿼리 안에서 두 함수를 나란히 실행해 차이를 확인합니다.',
      en: 'ROW_NUMBER ignores the frame clause while SUM respects it. Running both side-by-side in the same query lets you directly observe the difference.',
    },
    example:
      'SELECT first_name, salary,\n       -- frame 절 무시: ROW_NUMBER는 항상 파티션 전체 기준\n       ROW_NUMBER() OVER (\n         ORDER BY salary DESC\n         ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING  -- 무시됨\n       ) AS rn,\n       -- frame 절 적용: SUM은 frame 범위만 집계\n       SUM(salary) OVER (\n         ORDER BY emp_id\n         ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING\n       ) AS windowed_sum\nFROM   employees\nWHERE  emp_id <= 106',
    resultHeaders: ['first_name', 'salary', 'rolling_avg_3'],
    resultRows: rollingAvgRows(),
    note: {
      ko: '실무에서는 LAST_VALUE를 쓸 때 frame 절을 빠뜨려 의도치 않은 결과가 나오는 실수가 흔합니다. frame이 적용되는 함수를 쓸 때는 항상 명시적으로 frame 절을 작성하는 습관을 들이세요.',
      en: 'A common pitfall is omitting the frame clause with LAST_VALUE, leading to unexpected results. For any function that respects the frame, always write the frame clause explicitly to make your intent clear.',
    },
  },
]

// ── Color maps ─────────────────────────────────────────────────────────────

const C = {
  bg: 'bg-rail',
  border: 'border-line',
  text: 'text-ink/80',
  active: 'bg-blue/10 text-blue',
}

// ── ResultTable ──────────────────────────────────────────────────────────────

function ResultTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: (string | null)[][]
}) {
  return (
    <div className="rounded-card overflow-x-auto border text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-rail border-b">
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  'px-2.5 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap',
                  i === headers.length - 1 ? 'text-green' : 'text-ink-2'
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
                const isNull = cell === null
                const isLast = ci === row.length - 1
                return (
                  <td
                    key={ci}
                    className={cn(
                      'px-2.5 py-1 font-mono text-[11px] whitespace-nowrap',
                      isNull
                        ? 'text-ink-2/40 italic'
                        : isLast
                          ? 'text-green font-bold'
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

// ── FrameSummaryDesc ─────────────────────────────────────────────────────────

const FRAME_SUMMARY = {
  ko: {
    applied: 'Frame 절 적용',
    ignored: 'Frame 절 무시',
    appliedRows: [
      { name: 'SUM / AVG / COUNT / MAX / MIN', type: '집계 함수' },
      { name: 'FIRST_VALUE / LAST_VALUE / NTH_VALUE', type: '값 탐색 함수' },
    ],
    ignoredRows: [
      {
        name: 'ROW_NUMBER / RANK / DENSE_RANK / PERCENT_RANK / CUME_DIST',
        type: '순위 함수',
      },
      { name: 'LAG / LEAD / NTILE', type: '탐색·분배 함수' },
    ],
    note: '순위·탐색 함수는 파티션 전체를 항상 대상으로 하므로 frame 절을 지정해도 효과가 없습니다.',
  },
  en: {
    applied: 'Frame clause respected',
    ignored: 'Frame clause ignored',
    appliedRows: [
      { name: 'SUM / AVG / COUNT / MAX / MIN', type: 'Aggregate functions' },
      {
        name: 'FIRST_VALUE / LAST_VALUE / NTH_VALUE',
        type: 'Value navigation functions',
      },
    ],
    ignoredRows: [
      {
        name: 'ROW_NUMBER / RANK / DENSE_RANK / PERCENT_RANK / CUME_DIST',
        type: 'Ranking functions',
      },
      {
        name: 'LAG / LEAD / NTILE',
        type: 'Navigation / distribution functions',
      },
    ],
    note: 'Ranking and navigation functions always operate over the full partition — specifying a frame clause has no effect on them.',
  },
}

function FrameSummaryDesc({ lang }: { lang: 'ko' | 'en' }) {
  const d = FRAME_SUMMARY[lang]
  return (
    <div className="flex flex-col gap-3">
      {/* Frame 적용 */}
      <div className="rounded-panel border-green/30 overflow-hidden border">
        <div className="bg-green/5 px-4 py-2">
          <span className="text-green font-mono text-[11px] font-bold">
            ✓ {d.applied}
          </span>
        </div>
        <table className="w-full">
          <tbody>
            {d.appliedRows.map((r) => (
              <tr
                key={r.name}
                className="border-green/30 border-t last:border-0"
              >
                <td className="text-green px-4 py-2 font-mono text-[12px] font-bold">
                  {r.name}
                </td>
                <td className="text-green px-4 py-2 text-right text-[11px]">
                  {r.type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Frame 무시 */}
      <div className="rounded-panel border-red/30 overflow-hidden border">
        <div className="bg-red/5 px-4 py-2">
          <span className="text-red font-mono text-[11px] font-bold">
            ✗ {d.ignored}
          </span>
        </div>
        <table className="w-full">
          <tbody>
            {d.ignoredRows.map((r) => (
              <tr key={r.name} className="border-red/30 border-t last:border-0">
                <td className="text-red px-4 py-2 font-mono text-[12px] font-bold">
                  {r.name}
                </td>
                <td className="text-red px-4 py-2 text-right text-[11px]">
                  {r.type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-ink-2 text-xs leading-relaxed">{d.note}</p>
    </div>
  )
}

// ── DetailPanel (shared between Part 1 and Part 2) ──────────────────────────

function DetailPanel({
  item,
  lang,
  labels,
}: {
  item: FuncItem | FrameFuncItem
  lang: 'ko' | 'en'
  labels: { categoryLabel: string; exampleQuery: string; result: string }
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.name}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="flex flex-col gap-4"
      >
        <div
          className={cn(
            'rounded-panel border px-4 py-3',
            C.bg,
            C.border,
            C.text
          )}
        >
          <div className="mb-1 font-mono text-[10px] font-bold tracking-wider uppercase opacity-60">
            {labels.categoryLabel}
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

        <div className="rounded-panel bg-paper border px-4 py-3">
          {item.name === 'Frame 적용 함수 정리' ? (
            <FrameSummaryDesc lang={lang} />
          ) : (
            <Prose>{item.desc[lang]}</Prose>
          )}
        </div>

        <div>
          <p className="text-ink-2 mb-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
            {labels.exampleQuery}
          </p>
          <p className="text-ink/70 mb-2 text-xs leading-relaxed">
            {item.queryDesc[lang]}
          </p>
          <SqlHighlight sql={item.example} />
        </div>

        <div>
          <p className="text-ink-2 mb-2 font-mono text-[11px] font-bold tracking-wider uppercase">
            {labels.result}
          </p>
          <ResultTable headers={item.resultHeaders} rows={item.resultRows} />
        </div>

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
  )
}

// ── Translations ───────────────────────────────────────────────────────────

const T = {
  ko: {
    chapterTitle: '윈도우 함수',
    chapterSubtitle:
      '행을 그룹화하지 않고도 집계·순위·이동 참조가 가능한 윈도우 함수(OVER 절)를 알아봅니다.',
    part1Title: 'Part 1 — 윈도우 함수 소개',
    part1Desc:
      '윈도우 함수는 OVER 절을 사용합니다. PARTITION BY로 파티션(그룹)을 나누고, ORDER BY로 파티션 내 정렬 기준을 정합니다. GROUP BY와 달리 원본 행이 그대로 유지됩니다.',
    part2Title: 'Part 2 — Frame 절 심화',
    part2Desc:
      'Frame 절은 현재 행을 기준으로 집계에 포함할 행의 범위를 지정합니다. ROWS는 물리적 행 번호 기준, RANGE는 ORDER BY 컬럼의 값 범위 기준으로 경계를 결정합니다.',
    syntaxBoxLabel: '윈도우 함수 구문',
    frameBoxLabel: 'Frame 절 키워드',
    wordSectionTitle: '키워드 단어 뜻',
    categoryLabel: '윈도우 함수',
    frameCategoryLabel: 'Frame 절',
    exampleQuery: '예시 쿼리',
    result: '실행 결과',
    words: [
      {
        word: 'PRECEDING',
        literal: '앞에 오는, 이전의',
        meaning:
          '현재 행보다 앞에 위치한 행들을 가리킵니다. ORDER BY 기준으로 정렬했을 때 현재 행보다 먼저 나오는 행입니다.',
        example: '3 PRECEDING → 현재 행 기준 3행 앞까지',
      },
      {
        word: 'FOLLOWING',
        literal: '뒤따르는, 다음의',
        meaning:
          '현재 행보다 뒤에 위치한 행들을 가리킵니다. ORDER BY 기준으로 정렬했을 때 현재 행보다 나중에 나오는 행입니다.',
        example: '2 FOLLOWING → 현재 행 기준 2행 뒤까지',
      },
      {
        word: 'UNBOUNDED',
        literal: '경계가 없는, 무한한',
        meaning:
          '범위에 제한을 두지 않는다는 뜻입니다. UNBOUNDED PRECEDING은 파티션의 맨 첫 행, UNBOUNDED FOLLOWING은 파티션의 맨 마지막 행을 경계로 삼습니다.',
        example:
          'UNBOUNDED PRECEDING → 파티션 첫 행부터 / UNBOUNDED FOLLOWING → 파티션 마지막 행까지',
      },
      {
        word: 'CURRENT ROW',
        literal: '현재 행',
        meaning:
          '집계를 계산하는 기준이 되는 바로 그 행을 가리킵니다. ROWS 모드에서는 정확히 그 한 행, RANGE 모드에서는 ORDER BY 값이 동일한 모든 피어(peer) 행을 포함합니다.',
        example:
          'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW → 첫 행부터 현재 행까지 누적',
      },
    ],
  },
  en: {
    chapterTitle: 'Window Functions',
    chapterSubtitle:
      'Learn window functions (the OVER clause) — they enable aggregation, ranking, and row-offset lookups without collapsing rows.',
    part1Title: 'Part 1 — Window Functions Overview',
    part1Desc:
      'Window functions use the OVER clause. PARTITION BY divides rows into partitions (groups); ORDER BY defines the sort order within each partition. Unlike GROUP BY, the original rows are preserved.',
    part2Title: 'Part 2 — The Frame Clause',
    part2Desc:
      'The frame clause defines which rows are included in the aggregate relative to the current row. ROWS uses physical row positions; RANGE uses value-based boundaries of the ORDER BY column.',
    syntaxBoxLabel: 'Window Function Syntax',
    frameBoxLabel: 'Frame Clause Keywords',
    wordSectionTitle: 'What the keywords mean',
    categoryLabel: 'Window Function',
    frameCategoryLabel: 'Frame Clause',
    exampleQuery: 'Example Query',
    result: 'Result',
    words: [
      {
        word: 'PRECEDING',
        literal: '"coming before"',
        meaning:
          'Refers to rows that come before the current row in the ORDER BY sort order — rows that have already been "passed."',
        example: '3 PRECEDING → up to 3 rows before the current row',
      },
      {
        word: 'FOLLOWING',
        literal: '"coming after"',
        meaning:
          'Refers to rows that come after the current row in the ORDER BY sort order — rows that have not yet been reached.',
        example: '2 FOLLOWING → up to 2 rows after the current row',
      },
      {
        word: 'UNBOUNDED',
        literal: '"without a boundary"',
        meaning:
          'Means there is no limit on how far the frame extends. UNBOUNDED PRECEDING reaches all the way to the first row of the partition; UNBOUNDED FOLLOWING reaches the last.',
        example:
          'UNBOUNDED PRECEDING → from the first row of the partition / UNBOUNDED FOLLOWING → to the last row',
      },
      {
        word: 'CURRENT ROW',
        literal: '"the row being processed right now"',
        meaning:
          'The anchor row for which the aggregate is being calculated. In ROWS mode it means exactly that one row; in RANGE mode it includes all peer rows that share the same ORDER BY value.',
        example:
          'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW → cumulative sum from the first row to the current row',
      },
    ],
  },
}

const SYNTAX_SQL =
  'func() OVER (\n  [PARTITION BY col]\n  [ORDER BY col [ASC|DESC]]\n)'

const FRAME_KEYWORDS_SQL =
  '-- <start> / <end> 경계 키워드\n--   UNBOUNDED PRECEDING   파티션의 첫 번째 행\n--   CURRENT ROW           현재 행 (RANGE: 같은 값의 모든 피어 포함)\n--   UNBOUNDED FOLLOWING   파티션의 마지막 행\n--   n PRECEDING           현재 행에서 n행(ROWS) 또는 값 -n(RANGE) 앞\n--   n FOLLOWING           현재 행에서 n행(ROWS) 또는 값 +n(RANGE) 뒤\n\n-- frame 절이 무시되는 함수\n--   ROW_NUMBER, RANK, DENSE_RANK, PERCENT_RANK, CUME_DIST\n--   LAG, LEAD, NTILE'

// ── WindowFuncSection ────────────────────────────────────────────────────────

export function WindowFuncSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const [openFunc, setOpenFunc] = useState<string>(FUNC_ITEMS[0].name)
  const [openFrame, setOpenFrame] = useState<string>(FRAME_ITEMS[0].name)

  const activeFunc = FUNC_ITEMS.find((f) => f.name === openFunc)!
  const activeFrame = FRAME_ITEMS.find((f) => f.name === openFrame)!

  return (
    <PageContainer className="max-w-5xl">
      <ChapterTitle
        icon={
          <IconChartBar size={36} color="var(--color-purple)" stroke={1.5} />
        }
        title={t.chapterTitle}
        subtitle={t.chapterSubtitle}
      />

      {/* ── Part 1 ─────────────────────────────────────────────────────── */}
      <SectionTitle>{t.part1Title}</SectionTitle>

      <div className="rounded-panel bg-rail mb-4 flex flex-col gap-3 border px-5 py-4">
        <Prose>{t.part1Desc}</Prose>
        <div>
          <p className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-wider uppercase">
            {t.syntaxBoxLabel}
          </p>
          <SqlHighlight sql={SYNTAX_SQL} />
        </div>
      </div>

      <div className="grid grid-cols-[160px_1fr] items-start gap-4">
        <div className="rounded-panel bg-rail flex flex-col gap-1 border p-2">
          {FUNC_ITEMS.map((f) => {
            const isActive = f.name === openFunc
            return (
              <button
                key={f.name}
                onClick={() => setOpenFunc(f.name)}
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

        <DetailPanel
          item={activeFunc}
          lang={lang}
          labels={{
            categoryLabel: t.categoryLabel,
            exampleQuery: t.exampleQuery,
            result: t.result,
          }}
        />
      </div>

      <Divider />

      {/* ── Part 2 ─────────────────────────────────────────────────────── */}
      <SectionTitle>{t.part2Title}</SectionTitle>

      <div className="rounded-panel bg-rail mb-4 flex flex-col gap-3 border px-5 py-4">
        <Prose>{t.part2Desc}</Prose>
        <div>
          <p className="text-ink-2 mb-1.5 font-mono text-[10px] font-bold tracking-wider uppercase">
            {t.frameBoxLabel}
          </p>
          <SqlHighlight sql={FRAME_KEYWORDS_SQL} />
        </div>
      </div>

      {/* 키워드 어원 카드 */}
      <p className="text-ink-2 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
        {t.wordSectionTitle}
      </p>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {(t.words as WordEntry[]).map((w) => (
          <div
            key={w.word}
            className="rounded-panel bg-paper flex flex-col gap-1.5 border px-4 py-3"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-ink font-mono text-sm font-black">
                {w.word}
              </span>
              <span className="text-ink-2 text-xs italic">{w.literal}</span>
            </div>
            <p className="text-ink/80 text-xs leading-relaxed">{w.meaning}</p>
            <div className="rounded-card bg-rail text-ink-2 mt-0.5 border px-2.5 py-1.5 font-mono text-[11px]">
              {w.example}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[220px_1fr] items-start gap-4">
        <div className="rounded-panel bg-rail flex flex-col gap-1 border p-2">
          {FRAME_ITEMS.map((f) => {
            const isActive = f.name === openFrame
            return (
              <button
                key={f.name}
                onClick={() => setOpenFrame(f.name)}
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

        <DetailPanel
          item={activeFrame}
          lang={lang}
          labels={{
            categoryLabel: t.frameCategoryLabel,
            exampleQuery: t.exampleQuery,
            result: t.result,
          }}
        />
      </div>
    </PageContainer>
  )
}
