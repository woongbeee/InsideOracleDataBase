import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  PageContainer,
  ChapterTitle,
  SectionTitle,
  SubTitle,
  Prose,
  InfoBox,
  Divider,
  SqlBlock,
} from '../../shared'
import { IconChartTreemap } from '@tabler/icons-react'
import { useSimulationStore } from '@/store/simulationStore'
import { EMPLOYEES, type Employee } from '@/data'

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'rollup' | 'cube' | 'groupingsets' | 'grouping'

// ── Data ───────────────────────────────────────────────────────────────────

type EmpRow = Pick<Employee, 'first_name' | 'dept_id' | 'job_title' | 'salary'>

// Use employees from 3 representative departments (IT=60, Sales=80, Finance=100)
const EMPS: EmpRow[] = EMPLOYEES.filter((e) =>
  [60, 80, 100].includes(e.dept_id)
)
  .slice(0, 12)
  .map((e) => ({
    first_name: e.first_name,
    dept_id: e.dept_id,
    job_title: e.job_title,
    salary: e.salary,
  }))

// ── ROLLUP computation ─────────────────────────────────────────────────────

interface RollupRow {
  dept_id: number | null
  job_title: string | null
  total_sal: number
  cnt: number
  _level: 'detail' | 'subtotal' | 'grand'
}

function computeRollup(): RollupRow[] {
  const result: RollupRow[] = []
  const depts = [...new Set(EMPS.map((e) => e.dept_id))].sort((a, b) => a - b)
  for (const dept of depts) {
    const deptRows = EMPS.filter((e) => e.dept_id === dept)
    const jobs = [...new Set(deptRows.map((e) => e.job_title))].sort()
    for (const job of jobs) {
      const rows = deptRows.filter((e) => e.job_title === job)
      result.push({
        dept_id: dept,
        job_title: job,
        total_sal: rows.reduce((s, r) => s + r.salary, 0),
        cnt: rows.length,
        _level: 'detail',
      })
    }
    result.push({
      dept_id: dept,
      job_title: null,
      total_sal: deptRows.reduce((s, r) => s + r.salary, 0),
      cnt: deptRows.length,
      _level: 'subtotal',
    })
  }
  result.push({
    dept_id: null,
    job_title: null,
    total_sal: EMPS.reduce((s, r) => s + r.salary, 0),
    cnt: EMPS.length,
    _level: 'grand',
  })
  return result
}

// ── CUBE computation ───────────────────────────────────────────────────────

interface CubeRow {
  dept_id: number | null
  job_title: string | null
  total_sal: number
  cnt: number
  _grouping: string
}

function computeCube(): CubeRow[] {
  const result: CubeRow[] = []
  const depts = [...new Set(EMPS.map((e) => e.dept_id))].sort((a, b) => a - b)
  const jobs = [...new Set(EMPS.map((e) => e.job_title))].sort()
  for (const dept of depts) {
    for (const job of jobs) {
      const rows = EMPS.filter((e) => e.dept_id === dept && e.job_title === job)
      if (rows.length === 0) continue
      result.push({
        dept_id: dept,
        job_title: job,
        total_sal: rows.reduce((s, r) => s + r.salary, 0),
        cnt: rows.length,
        _grouping: 'dept+job',
      })
    }
  }
  for (const dept of depts) {
    const rows = EMPS.filter((e) => e.dept_id === dept)
    result.push({
      dept_id: dept,
      job_title: null,
      total_sal: rows.reduce((s, r) => s + r.salary, 0),
      cnt: rows.length,
      _grouping: 'dept',
    })
  }
  for (const job of jobs) {
    const rows = EMPS.filter((e) => e.job_title === job)
    result.push({
      dept_id: null,
      job_title: job,
      total_sal: rows.reduce((s, r) => s + r.salary, 0),
      cnt: rows.length,
      _grouping: 'job',
    })
  }
  result.push({
    dept_id: null,
    job_title: null,
    total_sal: EMPS.reduce((s, r) => s + r.salary, 0),
    cnt: EMPS.length,
    _grouping: 'grand',
  })
  return result
}

// ── GROUPING SETS computation ──────────────────────────────────────────────

// ── SQL strings ────────────────────────────────────────────────────────────

const ROLLUP_SQL = `SELECT dept_id, job_title,
       SUM(salary) AS total_sal,
       COUNT(*)    AS cnt
FROM   employees
GROUP BY ROLLUP(dept_id, job_title)
ORDER BY dept_id NULLS LAST, job_title NULLS LAST`

const CUBE_SQL = `SELECT dept_id, job_title,
       SUM(salary) AS total_sal,
       COUNT(*)    AS cnt
FROM   employees
GROUP BY CUBE(dept_id, job_title)
ORDER BY dept_id NULLS LAST, job_title NULLS LAST`

const GROUPING_SETS_SQL = `SELECT dept_id, job_title,
       SUM(salary) AS total_sal,
       COUNT(*)    AS cnt
FROM   employees
GROUP BY GROUPING SETS (
  (dept_id),
  (job_title)
)
ORDER BY dept_id NULLS LAST, job_title NULLS LAST`

const GROUPING_SETS_EQ_SQL = `-- GROUPING SETS는 여러 GROUP BY를 UNION ALL한 것과 같습니다
SELECT dept_id, NULL AS job_title, SUM(salary), COUNT(*) FROM employees GROUP BY dept_id
UNION ALL
SELECT NULL, job_title, SUM(salary), COUNT(*) FROM employees GROUP BY job_title`

const GROUPING_FN_SQL = `SELECT dept_id, job_title,
       SUM(salary)        AS total_sal,
       COUNT(*)           AS cnt,
       GROUPING(dept_id)  AS grp_dept,
       GROUPING(job_title) AS grp_job
FROM   employees
GROUP BY ROLLUP(dept_id, job_title)
ORDER BY dept_id NULLS LAST, job_title NULLS LAST`

const GROUPING_CASE_SQL = `SELECT
  CASE GROUPING(dept_id)
    WHEN 1 THEN '전체'
    ELSE TO_CHAR(dept_id)
  END AS dept_label,
  CASE GROUPING(job_title)
    WHEN 1 THEN '소계'
    ELSE job_title
  END AS job_label,
  SUM(salary) AS total_sal
FROM   employees
GROUP BY ROLLUP(dept_id, job_title)
ORDER BY dept_id NULLS LAST, job_title NULLS LAST`

// ── T strings ─────────────────────────────────────────────────────────────

