// SQL 절(SELECT·WHERE·ORDER BY·GROUP BY·HAVING …) 구문 데모 데이터.
// commands/DMLSection 과 dml-more/ClausesSection 두 곳이 공유한다.
// (MiniSimulator 는 여기 ClauseDemo 타입만 가져다 씀)

export interface ClauseVariant {
  op: string
  sql: string
  type: 'SELECT' | 'UPDATE' | 'DELETE'
  desc: { ko: string; en: string }
}

export interface ClauseDemo {
  sectionKey: string
  label: { ko: string; en: string }
  sql: string
  type: 'SELECT' | 'UPDATE' | 'DELETE'
  variants?: ClauseVariant[]
}

// DMLSection 의 절 개요 카드 색상 (color 키 → Tailwind 클래스).
export const CLAUSE_COLOR: Record<string, string> = {
  blue: 'border-blue/30 bg-blue/10 text-blue',
  violet: 'border-purple/30 bg-purple/5 text-purple',
  orange: 'border-amber/30 bg-amber/10 text-amber',
  amber: 'border-amber/30 bg-amber/5 text-amber',
  rose: 'border-red/30 bg-red/10 text-red',
}

export const CLAUSE_DEMOS: ClauseDemo[] = [
  {
    sectionKey: 'intro',
    sql: 'SELECT *\nFROM   employees',
    type: 'SELECT',
    label: { ko: '전체 조회', en: 'Select all' },
    variants: [
      {
        op: 'SELECT *',
        sql: 'SELECT *\nFROM   employees',
        type: 'SELECT',
        desc: {
          ko: 'employees 테이블에 저장된 모든 행 조회',
          en: 'All data from the table employees',
        },
      },
    ],
  },
  {
    sectionKey: 'select',
    sql: 'SELECT emp_id, first_name, dept_id, salary\nFROM   employees\nWHERE  dept_id = 10',
    type: 'SELECT',
    label: { ko: 'SELECT 예시', en: 'SELECT example' },
    variants: [
      {
        op: 'SELECT emp_id, first_name, dept_id, salary',
        sql: 'SELECT emp_id, first_name, dept_id, salary\nFROM   employees\nWHERE  dept_id = 10',
        type: 'SELECT',
        desc: {
          ko: 'employees 테이블에서 dept_id = 10인 데이터의 emp_id, first_name, dept_id, salary 값',
          en: 'emp_id, first_name, dept_id, salary data which dept_id = 10 from table employees',
        },
      },
    ],
  },
  {
    sectionKey: 'distinct',
    sql: 'SELECT DISTINCT dept_id\nFROM   employees',
    type: 'SELECT',
    label: { ko: 'DISTINCT 예시', en: 'DISTINCT example' },
    variants: [
      {
        op: 'DISTINCT dept_id',
        sql: 'SELECT DISTINCT dept_id\nFROM   employees',
        type: 'SELECT',
        desc: {
          ko: 'dept_id의 중복을 제거한 고유 부서 목록',
          en: 'Unique department list with duplicates removed',
        },
      },
      {
        op: 'DISTINCT job_title, dept_id',
        sql: 'SELECT DISTINCT job_title, dept_id\nFROM   employees',
        type: 'SELECT',
        desc: {
          ko: 'job_title + dept_id 조합이 동일한 행을 중복으로 처리합니다.',
          en: 'Rows with the same job_title + dept_id combination are treated as duplicates.',
        },
      },
      {
        op: 'DISTINCT dept_id, job_title',
        sql: 'SELECT DISTINCT dept_id, job_title\nFROM   employees',
        type: 'SELECT',
        desc: {
          ko: "dept_id + job_title 조합이 동일한 행을 중복으로 처리합니다. 예를 들어 dept_id=10, job_title='Engineer'인 행이 2개라면 1개만 반환됩니다.",
          en: "Rows with the same dept_id + job_title combination are treated as duplicates. For example, if two rows have dept_id=10 and job_title='Engineer', only one is returned.",
        },
      },
    ],
  },
  {
    sectionKey: 'where',
    sql: 'SELECT *\nFROM   employees\nWHERE  salary >= 7000',
    type: 'SELECT',
    label: { ko: 'WHERE 연산자', en: 'WHERE operators' },
    variants: [
      {
        op: '=',
        sql: 'SELECT *\nFROM   employees\nWHERE  dept_id = 10',
        type: 'SELECT',
        desc: {
          ko: 'dept_id가 10인 행',
          en: 'Rows where dept_id equals 10',
        },
      },
      {
        op: '!= / <>',
        sql: 'SELECT *\nFROM   employees\nWHERE  dept_id != 10',
        type: 'SELECT',
        desc: {
          ko: 'dept_id가 10이 아닌 행',
          en: 'Rows where dept_id is not 10',
        },
      },
      {
        op: '>= / <=',
        sql: 'SELECT *\nFROM   employees\nWHERE  salary >= 7000',
        type: 'SELECT',
        desc: {
          ko: 'salary가 7000 이상인 행',
          en: 'Rows where salary is at least 7000',
        },
      },
      {
        op: 'BETWEEN',
        sql: 'SELECT *\nFROM   employees\nWHERE  salary BETWEEN 5000 AND 7500',
        type: 'SELECT',
        desc: {
          ko: 'salary가 5000보다 크고 7500보다 작은 행, 5000 <= salary AND salary <= 7500',
          en: 'Rows where salary is between 5000 and 7500, 5000 <= salary AND salary <= 7500',
        },
      },
      {
        op: 'NOT BETWEEN',
        sql: 'SELECT *\nFROM   employees\nWHERE  salary NOT BETWEEN 5000 AND 7500',
        type: 'SELECT',
        desc: {
          ko: 'salary가 5000 미만이거나 7500 초과인 행, BETWEEN의 반대 범위를 선택합니다.',
          en: 'Rows where salary is less than 5000 or greater than 7500 — the inverse of BETWEEN.',
        },
      },
      {
        op: 'LIKE',
        sql: "SELECT *\nFROM   employees\nWHERE  last_name LIKE 'K%'",
        type: 'SELECT',
        desc: {
          ko: "last_name이 'K'로 시작하는 행",
          en: "Rows where last_name starts with 'K'",
        },
      },
      {
        op: 'IN',
        sql: 'SELECT *\nFROM   employees\nWHERE  dept_id IN (10, 20)',
        type: 'SELECT',
        desc: {
          ko: 'dept_id가 10이거나 20인 행',
          en: 'Rows where dept_id is 10 or 20',
        },
      },
      {
        op: 'IS NULL',
        sql: 'SELECT *\nFROM   employees\nWHERE  manager_id IS NULL',
        type: 'SELECT',
        desc: {
          ko: 'manager_id가 NULL인 행 (최상위 관리자)',
          en: 'Rows where manager_id is NULL (top-level managers)',
        },
      },
      {
        op: 'AND',
        sql: 'SELECT *\nFROM   employees\nWHERE  dept_id = 20\n  AND  salary >= 5500',
        type: 'SELECT',
        desc: {
          ko: 'dept_id가 20이면서 salary가 5500 이상인 행',
          en: 'Rows in dept_id is 20 AND salary at least 5500',
        },
      },
      {
        op: 'OR',
        sql: 'SELECT *\nFROM   employees\nWHERE  dept_id = 10\n  OR   dept_id = 30',
        type: 'SELECT',
        desc: {
          ko: 'dept_id가 10 이거나 30인 행',
          en: 'Rows in dept_id is 10 OR 30',
        },
      },
    ],
  },
  {
    sectionKey: 'update',
    sql: 'UPDATE employees\nSET    salary = salary * 1.10\nWHERE  dept_id = 10',
    type: 'UPDATE',
    label: { ko: 'UPDATE 예시', en: 'UPDATE example' },
    variants: [
      {
        op: 'UPDATE employees',
        sql: 'UPDATE employees\nSET    salary = salary * 1.10\nWHERE  dept_id = 10',
        type: 'UPDATE',
        desc: {
          ko: 'dept_id가 10인 행의 salary 값에 1.10을 곱해서 저장',
          en: 'Update salary to the product of salary * 1.10 where dept_id is 10',
        },
      },
    ],
  },
  {
    sectionKey: 'delete',
    sql: 'DELETE FROM employees\nWHERE  salary < 4500',
    type: 'DELETE',
    label: { ko: 'DELETE 예시', en: 'DELETE example' },
    variants: [
      {
        op: 'DELETE FROM employees',
        sql: 'DELETE FROM employees\nWHERE  salary < 4500',
        type: 'DELETE',
        desc: {
          ko: 'salary가 4500보다 작은 행을 삭제합니다.',
          en: 'Delete the rows where salary is less than 4500.',
        },
      },
    ],
  },
  {
    sectionKey: 'orderby',
    sql: 'SELECT emp_id, first_name, dept_id, salary\nFROM   employees\nORDER BY salary ASC',
    type: 'SELECT',
    label: { ko: 'ORDER BY 예시', en: 'ORDER BY example' },
    variants: [
      {
        op: 'salary ASC',
        sql: 'SELECT emp_id, first_name, dept_id, salary\nFROM   employees\nORDER BY salary',
        type: 'SELECT',
        desc: {
          ko: 'salary 값 기준 오름차순으로 정렬, 컬럼 이름 뒤에 아무것도 적지 않으면 ASC가 기본값',
          en: 'Sort by salary ascending',
        },
      },
      {
        op: 'salary DESC',
        sql: 'SELECT emp_id, first_name, dept_id, salary\nFROM   employees\nORDER BY salary DESC',
        type: 'SELECT',
        desc: {
          ko: 'salary 값 기준 내림차순으로 정렬',
          en: 'Sort by salary descending',
        },
      },
      {
        op: 'dept_id, salary',
        sql: 'SELECT emp_id, first_name, dept_id, salary\nFROM   employees\nORDER BY dept_id ASC, salary DESC',
        type: 'SELECT',
        desc: {
          ko: 'dept_id 값으로 오름차순 정렬 후 → 같은 dept_id인 행들 내에서 salary 값으로 내림차순 정렬',
          en: 'Dept ascending, then salary descending within dept',
        },
      },
      {
        op: 'ORDER BY 2',
        sql: 'SELECT emp_id, first_name, dept_id, salary\nFROM   employees\nORDER BY 2',
        type: 'SELECT',
        desc: {
          ko: 'SELECT 절에 적힌 두 번째 컬럼(first_name) 기준 오름차순 정렬',
          en: 'Sort by the 2nd SELECT column (first_name) ascending',
        },
      },
      {
        op: 'NULLS LAST',
        sql: 'SELECT emp_id, first_name, manager_id\nFROM   employees\nORDER BY manager_id NULLS LAST',
        type: 'SELECT',
        desc: {
          ko: 'manager_id 오름차순 정렬 시 NULL 값을 맨 마지막으로 보냅니다. Oracle 기본값은 ASC일 때 NULL을 맨 뒤에 두지 않으므로, 명시적으로 NULLS LAST를 지정해야 합니다.',
          en: "Sort manager_id ascending, placing NULL values at the end. Oracle's default does not put NULLs last for ASC — specify NULLS LAST explicitly.",
        },
      },
      {
        op: 'NULLS FIRST',
        sql: 'SELECT emp_id, first_name, manager_id\nFROM   employees\nORDER BY manager_id NULLS FIRST',
        type: 'SELECT',
        desc: {
          ko: 'manager_id 오름차순 정렬 시 NULL 값을 맨 처음으로 보냅니다. Oracle 기본값은 DESC일 때 NULL을 맨 앞에 두므로, ASC에서 NULL을 앞으로 보내려면 NULLS FIRST를 명시해야 합니다.',
          en: 'Sort manager_id ascending, placing NULL values at the beginning. Specify NULLS FIRST explicitly when you want NULLs first in an ASC sort.',
        },
      },
    ],
  },
  {
    sectionKey: 'groupby',
    sql: 'SELECT dept_id, COUNT(*) AS cnt, AVG(salary) AS avg_sal\nFROM   employees\nGROUP BY dept_id',
    type: 'GROUPBY' as unknown as 'SELECT',
    label: { ko: 'GROUP BY 예시', en: 'GROUP BY example' },
    variants: [
      {
        op: 'COUNT',
        sql: 'SELECT dept_id, COUNT(*) AS cnt\nFROM   employees\nGROUP BY dept_id',
        type: 'GROUPBY' as unknown as 'SELECT',
        desc: { ko: '부서별 직원 수', en: 'Employee count per department' },
      },
      {
        op: 'AVG',
        sql: 'SELECT dept_id, AVG(salary) AS avg_sal\nFROM   employees\nGROUP BY dept_id',
        type: 'GROUPBY' as unknown as 'SELECT',
        desc: {
          ko: '부서별 평균 급여, GROUP BY에서 쓰이지 않은 컬럼 salary는 SELECT절에서 집계 함수 AVG와 함께 사용',
          en: 'Average salary per department',
        },
      },
      {
        op: 'SUM',
        sql: 'SELECT dept_id, SUM(salary) AS total_sal\nFROM   employees\nGROUP BY dept_id',
        type: 'GROUPBY' as unknown as 'SELECT',
        desc: { ko: '부서별 급여 합계', en: 'Total salary per department' },
      },
      {
        op: 'MAX / MIN',
        sql: 'SELECT dept_id, MAX(salary) AS max_sal, MIN(salary) AS min_sal\nFROM   employees\nGROUP BY dept_id',
        type: 'GROUPBY' as unknown as 'SELECT',
        desc: {
          ko: '부서별 최고·최저 급여',
          en: 'Max and min salary per department',
        },
      },
    ],
  },
  {
    sectionKey: 'having',
    sql: 'SELECT dept_id, COUNT(*) AS cnt\nFROM   employees\nGROUP BY dept_id\nHAVING COUNT(*) >= 3',
    type: 'GROUPBY' as unknown as 'SELECT',
    label: { ko: 'HAVING 예시', en: 'HAVING example' },
    variants: [
      {
        op: 'COUNT >= 3',
        sql: 'SELECT dept_id, COUNT(*) AS cnt\nFROM   employees\nGROUP BY dept_id\nHAVING COUNT(*) >= 3',
        type: 'GROUPBY' as unknown as 'SELECT',
        desc: {
          ko: '직원이 3명 이상인 부서만',
          en: 'Only departments with 3 or more employees',
        },
      },
      {
        op: 'AVG >= 6000',
        sql: 'SELECT dept_id, AVG(salary) AS avg_sal\nFROM   employees\nGROUP BY dept_id\nHAVING AVG(salary) >= 6000',
        type: 'GROUPBY' as unknown as 'SELECT',
        desc: {
          ko: '평균 급여가 6000 이상인 부서만',
          en: 'Only departments with avg salary ≥ 6000',
        },
      },
      {
        op: 'SUM >= 15000',
        sql: 'SELECT dept_id, SUM(salary) AS total_sal\nFROM   employees\nGROUP BY dept_id\nHAVING SUM(salary) >= 15000',
        type: 'GROUPBY' as unknown as 'SELECT',
        desc: {
          ko: '급여 합계가 15000 이상인 부서만',
          en: 'Only departments with total salary ≥ 15000',
        },
      },
    ],
  },
]
