// 쿼리 예시용 EMPLOYEES 데이터셋 — HR_SCHEMA(원본 스키마)에서 1회 파생.
//
// 앞으로 챕터에서 쿼리문 예시를 보여줄 때는 여기 EMPLOYEES / Employee 를 가져다 쓴다.
// 각 섹션이 매번 데이터 타입을 새로 정의하거나 컬럼 배열을 하드코딩하지 않도록,
// 공용 타입(Employee)과 컬럼 목록(EMPLOYEE_COLUMNS)을 이 파일에서 단일하게 제공한다.
//
// 컬럼명이 snake_case 인 이유: 예시 SQL 이 `SELECT emp_id, first_name ...` 처럼
// 소문자 snake_case 로 작성돼 있어서, 화면에 찍히는 헤더와 코드가 일치하도록 맞춘 것.

import { HR_SCHEMA } from './hrSchema'

// ── 공용 타입 ──────────────────────────────────────────────────────────────

/** 쿼리 예시에서 쓰는 직원 한 행. HR_SCHEMA.EMPLOYEES 의 축약 뷰. */
export interface Employee {
  emp_id: number
  first_name: string
  last_name: string
  dept_id: number
  salary: number
  job_title: string
  manager_id: number | null
}

/** EMPLOYEES 의 컬럼 순서 (표 헤더·SELECT * 순서의 단일 기준). */
export const EMPLOYEE_COLUMNS = [
  'emp_id',
  'first_name',
  'last_name',
  'dept_id',
  'salary',
  'job_title',
  'manager_id',
] as const satisfies readonly (keyof Employee)[]

// ── HR_SCHEMA → Employee 매핑 ──────────────────────────────────────────────

// JOB_ID(코드) → 화면에 보여줄 짧은 직함. 예시 표가 좁아서 원본 JOB_TITLE 대신 축약형을 쓴다.
const JOB_TITLE_MAP: Record<string, string> = {
  AD_PRES: 'President',
  AD_VP: 'VP',
  AD_ASST: 'Asst',
  FI_MGR: 'Finance Mgr',
  FI_ACCOUNT: 'Accountant',
  AC_MGR: 'Acctg Mgr',
  AC_ACCOUNT: 'Pub Accountant',
  SA_MAN: 'Sales Mgr',
  SA_REP: 'Sales Rep',
  PU_MAN: 'Purchasing Mgr',
  PU_CLERK: 'Purchasing Clerk',
  ST_MAN: 'Stock Mgr',
  ST_CLERK: 'Stock Clerk',
  SH_CLERK: 'Shipping Clerk',
  IT_PROG: 'IT Prog',
  MK_MAN: 'Marketing Mgr',
  MK_REP: 'Marketing Rep',
  HR_REP: 'HR Rep',
  PR_REP: 'PR Rep',
}

const hrEmployeesTable = HR_SCHEMA.find((t) => t.name === 'EMPLOYEES')!

/** 쿼리 예시용 직원 데이터. HR_SCHEMA 에서 파생된 읽기 전용 배열. */
export const EMPLOYEES: Employee[] = hrEmployeesTable.rows.map((r) => ({
  emp_id: r['EMPLOYEE_ID'] as number,
  first_name: r['FIRST_NAME'] as string,
  last_name: r['LAST_NAME'] as string,
  dept_id: r['DEPARTMENT_ID'] as number,
  salary: r['SALARY'] as number,
  job_title: JOB_TITLE_MAP[r['JOB_ID'] as string] ?? (r['JOB_ID'] as string),
  manager_id: r['MANAGER_ID'] as number | null,
}))

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

/** 한 셀 값을 표에 찍을 문자열로. null/undefined 는 'NULL'. */
export function employeeCell(emp: Employee, col: keyof Employee): string {
  return String(emp[col] ?? 'NULL')
}