const T = {
  ko: {
    chapterTitle: 'ROLLUP / CUBE / GROUPING SETS / GROUPING',
    chapterSubtitle:
      'GROUP BY를 확장해서 소계·총계·교차 집계를 한 번에 구하는 Oracle 집계 구문이에요.',
    tabRollup: 'ROLLUP',
    tabCube: 'CUBE',
    tabGroupingSets: 'GROUPING SETS',
    tabGrouping: 'GROUPING()',

    rollupTitle: 'ROLLUP — 계층적 소계',
    rollupDesc:
      'ROLLUP(A, B)는 (A, B) 상세 집계 → (A) 부서 소계 → () 전체 총계 순서로 행을 자동으로 추가해요. 계층이 왼쪽에서 오른쪽으로 하나씩 제거되는 방식이에요.',
    rollupInfo:
      'ROLLUP(dept_id, job_title)이 만드는 3가지 집계 수준: ① dept_id + job_title (상세) ② dept_id만 (부서 소계) ③ 전체 (총계)',
    rollupEtymTitle: 'ROLLUP이란 단어는 어디서 왔을까?',
    rollupEtym:
      '"Roll up"은 영어로 "말아 올리다", "굴려 위로 합치다"는 뜻이에요. 스프레드시트에서 하위 항목들을 접어(roll up) 상위 합계를 보여주는 동작에서 유래했어요. 세부 행들을 위로 말아 올려 소계·총계로 압축한다는 이미지예요.',
    rollupUsageTitle: '실무에서 언제 쓸까?',
    rollupUsages: [
      {
        icon: '📊',
        title: '월별 매출 보고서',
        desc: '지역 → 팀 → 담당자 순으로 드릴다운 가능한 매출 집계표를 단 하나의 쿼리로 만들 때. GROUP BY ROLLUP(region, team, emp_id)',
      },
      {
        icon: '🧾',
        title: '회계 결산',
        desc: '계정과목 → 부서 → 전체 합계를 한 번에 뽑는 결산 쿼리. UNION ALL을 여러 개 작성하는 대신 ROLLUP 하나로 대체.',
      },
      {
        icon: '📦',
        title: '재고 현황',
        desc: '창고 → 카테고리 → 품목 단위의 재고 수량·금액 소계가 필요한 재고 현황 리포트.',
      },
      {
        icon: '⚡',
        title: '성능',
        desc: '테이블을 한 번만 스캔하고 집계 수준별 행을 동시에 만들어냅니다. 같은 결과를 UNION ALL로 작성하면 테이블을 여러 번 읽어야 해서 훨씬 느립니다.',
      },
    ],

    cubeTitle: 'CUBE — 모든 조합의 소계',
    cubeDesc:
      'CUBE(A, B)는 가능한 모든 컬럼 조합의 집계를 한꺼번에 만듭니다. (A, B) · (A) · (B) · () 네 가지 집계가 생깁니다. ROLLUP보다 더 많은 행이 생기고, BI 리포트처럼 행·열 모두 소계가 필요할 때 씁니다.',
    cubeInfo:
      'CUBE(dept_id, job_title)이 만드는 4가지 집계: ① dept+job (상세) ② dept만 (부서별 합계) ③ job만 (직무별 합계) ④ 전체 총계',
    cubeEtymTitle: 'CUBE란 단어는 어디서 왔을까?',
    cubeEtym:
      '"Cube"는 정육면체예요. 2개 컬럼이면 사각형, 3개 컬럼이면 정육면체처럼 모든 면(조합)을 빠짐없이 집계한다는 뜻에서 유래했어요. 데이터 분석에서 "OLAP 큐브"라는 개념이 여기서 나왔으며, 다차원 집계를 한 번에 계산한다는 이미지예요.',
    cubeUsageTitle: '실무에서 언제 쓸까?',
    cubeUsages: [
      {
        icon: '📊',
        title: 'BI 크로스탭 리포트',
        desc: '행은 부서별, 열은 직무별 합계가 동시에 필요한 피벗형 보고서. CUBE 하나로 행 방향·열 방향 소계를 모두 산출.',
      },
      {
        icon: '🗂️',
        title: '다차원 분석',
        desc: '연도·분기·월처럼 계층 없이 모든 조합의 소계가 필요할 때. ROLLUP은 한 방향 계층만 지원하지만 CUBE는 모든 축 조합 지원.',
      },
      {
        icon: '⚖️',
        title: 'ROLLUP과의 선택 기준',
        desc: '계층 방향이 한 방향이면 ROLLUP, 행·열 모두 소계가 필요하면 CUBE. CUBE는 행이 많이 생기므로 컬럼이 3개 이상이면 신중하게 사용.',
      },
      {
        icon: '⚡',
        title: '성능 주의',
        desc: 'N개 컬럼이면 2ᴺ가지 조합을 만들어냅니다. 컬럼이 4개면 16가지 집계가 발생해 결과 행이 급격히 늘어납니다.',
      },
    ],

    groupingSetsTitle: 'GROUPING SETS — 원하는 집계 조합만 선택',
    groupingSetsDesc:
      'GROUPING SETS는 ROLLUP·CUBE처럼 자동으로 생성하는 대신, 원하는 집계 조합을 직접 나열해요. 필요한 집계 수준만 골라 쓸 수 있어서 불필요한 소계 행을 제거할 수 있어요.',
    groupingSetsInfo:
      'GROUPING SETS ((dept_id), (job_title))은 부서별 합계와 직무별 합계만 만들어요. CUBE처럼 상세(dept+job)나 전체 총계는 생성하지 않아요.',
    groupingSetsEqTitle: 'GROUPING SETS = 여러 GROUP BY의 UNION ALL',
    groupingSetsEqDesc:
      'GROUPING SETS는 내부적으로 각 집합을 개별 GROUP BY로 실행한 뒤 결과를 UNION ALL로 합친 것과 동일해요. 단, GROUPING SETS는 테이블을 한 번만 스캔하기 때문에 성능이 더 좋아요.',
    groupingSetsEtymTitle: 'GROUPING SETS란 단어는 어디서 왔을까?',
    groupingSetsEtym:
      '"Grouping Sets"는 말 그대로 "집계할 집합들의 묶음"이에요. ROLLUP·CUBE가 규칙에 따라 자동으로 집합을 생성하는 것과 달리, GROUPING SETS는 집계할 집합 목록을 개발자가 직접 지정해요. 원하는 집합만 정확히 골라 실행하는 수동 방식이에요.',
    groupingSetsUsageTitle: '실무에서 언제 쓸까?',
    groupingSetsUsages: [
      {
        icon: '🎯',
        title: '필요한 집계만 정확히',
        desc: '부서별 합계와 직무별 합계는 필요하지만, 부서+직무 상세나 전체 총계는 불필요할 때. ROLLUP·CUBE 대신 GROUPING SETS로 딱 필요한 것만 뽑음.',
      },
      {
        icon: '🔧',
        title: 'ROLLUP/CUBE 대체',
        desc: 'ROLLUP(A,B)는 GROUPING SETS((A,B),(A),())로, CUBE(A,B)는 GROUPING SETS((A,B),(A),(B),())로 완전히 표현 가능합니다. 더 명시적인 쿼리가 필요할 때 사용.',
      },
      {
        icon: '📋',
        title: '복합 리포트',
        desc: '한 쿼리에서 "지역별 합계"와 "담당자별 합계"를 동시에 뽑아야 하는 복합 보고서. UNION ALL보다 간결하고 테이블 스캔도 1회.',
      },
      {
        icon: '⚡',
        title: '성능',
        desc: '테이블을 한 번만 스캔합니다. UNION ALL로 각 집계를 따로 쓰면 테이블을 N번 읽어야 하지만 GROUPING SETS는 한 번에 처리합니다.',
      },
    ],

    groupingTitle: 'GROUPING() — 소계 행 식별 함수',
    groupingDesc:
      'ROLLUP·CUBE·GROUPING SETS로 생성된 소계/총계 행에서 NULL은 "집계 기준에서 제외된 컬럼"을 나타내요. 하지만 원본 데이터에도 NULL이 있을 수 있어서, NULL만 보고는 소계 행인지 실제 NULL인지 구분할 수 없어요. GROUPING() 함수가 이 문제를 해결해줘요.',
    groupingInfo:
      'GROUPING(col)은 해당 컬럼이 집계에서 제외된(소계/총계) 경우 1, 실제 그룹 기준으로 사용된 경우 0을 반환합니다.',
    groupingCaseTitle: 'CASE와 결합해 레이블 표시',
    groupingCaseDesc:
      'GROUPING()을 CASE 식과 함께 쓰면 NULL 대신 "전체"·"소계" 같은 의미 있는 레이블로 바꿀 수 있어요.',
    groupingEtymTitle: 'GROUPING()이란 함수는 왜 필요할까요?',
    groupingEtym:
      'ROLLUP/CUBE가 만드는 소계 행에서 집계 제외된 컬럼은 NULL로 표시돼요. 그런데 원본 데이터에도 실제 NULL 값이 있을 수 있어서 "이 NULL이 소계를 뜻하는지, 데이터가 원래 NULL인지" 구분이 불가능해요. GROUPING()은 이 모호함을 숫자(0/1)로 명확히 해결해주는 함수예요.',
    groupingUsageTitle: '실무에서 언제 쓸까?',
    groupingUsages: [
      {
        icon: '🏷️',
        title: '레이블 치환',
        desc: 'NULL 대신 "전체", "소계", "합계" 같은 의미 있는 텍스트로 표시. CASE GROUPING(col) WHEN 1 THEN \'합계\' ELSE col END',
      },
      {
        icon: '🔍',
        title: '소계 행 필터링',
        desc: 'WHERE GROUPING(dept_id) = 1로 소계 행만 골라내거나, = 0으로 상세 행만 가져오는 필터링. NULL 비교로는 안 되는 작업을 정확하게 처리.',
      },
      {
        icon: '📊',
        title: '리포트 서식',
        desc: '소계/총계 행에 굵은 글씨·배경색을 적용하는 프론트엔드 처리. GROUPING() 값을 컬럼으로 함께 SELECT해 UI에서 활용.',
      },
      {
        icon: '🛡️',
        title: 'NULL 데이터 보호',
        desc: '원본 데이터에 NULL이 있는 컬럼을 ROLLUP 키로 쓸 때 필수. GROUPING() 없이는 실제 NULL과 소계 NULL을 구분할 방법이 없음.',
      },
    ],

    nullMeaning: 'NULL = 해당 집계 수준에서 "모든 값"을 의미합니다',
    levelDetail: '상세',
    levelSubtotal: '소계',
    levelGrand: '총계',
    setBadgeDept: '부서별',
    setBadgeJob: '직무별',
    groupingLabel: (g: string) => {
      if (g === 'dept+job') return '상세 (dept+job)'
      if (g === 'dept') return '부서 소계'
      if (g === 'job') return '직무 소계'
      return '전체 총계'
    },
    result: '결과',
    comparisonTitle: 'ROLLUP vs CUBE',
  },
  en: {
    chapterTitle: 'ROLLUP / CUBE / GROUPING SETS / GROUPING',
    chapterSubtitle:
      'Oracle aggregation extensions that compute subtotals, grand totals, and cross-tabulations in a single query.',
    tabRollup: 'ROLLUP',
    tabCube: 'CUBE',
    tabGroupingSets: 'GROUPING SETS',
    tabGrouping: 'GROUPING()',

    rollupTitle: 'ROLLUP — Hierarchical subtotals',
    rollupDesc:
      'ROLLUP(A, B) automatically adds rows for (A, B) detail → (A) subtotal → () grand total. Each level removes one column from the right.',
    rollupInfo:
      'ROLLUP(dept_id, job_title) produces 3 aggregation levels: ① dept_id + job_title (detail) ② dept_id only (dept subtotal) ③ grand total',
    rollupEtymTitle: 'Where does the word "ROLLUP" come from?',
    rollupEtym:
      '"Roll up" means to gather or compress something upward. The term comes from spreadsheets, where collapsing child rows into a parent summary is called "rolling up." In SQL, detail rows are rolled up into subtotals and a grand total.',
    rollupUsageTitle: 'When is ROLLUP used in practice?',
    rollupUsages: [
      {
        icon: '📊',
        title: 'Sales reports',
        desc: 'Generate a drill-down sales summary by region → team → employee in a single query. GROUP BY ROLLUP(region, team, emp_id)',
      },
      {
        icon: '🧾',
        title: 'Financial closing',
        desc: 'Pull account → department → company-wide totals in one pass instead of writing multiple UNION ALL blocks.',
      },
      {
        icon: '📦',
        title: 'Inventory reports',
        desc: 'Subtotal quantities and values by warehouse → category → item in a single inventory report query.',
      },
      {
        icon: '⚡',
        title: 'Performance',
        desc: 'ROLLUP scans the table once and produces all aggregation levels simultaneously. An equivalent UNION ALL approach reads the table multiple times and is significantly slower.',
      },
    ],

    cubeTitle: 'CUBE — All combinations',
    cubeDesc:
      'CUBE(A, B) generates aggregates for every possible column combination: (A, B) · (A) · (B) · (). More rows than ROLLUP, useful when you need subtotals in both row and column directions, like a BI report.',
    cubeInfo:
      'CUBE(dept_id, job_title) produces 4 aggregation levels: ① dept+job (detail) ② dept only ③ job only ④ grand total',
    cubeEtymTitle: 'Where does the word "CUBE" come from?',
    cubeEtym:
      'A cube has six faces — every combination of dimensions visible at once. With 2 columns you get a square (4 corners), with 3 columns a cube (8 corners). CUBE in SQL generates all 2ᴺ combinations of N columns, like seeing every face of a data cube simultaneously. This is the foundation of OLAP (Online Analytical Processing) cube analysis.',
    cubeUsageTitle: 'When is CUBE used in practice?',
    cubeUsages: [
      {
        icon: '📊',
        title: 'BI cross-tab reports',
        desc: 'When you need both row-direction (by dept) and column-direction (by job) subtotals simultaneously — a pivot-style report. CUBE produces both in one query.',
      },
      {
        icon: '🗂️',
        title: 'Multi-dimensional analysis',
        desc: 'When all combinations of year/quarter/month are needed without a strict hierarchy. ROLLUP only supports one-directional hierarchy; CUBE covers all axis combinations.',
      },
      {
        icon: '⚖️',
        title: 'ROLLUP vs CUBE decision',
        desc: 'Use ROLLUP when aggregation flows in one hierarchical direction. Use CUBE when subtotals are needed in all directions. CUBE generates many more rows, so use with caution beyond 3 columns.',
      },
      {
        icon: '⚡',
        title: 'Performance note',
        desc: 'N columns produce 2ᴺ grouping combinations. 4 columns = 16 aggregations. Result sets grow exponentially, so profile before using CUBE on wide column lists.',
      },
    ],

    groupingSetsTitle: 'GROUPING SETS — Pick only the groupings you need',
    groupingSetsDesc:
      'Instead of auto-generating all levels like ROLLUP or CUBE, GROUPING SETS lets you list exactly which grouping combinations you want. This eliminates unnecessary subtotal rows.',
    groupingSetsInfo:
      'GROUPING SETS ((dept_id), (job_title)) produces only dept-level and job-level totals — no detail (dept+job) rows and no grand total.',
    groupingSetsEqTitle: 'GROUPING SETS = UNION ALL of GROUP BYs',
    groupingSetsEqDesc:
      'GROUPING SETS is logically equivalent to running each grouping as a separate GROUP BY and combining with UNION ALL. However, GROUPING SETS scans the table only once, making it more efficient.',
    groupingSetsEtymTitle: 'Where does "GROUPING SETS" come from?',
    groupingSetsEtym:
      '"Grouping Sets" literally means "a collection of grouping sets." While ROLLUP and CUBE auto-generate grouping combinations by rule, GROUPING SETS lets you enumerate exactly which sets to group by. It is the manual, explicit version — you specify precisely the grouping combinations you want, and nothing more.',
    groupingSetsUsageTitle: 'When is GROUPING SETS used in practice?',
    groupingSetsUsages: [
      {
        icon: '🎯',
        title: 'Exact aggregations only',
        desc: 'When you need dept subtotals and job subtotals but not dept+job detail rows or a grand total. GROUPING SETS gives you exactly what you ask for.',
      },
      {
        icon: '🔧',
        title: 'Replacing ROLLUP / CUBE explicitly',
        desc: 'ROLLUP(A,B) = GROUPING SETS((A,B),(A),()); CUBE(A,B) = GROUPING SETS((A,B),(A),(B),()). Use GROUPING SETS when you want the query intent to be crystal clear.',
      },
      {
        icon: '📋',
        title: 'Composite reports',
        desc: 'Pull "by-region totals" and "by-rep totals" simultaneously in one query without UNION ALL — a single table scan, cleaner code.',
      },
      {
        icon: '⚡',
        title: 'Performance',
        desc: 'Scans the table once regardless of how many sets are listed. UNION ALL equivalents read the table N times — once per GROUP BY block.',
      },
    ],

    groupingTitle: 'GROUPING() — Identify subtotal rows',
    groupingDesc:
      'In ROLLUP/CUBE/GROUPING SETS results, NULL means "all values at this aggregation level." But source data can also contain real NULLs, making it impossible to tell them apart. The GROUPING() function solves this.',
    groupingInfo:
      'GROUPING(col) returns 1 when the column is excluded from the grouping (subtotal/grand total row), and 0 when it is an actual group key.',
    groupingCaseTitle: 'Combine with CASE for readable labels',
    groupingCaseDesc:
      'Use GROUPING() inside a CASE expression to replace NULL with meaningful labels like "All" or "Subtotal."',
    groupingEtymTitle: 'Why does GROUPING() need to exist?',
    groupingEtym:
      'ROLLUP/CUBE mark excluded columns with NULL in subtotal rows. But source data can also have genuine NULLs — so a NULL in the result could mean "subtotal for all values" or "this row had no value." There is no way to distinguish them without extra information. GROUPING() provides that information: it is a flag (0 or 1) that unambiguously identifies whether a NULL was injected by the aggregation engine or came from the data itself.',
    groupingUsageTitle: 'When is GROUPING() used in practice?',
    groupingUsages: [
      {
        icon: '🏷️',
        title: 'Label substitution',
        desc: "Replace NULL with readable text like 'Total', 'Subtotal', 'All'. Pattern: CASE GROUPING(col) WHEN 1 THEN 'Total' ELSE col END",
      },
      {
        icon: '🔍',
        title: 'Filtering subtotal rows',
        desc: 'Use WHERE GROUPING(dept_id) = 1 to select only subtotal rows, or = 0 for detail rows only. NULL comparison (= NULL) would never match anything.',
      },
      {
        icon: '📊',
        title: 'Report formatting',
        desc: 'SELECT the GROUPING() value as a column and use it in the frontend to apply bold text or background color to subtotal/grand-total rows.',
      },
      {
        icon: '🛡️',
        title: 'Nullable key columns',
        desc: 'Essential when a ROLLUP key column contains real NULLs in source data. Without GROUPING(), subtotal NULLs and data NULLs are indistinguishable.',
      },
    ],

    nullMeaning: 'NULL = "all values" at that aggregation level',
    levelDetail: 'Detail',
    levelSubtotal: 'Subtotal',
    levelGrand: 'Grand total',
    setBadgeDept: 'By dept',
    setBadgeJob: 'By job',
    groupingLabel: (g: string) => {
      if (g === 'dept+job') return 'Detail (dept+job)'
      if (g === 'dept') return 'Dept subtotal'
      if (g === 'job') return 'Job subtotal'
      return 'Grand total'
    },
    result: 'Result',
    comparisonTitle: 'ROLLUP vs CUBE',
  },
}

