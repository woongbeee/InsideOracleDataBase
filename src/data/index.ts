import type { Schema } from './types'
import { HR_SCHEMA } from './hrSchema'
import { CO_SCHEMA } from './coSchema'

export { HR_SCHEMA } from './hrSchema'
export { CO_SCHEMA } from './coSchema'
export type {
  Schema,
  SchemaTable,
  ColumnDef,
  ForeignKey,
  RowData,
} from './types'
export { EMPLOYEES, EMPLOYEE_COLUMNS, employeeCell } from './hr'
export type { Employee } from './hr'
export {
  getLargeDataset,
  getLargeTable,
  getAllLargeTables,
  getCardinalityRatio,
  recommendIndexType,
  generateLargeDataset,
} from './largeDataGenerator'
export type {
  LargeDataset,
  LargeTable,
  LargeColumn,
} from './largeDataGenerator'

export const SCHEMAS: Schema[] = [
  {
    name: 'HR',
    label: 'Human Resources',
    color: 'blue',
    tables: HR_SCHEMA,
  },
  {
    name: 'CO',
    label: 'Customer Orders',
    color: 'emerald',
    tables: CO_SCHEMA,
  },
]

export const SAMPLE_QUERIES = [
  'SELECT * FROM EMPLOYEES',
  'SELECT * FROM DEPARTMENTS',
  'SELECT * FROM ORDERS',
  'SELECT EMPLOYEE_ID, FIRST_NAME, SALARY FROM EMPLOYEES WHERE DEPARTMENT_ID = 60',
  'SELECT E.FIRST_NAME, D.DEPARTMENT_NAME FROM EMPLOYEES E JOIN DEPARTMENTS D ON E.DEPARTMENT_ID = D.DEPARTMENT_ID',
]