type TShape = (typeof T)['ko']

// ── ROLLUP step animator ───────────────────────────────────────────────────

interface StepRow {
  dept_id: number | null
  job_title: string | null
  total_sal: number
  cnt: number
  _level: 'detail' | 'subtotal' | 'grand'
  _key: string
  _new: boolean
}

const ROLLUP_STEPS: { grouping: string[]; rows: StepRow[] }[] = (() => {
  const depts = [...new Set(EMPS.map((e) => e.dept_id))].sort((a, b) => a - b)

  // Step 0: raw individual rows (not yet aggregated)
  const rawRows: StepRow[] = EMPS.map((e, i) => ({
    dept_id: e.dept_id,
    job_title: e.job_title,
    total_sal: e.salary,
    cnt: 1,
    _level: 'detail',
    _key: `raw-${i}`,
    _new: false,
  }))

  // Step 1: (dept_id, job_title) aggregated detail rows
  const detailRows: StepRow[] = []
  for (const dept of depts) {
    const deptRows = EMPS.filter((e) => e.dept_id === dept)
    const jobs = [...new Set(deptRows.map((e) => e.job_title))].sort()
    for (const job of jobs) {
      const rows = deptRows.filter((e) => e.job_title === job)
      detailRows.push({
        dept_id: dept,
        job_title: job,
        total_sal: rows.reduce((s, r) => s + r.salary, 0),
        cnt: rows.length,
        _level: 'detail',
        _key: `d-${dept}-${job}`,
        _new: true,
      })
    }
  }

  // Step 2: add (dept_id) subtotal rows after each dept's detail rows
  const withSubtotals: StepRow[] = []
  for (const dept of depts) {
    const dRows = EMPS.filter((e) => e.dept_id === dept)
    withSubtotals.push(
      ...detailRows
        .filter((r) => r.dept_id === dept)
        .map((r) => ({ ...r, _new: false }))
    )
    withSubtotals.push({
      dept_id: dept,
      job_title: null,
      total_sal: dRows.reduce((s, r) => s + r.salary, 0),
      cnt: dRows.length,
      _level: 'subtotal' as const,
      _key: `s-${dept}`,
      _new: true,
    })
  }

  // Step 3: add () grand total
  const withGrand: StepRow[] = [
    ...withSubtotals.map((r) => ({ ...r, _new: false })),
    {
      dept_id: null,
      job_title: null,
      total_sal: EMPS.reduce((s, r) => s + r.salary, 0),
      cnt: EMPS.length,
      _level: 'grand' as const,
      _key: 'grand',
      _new: true,
    },
  ]

  return [
    { grouping: [], rows: rawRows },
    { grouping: ['dept_id', 'job_title'], rows: detailRows },
    { grouping: ['dept_id'], rows: withSubtotals },
    { grouping: [], rows: withGrand },
  ]
})()

const STEP_META = {
  ko: [
    { label: 'Step 0', desc: '원본 데이터', groupKey: '없음 (개별 행)' },
    {
      label: 'Step 1',
      desc: 'GROUP BY (dept_id, job_title)',
      groupKey: '(dept_id, job_title)',
    },
    { label: 'Step 2', desc: 'dept_id 소계 행 추가', groupKey: '(dept_id)' },
    { label: 'Step 3', desc: '전체 총계 행 추가', groupKey: '()' },
  ],
  en: [
    {
      label: 'Step 0',
      desc: 'Raw detail rows',
      groupKey: 'none (individual rows)',
    },
    {
      label: 'Step 1',
      desc: 'GROUP BY (dept_id, job_title)',
      groupKey: '(dept_id, job_title)',
    },
    {
      label: 'Step 2',
      desc: 'dept_id subtotal rows added',
      groupKey: '(dept_id)',
    },
    { label: 'Step 3', desc: 'Grand total row added', groupKey: '()' },
  ],
}

const LEVEL_STYLE: Record<
  string,
  { row: string; badge: string; label: { ko: string; en: string } }
> = {
  detail: {
    row: '',
    badge: 'bg-rail text-ink-2',
    label: { ko: '상세', en: 'Detail' },
  },
  subtotal: {
    row: 'bg-amber/10',
    badge: 'bg-amber/15 text-amber',
    label: { ko: '소계', en: 'Subtotal' },
  },
  grand: {
    row: 'bg-amber/10',
    badge: 'bg-amber/25 text-amber font-semibold',
    label: { ko: '총계', en: 'Grand' },
  },
}

// ── CUBE step data ─────────────────────────────────────────────────────────

interface CubeStepRow {
  dept_id: number | null
  job_title: string | null
  total_sal: number
  cnt: number
  _grouping: string
  _key: string
  _new: boolean
}

const CUBE_STEPS: { rows: CubeStepRow[] }[] = (() => {
  const depts = [...new Set(EMPS.map((e) => e.dept_id))].sort((a, b) => a - b)
  const jobs = [...new Set(EMPS.map((e) => e.job_title))].sort()

  const rawRows: CubeStepRow[] = EMPS.map((e, i) => ({
    dept_id: e.dept_id,
    job_title: e.job_title,
    total_sal: e.salary,
    cnt: 1,
    _grouping: 'detail',
    _key: `raw-${i}`,
    _new: false,
  }))

  const detailRows: CubeStepRow[] = []
  for (const dept of depts) {
    for (const job of jobs) {
      const rows = EMPS.filter((e) => e.dept_id === dept && e.job_title === job)
      if (rows.length === 0) continue
      detailRows.push({
        dept_id: dept,
        job_title: job,
        total_sal: rows.reduce((s, r) => s + r.salary, 0),
        cnt: rows.length,
        _grouping: 'dept+job',
        _key: `d-${dept}-${job}`,
        _new: true,
      })
    }
  }

  const withDeptSub: CubeStepRow[] = [
    ...detailRows.map((r) => ({ ...r, _new: false })),
    ...depts.map((dept) => {
      const rows = EMPS.filter((e) => e.dept_id === dept)
      return {
        dept_id: dept,
        job_title: null,
        total_sal: rows.reduce((s, r) => s + r.salary, 0),
        cnt: rows.length,
        _grouping: 'dept',
        _key: `sd-${dept}`,
        _new: true,
      }
    }),
  ]

  const withJobSub: CubeStepRow[] = [
    ...withDeptSub.map((r) => ({ ...r, _new: false })),
    ...jobs.map((job) => {
      const rows = EMPS.filter((e) => e.job_title === job)
      return {
        dept_id: null,
        job_title: job,
        total_sal: rows.reduce((s, r) => s + r.salary, 0),
        cnt: rows.length,
        _grouping: 'job',
        _key: `sj-${job}`,
        _new: true,
      }
    }),
  ]

  const withGrand: CubeStepRow[] = [
    ...withJobSub.map((r) => ({ ...r, _new: false })),
    {
      dept_id: null,
      job_title: null,
      total_sal: EMPS.reduce((s, r) => s + r.salary, 0),
      cnt: EMPS.length,
      _grouping: 'grand',
      _key: 'grand',
      _new: true,
    },
  ]

  return [
    { rows: rawRows },
    { rows: detailRows },
    { rows: withDeptSub },
    { rows: withJobSub },
    { rows: withGrand },
  ]
})()

const CUBE_STEP_META = {
  ko: [
    { label: 'Step 0', desc: '원본 데이터', groupKey: '없음 (개별 행)' },
    {
      label: 'Step 1',
      desc: 'GROUP BY (dept_id, job_title) 상세',
      groupKey: '(dept_id, job_title)',
    },
    { label: 'Step 2', desc: 'dept_id 소계 행 추가', groupKey: '(dept_id)' },
    {
      label: 'Step 3',
      desc: 'job_title 소계 행 추가',
      groupKey: '(job_title)',
    },
    { label: 'Step 4', desc: '전체 총계 행 추가', groupKey: '()' },
  ],
  en: [
    {
      label: 'Step 0',
      desc: 'Raw detail rows',
      groupKey: 'none (individual rows)',
    },
    {
      label: 'Step 1',
      desc: 'GROUP BY (dept_id, job_title) detail',
      groupKey: '(dept_id, job_title)',
    },
    {
      label: 'Step 2',
      desc: 'dept_id subtotal rows added',
      groupKey: '(dept_id)',
    },
    {
      label: 'Step 3',
      desc: 'job_title subtotal rows added',
      groupKey: '(job_title)',
    },
    { label: 'Step 4', desc: 'Grand total row added', groupKey: '()' },
  ],
}

const CUBE_GROUPING_STYLE: Record<
  string,
  { row: string; badge: string; label: { ko: string; en: string } }
> = {
  detail: {
    row: '',
    badge: 'bg-rail text-ink-2',
    label: { ko: '원본', en: 'Raw' },
  },
  'dept+job': {
    row: '',
    badge: 'bg-rail text-ink-2',
    label: { ko: '상세', en: 'Detail' },
  },
  dept: {
    row: 'bg-amber/10',
    badge: 'bg-amber/15 text-amber',
    label: { ko: '부서 소계', en: 'Dept sub' },
  },
  job: {
    row: 'bg-green/10',
    badge: 'bg-green/15 text-green',
    label: { ko: '직무 소계', en: 'Job sub' },
  },
  grand: {
    row: 'bg-amber/10',
    badge: 'bg-amber/25 text-amber font-semibold',
    label: { ko: '총계', en: 'Grand' },
  },
}

// ── GROUPING SETS step data ────────────────────────────────────────────────

interface GSStepRow {
  dept_id: number | null
  job_title: string | null
  total_sal: number
  cnt: number
  _set: string
  _key: string
  _new: boolean
}

const GS_STEPS: { rows: GSStepRow[] }[] = (() => {
  const depts = [...new Set(EMPS.map((e) => e.dept_id))].sort((a, b) => a - b)
  const jobs = [...new Set(EMPS.map((e) => e.job_title))].sort()

  const rawRows: GSStepRow[] = EMPS.map((e, i) => ({
    dept_id: e.dept_id,
    job_title: e.job_title,
    total_sal: e.salary,
    cnt: 1,
    _set: 'raw',
    _key: `raw-${i}`,
    _new: false,
  }))

  const deptRows: GSStepRow[] = depts.map((dept) => {
    const rows = EMPS.filter((e) => e.dept_id === dept)
    return {
      dept_id: dept,
      job_title: null,
      total_sal: rows.reduce((s, r) => s + r.salary, 0),
      cnt: rows.length,
      _set: 'dept',
      _key: `d-${dept}`,
      _new: true,
    }
  })

  const withJob: GSStepRow[] = [
    ...deptRows.map((r) => ({ ...r, _new: false })),
    ...jobs.map((job) => {
      const rows = EMPS.filter((e) => e.job_title === job)
      return {
        dept_id: null,
        job_title: job,
        total_sal: rows.reduce((s, r) => s + r.salary, 0),
        cnt: rows.length,
        _set: 'job',
        _key: `j-${job}`,
        _new: true,
      }
    }),
  ]

  return [{ rows: rawRows }, { rows: deptRows }, { rows: withJob }]
})()

const GS_STEP_META = {
  ko: [
    { label: 'Step 0', desc: '원본 데이터', groupKey: '없음 (개별 행)' },
    { label: 'Step 1', desc: 'GROUP BY (dept_id) 집계', groupKey: '(dept_id)' },
    {
      label: 'Step 2',
      desc: 'GROUP BY (job_title) 집계 추가',
      groupKey: '(job_title)',
    },
  ],
  en: [
    {
      label: 'Step 0',
      desc: 'Raw detail rows',
      groupKey: 'none (individual rows)',
    },
    {
      label: 'Step 1',
      desc: 'GROUP BY (dept_id) aggregated',
      groupKey: '(dept_id)',
    },
    {
      label: 'Step 2',
      desc: 'GROUP BY (job_title) added',
      groupKey: '(job_title)',
    },
  ],
}

const GS_SET_STYLE: Record<
  string,
  { row: string; badge: string; label: { ko: string; en: string } }
> = {
  raw: {
    row: '',
    badge: 'bg-rail text-ink-2',
    label: { ko: '원본', en: 'Raw' },
  },
  dept: {
    row: 'bg-amber/10',
    badge: 'bg-amber/15 text-amber',
    label: { ko: '부서별', en: 'By dept' },
  },
  job: {
    row: 'bg-green/10',
    badge: 'bg-green/15 text-green',
    label: { ko: '직무별', en: 'By job' },
  },
}

// ── GROUPING() step data ───────────────────────────────────────────────────

interface GrpFnStepRow {
  dept_id: number | null
  job_title: string | null
  total_sal: number
  cnt: number
  grp_dept: number
  grp_job: number
  _level: 'detail' | 'subtotal' | 'grand'
  _key: string
  _new: boolean
}

const GRPFN_STEPS: { rows: GrpFnStepRow[] }[] = (() => {
  const depts = [...new Set(EMPS.map((e) => e.dept_id))].sort((a, b) => a - b)

  const rawRows: GrpFnStepRow[] = EMPS.map((e, i) => ({
    dept_id: e.dept_id,
    job_title: e.job_title,
    total_sal: e.salary,
    cnt: 1,
    grp_dept: 0,
    grp_job: 0,
    _level: 'detail',
    _key: `raw-${i}`,
    _new: false,
  }))

  const detailRows: GrpFnStepRow[] = []
  for (const dept of depts) {
    const deptRows = EMPS.filter((e) => e.dept_id === dept)
    const jobs = [...new Set(deptRows.map((e) => e.job_title))].sort()
    for (const job of jobs) {
      const rows = deptRows.filter((e) => e.job_title === job)
      detailRows.push({
        dept_id: dept,
        job_title: job,
        total_sal: rows.reduce((s, r) => s + r.salary, 0),
        cnt: rows.length,
        grp_dept: 0,
        grp_job: 0,
        _level: 'detail',
        _key: `d-${dept}-${job}`,
        _new: true,
      })
    }
  }

  const withSubtotals: GrpFnStepRow[] = []
  for (const dept of depts) {
    const dRows = EMPS.filter((e) => e.dept_id === dept)
    withSubtotals.push(
      ...detailRows
        .filter((r) => r.dept_id === dept)
        .map((r) => ({ ...r, _new: false }))
    )
    withSubtotals.push({
      dept_id: dept,
      job_title: null,
      total_sal: dRows.reduce((s, r) => s + r.salary, 0),
      cnt: dRows.length,
      grp_dept: 0,
      grp_job: 1,
      _level: 'subtotal' as const,
      _key: `s-${dept}`,
      _new: true,
    })
  }

  const withGrand: GrpFnStepRow[] = [
    ...withSubtotals.map((r) => ({ ...r, _new: false })),
    {
      dept_id: null,
      job_title: null,
      total_sal: EMPS.reduce((s, r) => s + r.salary, 0),
      cnt: EMPS.length,
      grp_dept: 1,
      grp_job: 1,
      _level: 'grand' as const,
      _key: 'grand',
      _new: true,
    },
  ]

  return [
    { rows: rawRows },
    { rows: detailRows },
    { rows: withSubtotals },
    { rows: withGrand },
  ]
})()

const GRPFN_STEP_META = {
  ko: [
    { label: 'Step 0', desc: '원본 데이터', groupKey: '없음 (개별 행)' },
    {
      label: 'Step 1',
      desc: 'GROUP BY (dept_id, job_title) 상세 — GROUPING()=0,0',
      groupKey: '(dept_id, job_title)',
    },
    {
      label: 'Step 2',
      desc: 'dept_id 소계 — grp_job=1',
      groupKey: '(dept_id)',
    },
    {
      label: 'Step 3',
      desc: '전체 총계 — grp_dept=1, grp_job=1',
      groupKey: '()',
    },
  ],
  en: [
    {
      label: 'Step 0',
      desc: 'Raw detail rows',
      groupKey: 'none (individual rows)',
    },
    {
      label: 'Step 1',
      desc: 'GROUP BY (dept_id, job_title) detail — GROUPING()=0,0',
      groupKey: '(dept_id, job_title)',
    },
    {
      label: 'Step 2',
      desc: 'dept_id subtotal — grp_job=1',
      groupKey: '(dept_id)',
    },
    {
      label: 'Step 3',
      desc: 'Grand total — grp_dept=1, grp_job=1',
      groupKey: '()',
    },
  ],
}

function RollupAnimator({ lang }: { lang: 'ko' | 'en' }) {
  const [step, setStep] = useState(0)
  const meta = STEP_META[lang]
  const { rows } = ROLLUP_STEPS[step]
  const isLast = step === ROLLUP_STEPS.length - 1

  const groupingLevels = {
    ko: ['(dept_id, job_title) 상세', '(dept_id) 부서 소계', '() 전체 총계'],
    en: [
      '(dept_id, job_title) detail',
      '(dept_id) dept subtotal',
      '() grand total',
    ],
  }

  return (
    <div className="rounded-panel mb-6 overflow-hidden border">
      {/* Header */}
      <div className="bg-rail flex items-center justify-between gap-4 border-b px-4 py-3">
        <div>
          <span className="text-ink-2 font-mono text-[10px] font-bold tracking-widest uppercase">
            {lang === 'ko'
              ? 'ROLLUP 단계별로 보기'
              : 'ROLLUP Step-by-Step Simulator'}
          </span>
        </div>
        {/* Step pills */}
        <div className="flex shrink-0 gap-1.5">
          {meta.map((m, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold transition-all',
                step === i
                  ? 'bg-amber text-paper'
                  : 'bg-rail text-ink-2 hover:bg-rail'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step description + active levels */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5">
        <span className="rounded-card bg-amber/15 text-amber shrink-0 px-2 py-0.5 font-mono text-[10px] font-bold">
          {meta[step].label}
        </span>
        <span className="text-ink/80 font-mono text-[11px]">
          {meta[step].desc}
        </span>
        <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-1.5">
          {groupingLevels[lang].map((lbl, i) => (
            <span
              key={i}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-all duration-300',
                step >= i + 1
                  ? 'bg-amber/15 text-amber'
                  : 'bg-rail text-ink-2/30'
              )}
            >
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto p-4">
        <table className="text-xs">
          <thead>
            <tr className="border-b">
              {[
                'dept_id',
                'job_title',
                step === 0 ? 'salary' : 'total_sal',
                ...(step === 0 ? [] : ['cnt', '']),
              ].map((h, i) => (
                <th
                  key={i}
                  className="text-ink-2 pr-6 pb-2 text-left font-mono font-bold whitespace-nowrap last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row) => {
                const s = LEVEL_STYLE[row._level]
                return (
                  <motion.tr
                    key={row._key}
                    layout
                    initial={
                      row._new
                        ? {
                            opacity: 0,
                            x: -12,
                            backgroundColor: 'var(--color-rail)',
                          }
                        : false
                    }
                    animate={{
                      opacity: 1,
                      x: 0,
                      backgroundColor: 'transparent',
                    }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className={cn('border-b last:border-0', s.row)}
                  >
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.dept_id ?? <NullCell />}
                    </td>
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.job_title ?? <NullCell />}
                    </td>
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.total_sal.toLocaleString()}
                    </td>
                    {step > 0 && (
                      <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                        {row.cnt}
                      </td>
                    )}
                    {step > 0 && (
                      <td className="py-1.5">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-bold',
                            s.badge
                          )}
                        >
                          {s.label[lang]}
                        </span>
                      </td>
                    )}
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Next / Prev buttons */}
      <div className="bg-rail flex items-center justify-between border-t px-4 py-2.5">
        <button
          onClick={() => setStep((p) => Math.max(0, p - 1))}
          disabled={step === 0}
          className="rounded-card text-ink-2 hover:bg-rail border px-3 py-1 font-mono text-[11px] font-bold transition-colors disabled:opacity-30"
        >
          ← {lang === 'ko' ? '이전' : 'Prev'}
        </button>
        <span className="text-ink-2/50 font-mono text-[10px]">
          {step + 1} / {ROLLUP_STEPS.length}
        </span>
        <button
          onClick={() =>
            setStep((p) => Math.min(ROLLUP_STEPS.length - 1, p + 1))
          }
          disabled={isLast}
          className="rounded-card text-ink-2 hover:bg-rail border px-3 py-1 font-mono text-[11px] font-bold transition-colors disabled:opacity-30"
        >
          {lang === 'ko' ? '다음' : 'Next'} →
        </button>
      </div>
    </div>
  )
}

// ── CubeAnimator ──────────────────────────────────────────────────────────

function CubeAnimator({ lang }: { lang: 'ko' | 'en' }) {
  const [step, setStep] = useState(0)
  const meta = CUBE_STEP_META[lang]
  const { rows } = CUBE_STEPS[step]
  const isLast = step === CUBE_STEPS.length - 1

  const levelBadges = {
    ko: ['dept+job 상세', 'dept 소계', 'job 소계', '전체 총계'],
    en: ['dept+job detail', 'dept subtotal', 'job subtotal', 'grand total'],
  }

  return (
    <div className="rounded-panel mb-6 overflow-hidden border">
      <div className="bg-rail flex items-center justify-between gap-4 border-b px-4 py-3">
        <div>
          <span className="text-ink-2 font-mono text-[10px] font-bold tracking-widest uppercase">
            {lang === 'ko'
              ? 'CUBE 단계별로 보기'
              : 'CUBE Step-by-Step Simulator'}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {meta.map((m, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold transition-all',
                step === i
                  ? 'bg-amber text-paper'
                  : 'bg-rail text-ink-2 hover:bg-rail'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5">
        <span className="rounded-card bg-amber/15 text-amber shrink-0 px-2 py-0.5 font-mono text-[10px] font-bold">
          {meta[step].label}
        </span>
        <span className="text-ink/80 font-mono text-[11px]">
          {meta[step].desc}
        </span>
        <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-1.5">
          {levelBadges[lang].map((lbl, i) => (
            <span
              key={i}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-all duration-300',
                step >= i + 1
                  ? i === 2
                    ? 'bg-green/15 text-green'
                    : 'bg-amber/15 text-amber'
                  : 'bg-rail text-ink-2/30'
              )}
            >
              {lbl}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="text-xs">
          <thead>
            <tr className="border-b">
              {[
                'dept_id',
                'job_title',
                step === 0 ? 'salary' : 'total_sal',
                ...(step === 0 ? [] : ['cnt', '']),
              ].map((h, i) => (
                <th
                  key={i}
                  className="text-ink-2 pr-6 pb-2 text-left font-mono font-bold whitespace-nowrap last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row) => {
                const s = CUBE_GROUPING_STYLE[row._grouping]
                return (
                  <motion.tr
                    key={row._key}
                    layout
                    initial={
                      row._new
                        ? {
                            opacity: 0,
                            x: -12,
                            backgroundColor: 'var(--color-rail)',
                          }
                        : false
                    }
                    animate={{
                      opacity: 1,
                      x: 0,
                      backgroundColor: 'transparent',
                    }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className={cn('border-b last:border-0', s.row)}
                  >
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.dept_id ?? <NullCell />}
                    </td>
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.job_title ?? <NullCell />}
                    </td>
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.total_sal.toLocaleString()}
                    </td>
                    {step > 0 && (
                      <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                        {row.cnt}
                      </td>
                    )}
                    {step > 0 && (
                      <td className="py-1.5">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-bold',
                            s.badge
                          )}
                        >
                          {s.label[lang]}
                        </span>
                      </td>
                    )}
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="bg-rail flex items-center justify-between border-t px-4 py-2.5">
        <button
          onClick={() => setStep((p) => Math.max(0, p - 1))}
          disabled={step === 0}
          className="rounded-card text-ink-2 hover:bg-rail border px-3 py-1 font-mono text-[11px] font-bold transition-colors disabled:opacity-30"
        >
          ← {lang === 'ko' ? '이전' : 'Prev'}
        </button>
        <span className="text-ink-2/50 font-mono text-[10px]">
          {step + 1} / {CUBE_STEPS.length}
        </span>
        <button
          onClick={() => setStep((p) => Math.min(CUBE_STEPS.length - 1, p + 1))}
          disabled={isLast}
          className="rounded-card text-ink-2 hover:bg-rail border px-3 py-1 font-mono text-[11px] font-bold transition-colors disabled:opacity-30"
        >
          {lang === 'ko' ? '다음' : 'Next'} →
        </button>
      </div>
    </div>
  )
}

// ── GroupingSetsAnimator ───────────────────────────────────────────────────

function GroupingSetsAnimator({ lang }: { lang: 'ko' | 'en' }) {
  const [step, setStep] = useState(0)
  const meta = GS_STEP_META[lang]
  const { rows } = GS_STEPS[step]
  const isLast = step === GS_STEPS.length - 1

  const levelBadges = {
    ko: ['(dept_id) 부서별', '(job_title) 직무별'],
    en: ['(dept_id) by dept', '(job_title) by job'],
  }

  return (
    <div className="rounded-panel mb-6 overflow-hidden border">
      <div className="bg-rail flex items-center justify-between gap-4 border-b px-4 py-3">
        <div>
          <span className="text-ink-2 font-mono text-[10px] font-bold tracking-widest uppercase">
            {lang === 'ko'
              ? 'GROUPING SETS 단계별로 보기'
              : 'GROUPING SETS Step-by-Step Simulator'}
          </span>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {meta.map((m, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold transition-all',
                step === i
                  ? 'bg-amber text-paper'
                  : 'bg-rail text-ink-2 hover:bg-rail'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5">
        <span className="rounded-card bg-amber/15 text-amber shrink-0 px-2 py-0.5 font-mono text-[10px] font-bold">
          {meta[step].label}
        </span>
        <span className="text-ink/80 font-mono text-[11px]">
          {meta[step].desc}
        </span>
        <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-1.5">
          {levelBadges[lang].map((lbl, i) => (
            <span
              key={i}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-all duration-300',
                step >= i + 1
                  ? i === 0
                    ? 'bg-amber/15 text-amber'
                    : 'bg-green/15 text-green'
                  : 'bg-rail text-ink-2/30'
              )}
            >
              {lbl}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="text-xs">
          <thead>
            <tr className="border-b">
              {[
                'dept_id',
                'job_title',
                step === 0 ? 'salary' : 'total_sal',
                ...(step === 0 ? [] : ['cnt', '']),
              ].map((h, i) => (
                <th
                  key={i}
                  className="text-ink-2 pr-6 pb-2 text-left font-mono font-bold whitespace-nowrap last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row) => {
                const s = GS_SET_STYLE[row._set]
                return (
                  <motion.tr
                    key={row._key}
                    layout
                    initial={
                      row._new
                        ? {
                            opacity: 0,
                            x: -12,
                            backgroundColor: 'var(--color-rail)',
                          }
                        : false
                    }
                    animate={{
                      opacity: 1,
                      x: 0,
                      backgroundColor: 'transparent',
                    }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className={cn('border-b last:border-0', s.row)}
                  >
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.dept_id ?? <NullCell />}
                    </td>
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.job_title ?? <NullCell />}
                    </td>
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.total_sal.toLocaleString()}
                    </td>
                    {step > 0 && (
                      <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                        {row.cnt}
                      </td>
                    )}
                    {step > 0 && (
                      <td className="py-1.5">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-bold',
                            s.badge
                          )}
                        >
                          {s.label[lang]}
                        </span>
                      </td>
                    )}
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="bg-rail flex items-center justify-between border-t px-4 py-2.5">
        <button
          onClick={() => setStep((p) => Math.max(0, p - 1))}
          disabled={step === 0}
          className="rounded-card text-ink-2 hover:bg-rail border px-3 py-1 font-mono text-[11px] font-bold transition-colors disabled:opacity-30"
        >
          ← {lang === 'ko' ? '이전' : 'Prev'}
        </button>
        <span className="text-ink-2/50 font-mono text-[10px]">
          {step + 1} / {GS_STEPS.length}
        </span>
        <button
          onClick={() => setStep((p) => Math.min(GS_STEPS.length - 1, p + 1))}
          disabled={isLast}
          className="rounded-card text-ink-2 hover:bg-rail border px-3 py-1 font-mono text-[11px] font-bold transition-colors disabled:opacity-30"
        >
          {lang === 'ko' ? '다음' : 'Next'} →
        </button>
      </div>
    </div>
  )
}

// ── GroupingFnAnimator ─────────────────────────────────────────────────────

function GroupingFnAnimator({ lang }: { lang: 'ko' | 'en' }) {
  const [step, setStep] = useState(0)
  const meta = GRPFN_STEP_META[lang]
  const { rows } = GRPFN_STEPS[step]
  const isLast = step === GRPFN_STEPS.length - 1

  const levelBadges = {
    ko: ['상세 (grp=0,0)', '소계 (grp_job=1)', '총계 (grp=1,1)'],
    en: ['detail (grp=0,0)', 'subtotal (grp_job=1)', 'grand (grp=1,1)'],
  }

  return (
    <div className="rounded-panel mb-6 overflow-hidden border">
      <div className="bg-rail flex items-center justify-between gap-4 border-b px-4 py-3">
        <div>
          <span className="text-ink-2 font-mono text-[10px] font-bold tracking-widest uppercase">
            {lang === 'ko'
              ? 'GROUPING() 단계별로 보기='
              : 'GROUPING() Step-by-Step Simulator'}
          </span>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {meta.map((m, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold transition-all',
                step === i
                  ? 'bg-amber text-paper'
                  : 'bg-rail text-ink-2 hover:bg-rail'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5">
        <span className="rounded-card bg-amber/15 text-amber shrink-0 px-2 py-0.5 font-mono text-[10px] font-bold">
          {meta[step].label}
        </span>
        <span className="text-ink/80 font-mono text-[11px]">
          {meta[step].desc}
        </span>
        <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-1.5">
          {levelBadges[lang].map((lbl, i) => (
            <span
              key={i}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-all duration-300',
                step >= i + 1
                  ? 'bg-amber/15 text-amber'
                  : 'bg-rail text-ink-2/30'
              )}
            >
              {lbl}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="text-xs">
          <thead>
            <tr className="border-b">
              {[
                'dept_id',
                'job_title',
                step === 0 ? 'salary' : 'total_sal',
                ...(step === 0 ? [] : ['cnt', 'grp_dept', 'grp_job']),
              ].map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    'pr-6 pb-2 text-left font-mono font-bold whitespace-nowrap last:pr-0',
                    i >= 4 ? 'text-amber' : 'text-ink-2'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row) => {
                const s = LEVEL_STYLE[row._level]
                return (
                  <motion.tr
                    key={row._key}
                    layout
                    initial={
                      row._new
                        ? {
                            opacity: 0,
                            x: -12,
                            backgroundColor: 'var(--color-rail)',
                          }
                        : false
                    }
                    animate={{
                      opacity: 1,
                      x: 0,
                      backgroundColor: 'transparent',
                    }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className={cn('border-b last:border-0', s.row)}
                  >
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.dept_id ?? <NullCell />}
                    </td>
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.job_title ?? <NullCell />}
                    </td>
                    <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                      {row.total_sal.toLocaleString()}
                    </td>
                    {step > 0 && (
                      <td className="text-ink/80 py-1.5 pr-6 font-mono text-[11px] whitespace-nowrap">
                        {row.cnt}
                      </td>
                    )}
                    {step > 0 && (
                      <td className="py-1.5 pr-6 text-center">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 font-mono text-[11px] font-bold',
                            row.grp_dept === 1
                              ? 'bg-amber/15 text-amber'
                              : 'bg-rail text-ink-2'
                          )}
                        >
                          {row.grp_dept}
                        </span>
                      </td>
                    )}
                    {step > 0 && (
                      <td className="py-1.5 text-center">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 font-mono text-[11px] font-bold',
                            row.grp_job === 1
                              ? 'bg-amber/15 text-amber'
                              : 'bg-rail text-ink-2'
                          )}
                        >
                          {row.grp_job}
                        </span>
                      </td>
                    )}
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="bg-rail flex items-center justify-between border-t px-4 py-2.5">
        <button
          onClick={() => setStep((p) => Math.max(0, p - 1))}
          disabled={step === 0}
          className="rounded-card text-ink-2 hover:bg-rail border px-3 py-1 font-mono text-[11px] font-bold transition-colors disabled:opacity-30"
        >
          ← {lang === 'ko' ? '이전' : 'Prev'}
        </button>
        <span className="text-ink-2/50 font-mono text-[10px]">
          {step + 1} / {GRPFN_STEPS.length}
        </span>
        <button
          onClick={() =>
            setStep((p) => Math.min(GRPFN_STEPS.length - 1, p + 1))
          }
          disabled={isLast}
          className="rounded-card text-ink-2 hover:bg-rail border px-3 py-1 font-mono text-[11px] font-bold transition-colors disabled:opacity-30"
        >
          {lang === 'ko' ? '다음' : 'Next'} →
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function NullCell() {
  return <span className="text-ink-2/50 italic">NULL</span>
}

// ── Main component ─────────────────────────────────────────────────────────

export function RollupSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang] as TShape
  const [tab, setTab] = useState<Tab>('rollup')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'rollup', label: t.tabRollup },
    { id: 'cube', label: t.tabCube },
    { id: 'groupingsets', label: t.tabGroupingSets },
    { id: 'grouping', label: t.tabGrouping },
  ]

  const tabActiveClass = 'border-amber/30 bg-amber/10 text-amber'

  return (
    <PageContainer className="max-w-5xl">
      <ChapterTitle
        icon={
          <IconChartTreemap size={36} color="var(--color-amber)" stroke={1.5} />
        }
        title={t.chapterTitle}
        subtitle={t.chapterSubtitle}
      />

      {/* Tab bar */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              'rounded-card border px-4 py-1.5 font-mono text-[11px] font-bold transition-all',
              tab === tb.id
                ? tabActiveClass + ' '
                : 'border-line bg-rail text-ink-2 hover:bg-rail'
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ROLLUP */}
      {tab === 'rollup' && (
        <>
          <SectionTitle>{t.rollupTitle}</SectionTitle>
          <Prose>{t.rollupDesc}</Prose>
          <InfoBox variant="summary">{t.rollupInfo}</InfoBox>
          <SqlBlock sql={ROLLUP_SQL} className="mb-5" />
          <RollupAnimator lang={lang} />
          <InfoBox variant="note">{t.nullMeaning}</InfoBox>

          <Divider />

          {/* Etymology */}
          <SubTitle>{t.rollupEtymTitle}</SubTitle>
          <Prose>{t.rollupEtym}</Prose>

          <Divider />

          {/* Practical usage */}
          <SubTitle>{t.rollupUsageTitle}</SubTitle>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {t.rollupUsages.map((u) => (
              <div key={u.title} className="rounded-card bg-rail border p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-base">{u.icon}</span>
                  <span className="text-ink/80 font-mono text-[11px] font-bold">
                    {u.title}
                  </span>
                </div>
                <p className="text-ink-2 font-mono text-[11px] leading-relaxed">
                  {u.desc}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CUBE */}
      {tab === 'cube' && (
        <>
          <SectionTitle>{t.cubeTitle}</SectionTitle>
          <Prose>{t.cubeDesc}</Prose>
          <InfoBox variant="summary">{t.cubeInfo}</InfoBox>

          <Divider />

          <SubTitle>{t.comparisonTitle}</SubTitle>
          <div className="rounded-card mb-5 overflow-hidden border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-rail border-b">
                  {['', 'ROLLUP(dept, job)', 'CUBE(dept, job)'].map((h, i) => (
                    <th
                      key={i}
                      className="text-ink-2 px-4 py-2 text-left font-mono font-bold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(lang === 'ko'
                  ? [
                      ['dept + job 상세', '✅', '✅'],
                      ['dept 소계', '✅', '✅'],
                      ['job 소계', '❌', '✅'],
                      ['전체 총계', '✅', '✅'],
                      [
                        '생성 행 수',
                        `${computeRollup().length}행`,
                        `${computeCube().length}행`,
                      ],
                    ]
                  : [
                      ['dept + job detail', '✅', '✅'],
                      ['dept subtotal', '✅', '✅'],
                      ['job subtotal', '❌', '✅'],
                      ['grand total', '✅', '✅'],
                      [
                        'rows generated',
                        `${computeRollup().length} rows`,
                        `${computeCube().length} rows`,
                      ],
                    ]
                ).map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b last:border-0',
                      i % 2 === 0 ? 'bg-paper' : 'bg-rail'
                    )}
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="text-ink/80 px-4 py-2 font-mono text-[11px]"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SqlBlock sql={CUBE_SQL} className="mb-5" />
          <CubeAnimator lang={lang} />
          <InfoBox variant="note">{t.nullMeaning}</InfoBox>
        </>
      )}

      {/* GROUPING SETS */}
      {tab === 'groupingsets' && (
        <>
          <SectionTitle>{t.groupingSetsTitle}</SectionTitle>
          <Prose>{t.groupingSetsDesc}</Prose>
          <InfoBox variant="summary">{t.groupingSetsInfo}</InfoBox>
          <SqlBlock sql={GROUPING_SETS_SQL} className="mb-5" />
          <GroupingSetsAnimator lang={lang} />

          <Divider />

          <SubTitle>{t.groupingSetsEqTitle}</SubTitle>
          <Prose>{t.groupingSetsEqDesc}</Prose>
          <SqlBlock sql={GROUPING_SETS_EQ_SQL} className="mb-5" />

          <InfoBox variant="note">{t.nullMeaning}</InfoBox>
        </>
      )}

      {/* GROUPING() */}
      {tab === 'grouping' && (
        <>
          <SectionTitle>{t.groupingTitle}</SectionTitle>
          <Prose>{t.groupingDesc}</Prose>
          <InfoBox variant="summary">{t.groupingInfo}</InfoBox>
          <SqlBlock sql={GROUPING_FN_SQL} className="mb-5" />
          <GroupingFnAnimator lang={lang} />

          <Divider />

          <SubTitle>{t.groupingCaseTitle}</SubTitle>
          <Prose>{t.groupingCaseDesc}</Prose>
          <SqlBlock sql={GROUPING_CASE_SQL} className="mb-5" />
        </>
      )}
    </PageContainer>
  )
}
