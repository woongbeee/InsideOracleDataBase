// ExecutionSection(SQL 실행 순서 시뮬레이터) 전용 데이터.
// 예시 쿼리 목록 + 각 쿼리의 실행 단계(steps) + 단계 색상.
// 공용 Employee/EMPLOYEES 는 @/data, SQL 파싱은 ./sqlEngine 을 쓴다.
import { EMPLOYEES, type Employee } from '@/data'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExampleQuery {
  id: string
  label: { ko: string; en: string }
  sql: string
  type: 'SELECT' | 'UPDATE' | 'DELETE' | 'MERGE'
  steps?: ExecStep[]
  overrideResult?: {
    columns: string[]
    rows: Record<string, unknown>[]
    summary?: { ko: string; en: string }
  }
  mergeData?: {
    sourceRows: Record<string, unknown>[]
    targetRows: Record<string, unknown>[]
    resultRows: Record<string, unknown>[]
    matchedIds: unknown[]
    insertedIds: unknown[]
    joinKey: string
  }
}

export interface ExecStep {
  id: string
  phase: string
  label: { ko: string; en: string }
  desc: { ko: string; en: string }
  hint?: { ko: string; en: string }
  color: string
  highlightClause?: string
}

// ── Execution step definitions ──────────────────────────────────────────────

export const SELECT_STEPS: ExecStep[] = [
  {
    id: 'from',
    phase: '① FROM',
    label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
    desc: {
      ko: 'Oracle이 가장 먼저 FROM 절을 처리합니다. 지정된 테이블(EMPLOYEES)을 식별하고 데이터를 읽을 준비를 합니다.',
      en: 'Oracle processes FROM first. It identifies the target table (EMPLOYEES) and prepares to read its data.',
    },
    color: 'violet',
    highlightClause: 'FROM',
  },
  {
    id: 'where',
    phase: '② WHERE',
    label: { ko: 'WHERE — 행 필터링', en: 'WHERE — Row filtering' },
    desc: {
      ko: 'FROM으로 가져온 각 행에 WHERE 조건을 적용합니다. 조건이 TRUE인 행만 다음 단계로 넘어갑니다.',
      en: 'Each row from FROM is evaluated against the WHERE condition. Only rows where the condition is TRUE proceed.',
    },
    color: 'orange',
    highlightClause: 'WHERE',
  },
  {
    id: 'select',
    phase: '③ SELECT',
    label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
    desc: {
      ko: '필터된 행에서 SELECT에 명시한 컬럼만 추출합니다. *는 모든 컬럼을 그대로 반환합니다.',
      en: 'From the filtered rows, only the columns listed in SELECT are projected. * returns all columns.',
    },
    color: 'blue',
    highlightClause: 'SELECT',
  },
  {
    id: 'result',
    phase: '④ 결과 반환',
    label: { ko: '결과 반환', en: 'Return results' },
    desc: {
      ko: '최종 결과 집합이 클라이언트(PGA)로 전달됩니다.',
      en: 'The final result set is returned to the client (PGA).',
    },
    color: 'emerald',
  },
]

export const UPDATE_STEPS: ExecStep[] = [
  {
    id: 'from',
    phase: '① FROM',
    label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
    desc: {
      ko: 'UPDATE 대상 테이블(EMPLOYEES)을 찾습니다.',
      en: 'Oracle finds the target table (EMPLOYEES).',
    },
    color: 'violet',
    highlightClause: 'FROM',
  },
  {
    id: 'where',
    phase: '② WHERE',
    label: { ko: 'WHERE — 대상 행 선택', en: 'WHERE — Target row selection' },
    desc: {
      ko: 'WHERE 조건에 맞는 행을 찾습니다. 찾은 행들이 수정 대상이 됩니다.',
      en: 'Oracle finds rows that match the WHERE condition. These rows will be modified.',
    },
    color: 'orange',
    highlightClause: 'WHERE',
  },
  {
    id: 'lock',
    phase: '③ Row Lock',
    label: { ko: 'Row Lock — 행 잠금', en: 'Row Lock — Row locking' },
    desc: {
      ko: '수정할 행에 자물쇠를 겁니다. 내가 수정하는 동안 다른 사람이 같은 행을 동시에 바꾸지 못하도록 막는 장치입니다.',
      en: 'A lock is placed on each row to be modified, preventing other users from changing the same row at the same time.',
    },
    hint: {
      ko: 'Row Lock: 데이터베이스가 여러 사용자가 동시에 같은 데이터를 수정할 때 충돌이 생기지 않도록 "지금 내가 쓰는 중"이라고 표시하는 장치입니다. 지금 자세히 몰라도 됩니다.',
      en: 'Row Lock: a mechanism that marks a row as "in use" to prevent two users from modifying it at the same moment. No need to know the details yet.',
    },
    color: 'rose',
  },
  {
    id: 'undo',
    phase: '④ 변경 전 값 저장',
    label: { ko: '변경 전 값 저장 (Undo)', en: 'Save old values (Undo)' },
    desc: {
      ko: '수정하기 전 원래 값을 따로 보관합니다. 나중에 "취소(ROLLBACK)"를 하면 이 값으로 되돌아갑니다.',
      en: 'The original values are saved before the change. If you run ROLLBACK later, Oracle uses this saved copy to undo the change.',
    },
    hint: {
      ko: 'Undo: "되돌리기용 메모"입니다. Oracle이 변경 전 데이터를 Undo 영역에 보관해두고, ROLLBACK 명령이 오면 이 메모를 보고 원래대로 복구합니다. 지금 자세히 몰라도 됩니다.',
      en: 'Undo: think of it as a "scratch note" of the old value. If ROLLBACK is issued, Oracle reads this note and restores the original data. No need to know the details yet.',
    },
    color: 'amber',
  },
  {
    id: 'set',
    phase: '⑤ SET 적용',
    label: { ko: 'SET — 값 변경', en: 'SET — Apply new values' },
    desc: {
      ko: 'SET 절의 계산식을 실행해 새 값을 메모리 위 데이터 블록에 씁니다.',
      en: 'The SET expression is calculated and the new value is written to the data block in memory.',
    },
    hint: {
      ko: 'Buffer Cache: Oracle이 디스크의 데이터를 빠르게 읽고 쓰기 위해 메모리에 올려두는 공간입니다. 실제 디스크에 반영되는 건 이후 단계입니다. 지금 자세히 몰라도 됩니다.',
      en: 'Buffer Cache: memory space where Oracle keeps data blocks for fast access. The disk is updated in a later step. No need to know the details yet.',
    },
    color: 'blue',
    highlightClause: 'SET',
  },
  {
    id: 'redo',
    phase: '⑥ 변경 이력 기록 (Redo)',
    label: { ko: 'Redo Log 기록', en: 'Write redo log' },
    desc: {
      ko: '변경 내용을 별도의 이력 파일에 기록합니다. 서버가 갑자기 꺼져도 이 이력을 보고 변경 사항을 복구할 수 있습니다.',
      en: 'The change is recorded in a separate history file. If the server crashes, Oracle reads this file to replay and recover the change.',
    },
    hint: {
      ko: 'Redo Log: "무슨 변경이 있었는지" 기록하는 장부입니다. 장애 후 재시작 시 Oracle이 이 장부를 보고 커밋된 변경 사항을 빠짐없이 복원합니다. 지금 자세히 몰라도 됩니다.',
      en: 'Redo Log: a journal of "what changed." After a crash, Oracle replays this journal to restore all committed changes. No need to know the details yet.',
    },
    color: 'emerald',
  },
]

export const DELETE_STEPS: ExecStep[] = [
  {
    id: 'from',
    phase: '① FROM',
    label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
    desc: {
      ko: 'DELETE 대상 테이블(EMPLOYEES)을 찾습니다.',
      en: 'Oracle finds the target table (EMPLOYEES).',
    },
    color: 'violet',
    highlightClause: 'FROM',
  },
  {
    id: 'where',
    phase: '② WHERE',
    label: {
      ko: 'WHERE — 삭제 대상 선택',
      en: 'WHERE — Select rows to delete',
    },
    desc: {
      ko: 'WHERE 조건에 맞는 행을 찾습니다. 찾은 행들이 삭제 대상이 됩니다.',
      en: 'Oracle finds rows that match the WHERE condition. These rows will be deleted.',
    },
    color: 'orange',
    highlightClause: 'WHERE',
  },
  {
    id: 'lock',
    phase: '③ Row Lock',
    label: { ko: 'Row Lock — 행 잠금', en: 'Row Lock — Row locking' },
    desc: {
      ko: '삭제할 행에 자물쇠를 겁니다. 내가 삭제하는 동안 다른 사람이 같은 행을 수정하지 못하도록 막습니다.',
      en: 'A lock is placed on each row to be deleted, preventing other users from modifying those rows at the same time.',
    },
    hint: {
      ko: 'Row Lock: 데이터베이스가 여러 사용자가 동시에 같은 데이터를 바꿀 때 충돌이 생기지 않도록 "지금 내가 쓰는 중"이라고 표시하는 장치입니다. 지금 자세히 몰라도 됩니다.',
      en: 'Row Lock: a mechanism that marks a row as "in use" so two users cannot change it at the same moment. No need to know the details yet.',
    },
    color: 'rose',
  },
  {
    id: 'undo',
    phase: '④ 삭제 전 행 저장 (Undo)',
    label: {
      ko: '삭제 전 행 저장 (Undo)',
      en: 'Save row before delete (Undo)',
    },
    desc: {
      ko: '삭제하기 전 행 전체를 따로 보관합니다. 나중에 "취소(ROLLBACK)"를 하면 이 복사본으로 행이 다시 살아납니다.',
      en: 'A copy of the entire row is saved before deletion. If you run ROLLBACK, Oracle uses this copy to bring the row back.',
    },
    hint: {
      ko: 'Undo: "되돌리기용 메모"입니다. Oracle이 삭제 전 데이터를 Undo 영역에 보관해두고, ROLLBACK 명령이 오면 이 메모를 보고 원래대로 복구합니다. 지금 자세히 몰라도 됩니다.',
      en: 'Undo: a "before" snapshot of the data. If ROLLBACK is issued, Oracle reads this snapshot and restores the deleted row. No need to know the details yet.',
    },
    color: 'amber',
  },
  {
    id: 'delete',
    phase: '⑤ 행 삭제',
    label: { ko: '행 삭제 마킹', en: 'Mark rows as deleted' },
    desc: {
      ko: '해당 행에 "삭제됨" 표시를 합니다. 실제 디스크 공간은 바로 비워지지 않고 나중에 정리됩니다.',
      en: 'Each row is marked as deleted. The actual disk space is not freed immediately — it is reclaimed later.',
    },
    hint: {
      ko: 'delete flag: Oracle은 삭제 즉시 디스크 공간을 회수하지 않고 행에 "삭제됨" 표시만 합니다. 공간 재사용은 이후 내부 작업(예: 새 행 삽입 시)에서 처리됩니다. 지금 자세히 몰라도 됩니다.',
      en: 'delete flag: Oracle marks the row instead of freeing space immediately. The space is reused later when new rows are inserted. No need to know the details yet.',
    },
    color: 'blue',
  },
  {
    id: 'redo',
    phase: '⑥ 변경 이력 기록 (Redo)',
    label: { ko: 'Redo Log 기록', en: 'Write redo log' },
    desc: {
      ko: '삭제 내용을 이력 파일에 기록합니다. 서버가 갑자기 꺼져도 이 이력으로 복구할 수 있습니다.',
      en: 'The deletion is recorded in a history file so Oracle can recover it if the server crashes.',
    },
    hint: {
      ko: 'Redo Log: "무슨 변경이 있었는지" 기록하는 장부입니다. 장애 후 재시작 시 Oracle이 이 장부를 보고 커밋된 변경 사항을 복원합니다. 지금 자세히 몰라도 됩니다.',
      en: 'Redo Log: a journal of "what changed." After a crash, Oracle replays this journal to restore committed changes. No need to know the details yet.',
    },
    color: 'emerald',
  },
]

// ── Color helpers ──────────────────────────────────────────────────────────

export const STEP_COLOR: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  violet: {
    bg: 'bg-purple/5',
    text: 'text-purple',
    border: 'border-purple/30',
    dot: 'bg-purple',
  },
  orange: {
    bg: 'bg-amber/10',
    text: 'text-amber',
    border: 'border-amber/30',
    dot: 'bg-amber',
  },
  blue: {
    bg: 'bg-blue/10',
    text: 'text-blue',
    border: 'border-blue/30',
    dot: 'bg-blue',
  },
  emerald: {
    bg: 'bg-green/10',
    text: 'text-green',
    border: 'border-green/30',
    dot: 'bg-green',
  },
  rose: {
    bg: 'bg-red/10',
    text: 'text-red',
    border: 'border-red/30',
    dot: 'bg-red',
  },
  amber: {
    bg: 'bg-amber/5',
    text: 'text-amber',
    border: 'border-amber/30',
    dot: 'bg-amber',
  },
}

// ── Example queries ────────────────────────────────────────────────────────

function buildExampleQueries(emps: Employee[]): ExampleQuery[] {
  const dept60 = emps.filter((e) => e.dept_id === 60)
  const dept60Names = dept60.map((e) => e.first_name).join(', ')
  const dept60Count = dept60.length

  const highSal = emps.filter((e) => e.salary >= 12000)
  const highSalSample = highSal
    .slice(0, 4)
    .map((e) => `${e.first_name} ${e.last_name}(${e.salary})`)
    .join(', ')

  const kNames = emps
    .filter((e) => e.last_name.startsWith('K'))
    .map((e) => e.last_name)
  const kNamesStr = [...new Set(kNames)].join(', ')
  const kCount = emps.filter((e) => e.last_name.startsWith('K')).length

  const dept60ForUpdate = dept60
  const updateSalaryList = dept60ForUpdate
    .slice(0, 3)
    .map((e) => `${e.first_name} ${e.salary} → ${Math.round(e.salary * 1.1)}`)
    .join(', ')

  const deleteThreshold = 4500
  const deletable = emps.filter((e) => e.salary < deleteThreshold)
  const deleteSample = deletable
    .slice(0, 3)
    .map((e) => `${e.first_name} ${e.last_name}(${e.salary})`)
    .join(', ')

  const totalCount = emps.length

  return [
    {
      id: 'q1',
      label: { ko: '전체 조회', en: 'Select all' },
      sql: 'SELECT * FROM employees',
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'Oracle이 가장 먼저 FROM 절을 처리합니다. 지정된 테이블 EMPLOYEES를 식별하고 데이터를 읽을 준비를 합니다.',
            en: 'Oracle processes FROM first. It identifies the target table EMPLOYEES and prepares to read its data.',
          },
          color: 'violet',
        },
        {
          id: 'select',
          phase: '② SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: 'WHERE 절이 없으므로 모든 행이 그대로 넘어옵니다. SELECT *이므로 emp_id, first_name, last_name, dept_id, salary, job_title, manager_id 전체 7개 컬럼을 반환합니다.',
            en: 'No WHERE clause — all rows proceed. SELECT * returns all 7 columns: emp_id, first_name, last_name, dept_id, salary, job_title, manager_id.',
          },
          color: 'blue',
        },
        {
          id: 'result',
          phase: '③ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: `${totalCount}개 행 전체가 최종 결과 집합으로 클라이언트(PGA)에 전달됩니다.`,
            en: `All ${totalCount} rows are returned to the client (PGA) as the final result set.`,
          },
          color: 'emerald',
        },
      ],
    },
    {
      id: 'q2',
      label: { ko: '부서 60 조회', en: 'Dept 60 filter' },
      sql: 'SELECT emp_id, first_name, salary\nFROM employees\nWHERE dept_id = 60',
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'EMPLOYEES 테이블을 식별하고 데이터를 읽을 준비를 합니다.',
            en: 'Oracle identifies EMPLOYEES and prepares to read its data.',
          },
          color: 'violet',
        },
        {
          id: 'where',
          phase: '② WHERE',
          label: { ko: 'WHERE — 행 필터링', en: 'WHERE — Row filter' },
          desc: {
            ko: `각 행에 dept_id = 60 조건을 적용합니다. IT 부서 소속인 ${dept60Names} ${dept60Count}개 행만 다음 단계로 넘어갑니다.`,
            en: `dept_id = 60 is evaluated for each row. Only the ${dept60Count} IT department rows (${dept60Names}) pass through.`,
          },
          color: 'orange',
        },
        {
          id: 'select',
          phase: '③ SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: `필터된 ${dept60Count}개 행에서 emp_id, first_name, salary 3개 컬럼만 추출합니다. 나머지 컬럼(last_name, dept_id 등)은 이 단계에서 제외됩니다.`,
            en: `Only emp_id, first_name, and salary are projected from the ${dept60Count} filtered rows. Other columns are dropped here.`,
          },
          color: 'blue',
        },
        {
          id: 'result',
          phase: '④ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: `${dept60Count}개 행, 3개 컬럼의 결과 집합이 클라이언트에 전달됩니다.`,
            en: `A result set of ${dept60Count} rows × 3 columns is returned to the client.`,
          },
          color: 'emerald',
        },
      ],
    },
    {
      id: 'q3',
      label: { ko: '고급여 조회', en: 'High salary' },
      sql: 'SELECT emp_id, first_name, last_name, salary\nFROM employees\nWHERE salary >= 12000',
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'EMPLOYEES 테이블을 식별하고 데이터를 읽을 준비를 합니다.',
            en: 'Oracle identifies EMPLOYEES and prepares to read its data.',
          },
          color: 'violet',
        },
        {
          id: 'where',
          phase: '② WHERE',
          label: { ko: 'WHERE — 행 필터링', en: 'WHERE — Row filter' },
          desc: {
            ko: `각 행에 salary >= 12000 조건을 적용합니다. ${highSalSample} 등 고액 연봉자 행들이 통과합니다.`,
            en: `salary >= 12000 is evaluated for each row. High earners such as ${highSalSample} pass.`,
          },
          color: 'orange',
        },
        {
          id: 'select',
          phase: '③ SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: '필터된 행에서 emp_id, first_name, last_name, salary 4개 컬럼만 추출합니다.',
            en: 'emp_id, first_name, last_name, and salary are projected from the filtered rows.',
          },
          color: 'blue',
        },
        {
          id: 'result',
          phase: '④ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: '조건을 통과한 행들과 4개 컬럼의 결과 집합이 클라이언트에 전달됩니다.',
            en: 'The matching rows with 4 columns are returned to the client.',
          },
          color: 'emerald',
        },
      ],
    },
    {
      id: 'q4',
      label: { ko: '이름 패턴 조회', en: 'LIKE pattern' },
      sql: "SELECT emp_id, first_name, last_name\nFROM employees\nWHERE last_name LIKE 'K%'",
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'EMPLOYEES 테이블을 식별하고 데이터를 읽을 준비를 합니다.',
            en: 'Oracle identifies EMPLOYEES and prepares to read its data.',
          },
          color: 'violet',
        },
        {
          id: 'where',
          phase: '② WHERE',
          label: { ko: 'WHERE — 행 필터링', en: 'WHERE — Row filter' },
          desc: {
            ko: `각 행에 last_name LIKE 'K%' 조건을 적용합니다. last_name이 'K'로 시작하는 ${kNamesStr} ${kCount}개 행이 통과합니다.`,
            en: `last_name LIKE 'K%' is evaluated for each row. ${kNamesStr} (last names starting with 'K') — ${kCount} rows pass.`,
          },
          color: 'orange',
        },
        {
          id: 'select',
          phase: '③ SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: `필터된 ${kCount}개 행에서 emp_id, first_name, last_name 3개 컬럼만 추출합니다.`,
            en: `emp_id, first_name, and last_name are projected from the ${kCount} filtered rows.`,
          },
          color: 'blue',
        },
        {
          id: 'result',
          phase: '④ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: `${kCount}개 행, 3개 컬럼의 결과 집합이 클라이언트에 전달됩니다.`,
            en: `A result set of ${kCount} rows × 3 columns is returned to the client.`,
          },
          color: 'emerald',
        },
      ],
    },
    {
      id: 'q5',
      label: { ko: 'UPDATE 급여 인상', en: 'UPDATE salary' },
      sql: 'UPDATE employees\nSET salary = salary * 1.10\nWHERE dept_id = 60',
      type: 'UPDATE',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'UPDATE 대상 테이블 EMPLOYEES를 찾습니다.',
            en: 'Oracle finds the target table EMPLOYEES.',
          },
          color: 'violet',
        },
        {
          id: 'where',
          phase: '② WHERE',
          label: {
            ko: 'WHERE — 대상 행 선택',
            en: 'WHERE — Target row selection',
          },
          desc: {
            ko: `dept_id = 60 조건으로 IT 부서 수정 대상 행을 찾습니다. ${dept60Names} ${dept60Count}개 행이 선택됩니다.`,
            en: `dept_id = 60 identifies IT department rows to modify. ${dept60Names} — ${dept60Count} rows are selected.`,
          },
          color: 'orange',
        },
        {
          id: 'lock',
          phase: '③ Row Lock',
          label: { ko: 'Row Lock — 행 잠금', en: 'Row Lock — Row locking' },
          desc: {
            ko: `선택된 ${dept60Count}개 행에 자물쇠를 겁니다. 내가 수정하는 동안 다른 사람이 같은 행을 동시에 바꾸지 못하도록 막습니다.`,
            en: `A lock is placed on all ${dept60Count} rows so no one else can modify them while this update is in progress.`,
          },
          hint: {
            ko: 'Row Lock: 데이터베이스가 여러 사용자가 동시에 같은 데이터를 수정할 때 충돌이 생기지 않도록 "지금 내가 쓰는 중"이라고 표시하는 장치입니다. 지금 자세히 몰라도 됩니다.',
            en: 'Row Lock: a mechanism that marks a row as "in use" to prevent two users from modifying it at the same moment. No need to know the details yet.',
          },
          color: 'rose',
        },
        {
          id: 'undo',
          phase: '④ 변경 전 값 저장 (Undo)',
          label: { ko: '변경 전 값 저장 (Undo)', en: 'Save old values (Undo)' },
          desc: {
            ko: `수정하기 전 salary 값(${updateSalaryList.split(' → ').join(' ')})을 따로 보관합니다.`,
            en: `Original salary values (${dept60ForUpdate
              .slice(0, 3)
              .map((e) => `${e.first_name} ${e.salary}`)
              .join(', ')}) are saved before modification.`,
          },
          hint: {
            ko: 'Undo: "되돌리기용 메모"입니다. Oracle이 변경 전 데이터를 Undo 영역에 보관해두고, ROLLBACK 명령이 오면 이 메모를 보고 원래대로 복구합니다. 지금 자세히 몰라도 됩니다.',
            en: 'Undo: think of it as a "scratch note" of the old value. If ROLLBACK is issued, Oracle reads this note and restores the original data. No need to know the details yet.',
          },
          color: 'amber',
        },
        {
          id: 'set',
          phase: '⑤ SET 적용',
          label: { ko: 'SET — 값 변경', en: 'SET — Apply new values' },
          desc: {
            ko: `salary * 1.10 계산을 실행해 새 값을 메모리에 씁니다. ${updateSalaryList} 등.`,
            en: `salary * 1.10 is calculated and written to memory. ${updateSalaryList}, etc.`,
          },
          color: 'blue',
        },
        {
          id: 'redo',
          phase: '⑥ 변경 이력 기록 (Redo)',
          label: { ko: 'Redo Log 기록', en: 'Write redo log' },
          desc: {
            ko: `${dept60Count}개 행의 변경 내용을 이력 파일에 기록합니다. 서버가 갑자기 꺼져도 이 이력을 보고 변경 사항을 복구할 수 있습니다.`,
            en: `All ${dept60Count} row changes are recorded in a history file. If the server crashes, Oracle uses this file to recover the changes.`,
          },
          hint: {
            ko: 'Redo Log: "무슨 변경이 있었는지" 기록하는 장부입니다. 장애 후 재시작 시 Oracle이 이 장부를 보고 커밋된 변경 사항을 복원합니다. 지금 자세히 몰라도 됩니다.',
            en: 'Redo Log: a journal of "what changed." After a crash, Oracle replays this journal to restore committed changes. No need to know the details yet.',
          },
          color: 'emerald',
        },
      ],
    },
    {
      id: 'q6',
      label: { ko: 'DELETE 저급여 삭제', en: 'DELETE low salary' },
      sql: 'DELETE FROM employees\nWHERE salary < 4500',
      type: 'DELETE',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'DELETE 대상 테이블 EMPLOYEES를 찾습니다.',
            en: 'Oracle finds the target table EMPLOYEES.',
          },
          color: 'violet',
        },
        {
          id: 'where',
          phase: '② WHERE',
          label: {
            ko: 'WHERE — 삭제 대상 선택',
            en: 'WHERE — Select rows to delete',
          },
          desc: {
            ko: `salary < 4500 조건으로 삭제 대상 행을 찾습니다. ${deleteSample} 등 조건을 만족하는 행들이 선택됩니다.`,
            en: `salary < 4500 identifies the rows to delete. Rows such as ${deleteSample} are selected.`,
          },
          color: 'orange',
        },
        {
          id: 'lock',
          phase: '③ Row Lock',
          label: { ko: 'Row Lock — 행 잠금', en: 'Row Lock — Row locking' },
          desc: {
            ko: '삭제 대상 행들에 자물쇠를 겁니다. 내가 삭제하는 동안 다른 사람이 이 행들을 수정하지 못하도록 막습니다.',
            en: 'Locks are placed on each row to be deleted, preventing others from modifying them while the delete is in progress.',
          },
          hint: {
            ko: 'Row Lock: 데이터베이스가 여러 사용자가 동시에 같은 데이터를 바꿀 때 충돌이 생기지 않도록 "지금 내가 쓰는 중"이라고 표시하는 장치입니다. 지금 자세히 몰라도 됩니다.',
            en: 'Row Lock: a mechanism that marks a row as "in use" so two users cannot change it at the same moment. No need to know the details yet.',
          },
          color: 'rose',
        },
        {
          id: 'undo',
          phase: '④ 삭제 전 행 저장 (Undo)',
          label: {
            ko: '삭제 전 행 저장 (Undo)',
            en: 'Save row before delete (Undo)',
          },
          desc: {
            ko: '삭제 대상 행 전체를 따로 보관합니다. 나중에 "취소(ROLLBACK)"를 하면 이 복사본으로 행들이 다시 살아납니다.',
            en: 'Full copies of all rows to be deleted are saved. If ROLLBACK is run, Oracle uses these copies to restore the rows.',
          },
          hint: {
            ko: 'Undo: "되돌리기용 메모"입니다. Oracle이 삭제 전 데이터를 Undo 영역에 보관해두고, ROLLBACK 명령이 오면 이 메모를 보고 원래대로 복구합니다. 지금 자세히 몰라도 됩니다.',
            en: 'Undo: a "before" snapshot of the data. If ROLLBACK is issued, Oracle reads this snapshot and restores the deleted rows. No need to know the details yet.',
          },
          color: 'amber',
        },
        {
          id: 'delete',
          phase: '⑤ 행 삭제',
          label: { ko: '행 삭제 마킹', en: 'Mark rows as deleted' },
          desc: {
            ko: '대상 행들에 "삭제됨" 표시를 합니다. 실제 디스크 공간은 바로 비워지지 않고 나중에 정리됩니다.',
            en: 'Each row is marked as deleted. The actual disk space is not freed right away — it is cleaned up later.',
          },
          hint: {
            ko: 'delete flag: Oracle은 삭제 즉시 디스크 공간을 회수하지 않고 행에 "삭제됨" 표시만 합니다. 공간 재사용은 이후 내부 작업(예: 새 행 삽입 시)에서 처리됩니다. 지금 자세히 몰라도 됩니다.',
            en: 'delete flag: Oracle marks the row instead of freeing space immediately. The space is reused later when new rows are inserted. No need to know the details yet.',
          },
          color: 'blue',
        },
        {
          id: 'redo',
          phase: '⑥ 변경 이력 기록 (Redo)',
          label: { ko: 'Redo Log 기록', en: 'Write redo log' },
          desc: {
            ko: '삭제 내용을 이력 파일에 기록합니다. 서버가 갑자기 꺼져도 이 이력으로 복구할 수 있습니다.',
            en: 'The deletion is recorded in a history file so Oracle can recover it if the server crashes.',
          },
          hint: {
            ko: 'Redo Log: "무슨 변경이 있었는지" 기록하는 장부입니다. 장애 후 재시작 시 Oracle이 이 장부를 보고 커밋된 변경 사항을 복원합니다. 지금 자세히 몰라도 됩니다.',
            en: 'Redo Log: a journal of "what changed." After a crash, Oracle replays this journal to restore committed changes. No need to know the details yet.',
          },
          color: 'emerald',
        },
      ],
    },
    {
      id: 'q7',
      label: {
        ko: 'GROUP BY + HAVING + ORDER BY',
        en: 'GROUP BY + HAVING + ORDER BY',
      },
      sql: 'SELECT dept_id, COUNT(*) AS cnt, AVG(salary) AS avg_sal\nFROM   employees\nWHERE  salary >= 5000\nGROUP BY dept_id\nHAVING COUNT(*) >= 2\nORDER BY avg_sal DESC',
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'EMPLOYEES 테이블을 식별하고 전체 행을 읽어 들입니다.',
            en: 'Oracle identifies EMPLOYEES and reads all rows into the work area.',
          },
          color: 'violet',
        },
        {
          id: 'where',
          phase: '② WHERE',
          label: { ko: 'WHERE — 행 필터링', en: 'WHERE — Row filter' },
          desc: {
            ko: 'salary >= 5000 조건으로 각 행을 평가합니다. 조건을 만족하지 않는 행은 이 단계에서 제거됩니다.',
            en: 'Each row is evaluated against salary >= 5000. Rows that fail the condition are discarded here.',
          },
          color: 'orange',
        },
        {
          id: 'groupby',
          phase: '③ GROUP BY',
          label: { ko: 'GROUP BY — 그룹화', en: 'GROUP BY — Grouping' },
          desc: {
            ko: 'WHERE를 통과한 행들을 dept_id 값으로 묶습니다. 각 그룹 안에서 COUNT(*)와 AVG(salary)가 계산됩니다.',
            en: 'Rows that passed WHERE are grouped by dept_id. COUNT(*) and AVG(salary) are computed within each group.',
          },
          color: 'blue',
        },
        {
          id: 'having',
          phase: '④ HAVING',
          label: { ko: 'HAVING — 그룹 필터링', en: 'HAVING — Group filter' },
          desc: {
            ko: 'GROUP BY로 만들어진 그룹에 COUNT(*) >= 2 조건을 적용합니다. 그룹이 조건을 만족하지 않으면 결과에서 제외됩니다. WHERE가 개별 행을 거른다면 HAVING은 그룹 전체를 거릅니다.',
            en: 'The condition COUNT(*) >= 2 is applied to each group produced by GROUP BY. Groups that fail are excluded. WHERE filters individual rows; HAVING filters entire groups.',
          },
          color: 'rose',
        },
        {
          id: 'select',
          phase: '⑤ SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: 'HAVING을 통과한 그룹에서 dept_id, cnt, avg_sal 컬럼만 추출합니다. 집계 결과에 별칭(AS)이 붙는 것도 이 단계입니다.',
            en: 'dept_id, cnt, and avg_sal are projected from the surviving groups. Column aliases (AS) are assigned at this step.',
          },
          color: 'blue',
        },
        {
          id: 'orderby',
          phase: '⑥ ORDER BY',
          label: { ko: 'ORDER BY — 정렬', en: 'ORDER BY — Sort' },
          desc: {
            ko: 'SELECT가 끝난 결과를 avg_sal 내림차순으로 정렬합니다. ORDER BY는 SELECT 이후에 실행되므로 SELECT에서 만든 별칭(avg_sal)을 그대로 참조할 수 있습니다.',
            en: 'The projected result is sorted by avg_sal descending. Because ORDER BY runs after SELECT, it can reference the alias avg_sal defined in SELECT.',
          },
          color: 'amber',
        },
        {
          id: 'result',
          phase: '⑦ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: '최종 결과 집합이 클라이언트로 전달됩니다.',
            en: 'The final result set is returned to the client.',
          },
          color: 'emerald',
        },
      ],
    },
    {
      id: 'q8',
      label: {
        ko: '윈도우 함수 (RANK + SUM OVER)',
        en: 'Window fn (RANK + SUM OVER)',
      },
      sql: 'SELECT first_name, dept_id, salary,\n       RANK() OVER\n         (PARTITION BY dept_id\n          ORDER BY salary DESC) AS rnk,\n       SUM(salary) OVER\n         (PARTITION BY dept_id) AS dept_total\nFROM   employees\nWHERE  dept_id IN (60, 80)\nORDER BY dept_id, rnk',
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'EMPLOYEES 테이블 전체를 읽어 들입니다.',
            en: 'All rows of EMPLOYEES are read.',
          },
          color: 'violet',
        },
        {
          id: 'where',
          phase: '② WHERE',
          label: { ko: 'WHERE — 행 필터링', en: 'WHERE — Row filter' },
          desc: {
            ko: 'dept_id IN (60, 80) 조건으로 해당 부서 직원만 남깁니다. 윈도우 함수는 WHERE 이후에 실행되므로, 제거된 행은 RANK·SUM 계산에도 포함되지 않습니다.',
            en: 'Only employees in dept_id 60 and 80 pass the filter. Window functions run after WHERE, so excluded rows are not counted in RANK or SUM either.',
          },
          color: 'orange',
        },
        {
          id: 'window_partition',
          phase: '③ 윈도우 파티셔닝',
          label: { ko: '윈도우 파티셔닝', en: 'Window partitioning' },
          desc: {
            ko: 'WHERE를 통과한 행들을 PARTITION BY dept_id 기준으로 가상의 파티션으로 나눕니다. GROUP BY와 달리 행이 합쳐지지 않고 그대로 유지됩니다.',
            en: 'Rows that passed WHERE are divided into virtual partitions by PARTITION BY dept_id. Unlike GROUP BY, rows are not collapsed — they remain individual.',
          },
          color: 'blue',
        },
        {
          id: 'window_calc',
          phase: '④ 윈도우 함수 계산',
          label: { ko: '윈도우 함수 계산', en: 'Window function evaluation' },
          desc: {
            ko: '각 파티션 안에서 ORDER BY salary DESC로 정렬한 뒤 RANK()를 계산합니다. 동시에 SUM(salary) OVER (PARTITION BY dept_id)로 파티션 내 급여 합계를 각 행에 붙입니다. 이 두 계산은 행을 줄이지 않고 각 행에 컬럼을 추가하는 방식으로 동작합니다.',
            en: 'Within each partition, rows are sorted by salary DESC and RANK() is assigned. Simultaneously, SUM(salary) OVER (PARTITION BY dept_id) attaches the partition total to every row. Both operations add columns without reducing rows.',
          },
          color: 'blue',
        },
        {
          id: 'select',
          phase: '⑤ SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: 'first_name, dept_id, salary, rnk, dept_total 컬럼을 추출합니다. 윈도우 함수 결과(rnk, dept_total)도 일반 컬럼과 동일하게 SELECT에서 참조할 수 있습니다.',
            en: 'first_name, dept_id, salary, rnk, and dept_total are projected. Window function results (rnk, dept_total) are referenced just like regular columns.',
          },
          color: 'blue',
        },
        {
          id: 'orderby',
          phase: '⑥ ORDER BY',
          label: { ko: 'ORDER BY — 정렬', en: 'ORDER BY — Sort' },
          desc: {
            ko: '최종 결과를 dept_id 오름차순, 같은 부서 내에서는 rnk 오름차순으로 정렬합니다. ORDER BY는 SELECT 이후에 실행되므로 별칭 rnk를 참조할 수 있습니다.',
            en: 'The final result is sorted by dept_id ascending, then rnk ascending within each department. ORDER BY runs after SELECT and can reference the alias rnk.',
          },
          color: 'amber',
        },
        {
          id: 'result',
          phase: '⑦ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: '최종 결과 집합이 클라이언트로 전달됩니다.',
            en: 'The final result set is returned to the client.',
          },
          color: 'emerald',
        },
      ],
      overrideResult: {
        columns: ['first_name', 'dept_id', 'salary', 'rnk', 'dept_total'],
        rows: [
          {
            first_name: 'Alexander',
            dept_id: 60,
            salary: 9000,
            rnk: 1,
            dept_total: 24000,
          },
          {
            first_name: 'Bruce',
            dept_id: 60,
            salary: 6000,
            rnk: 2,
            dept_total: 24000,
          },
          {
            first_name: 'David',
            dept_id: 60,
            salary: 4800,
            rnk: 3,
            dept_total: 24000,
          },
          {
            first_name: 'Diana',
            dept_id: 60,
            salary: 4200,
            rnk: 4,
            dept_total: 24000,
          },
          {
            first_name: 'John',
            dept_id: 80,
            salary: 14000,
            rnk: 1,
            dept_total: 24000,
          },
          {
            first_name: 'Peter',
            dept_id: 80,
            salary: 10000,
            rnk: 2,
            dept_total: 24000,
          },
        ],
        summary: { ko: '6개 행 반환', en: '6 rows returned' },
      },
    },
    {
      id: 'q9',
      label: {
        ko: 'Frame 절 (누적합 + 이동평균)',
        en: 'Frame clause (running sum + moving avg)',
      },
      sql: 'SELECT first_name, salary,\n       SUM(salary) OVER (\n         ORDER BY emp_id\n         ROWS BETWEEN UNBOUNDED PRECEDING\n                  AND CURRENT ROW\n       ) AS running_sum,\n       ROUND(AVG(salary) OVER (\n         ORDER BY emp_id\n         ROWS BETWEEN 1 PRECEDING\n                  AND 1 FOLLOWING\n       )) AS moving_avg\nFROM   employees\nWHERE  dept_id IN (60, 80)\nORDER BY emp_id',
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'EMPLOYEES 테이블 전체를 읽어 들입니다.',
            en: 'All rows of EMPLOYEES are read.',
          },
          color: 'violet',
        },
        {
          id: 'where',
          phase: '② WHERE (없음)',
          label: { ko: 'WHERE — 없음', en: 'WHERE — (none)' },
          desc: {
            ko: 'dept_id IN (60, 80) 조건으로 IT(60)·Sales(80) 부서 직원만 남깁니다.',
            en: 'dept_id IN (60, 80) keeps only IT and Sales department employees.',
          },
          color: 'orange',
        },
        {
          id: 'window_order',
          phase: '③ 윈도우 ORDER BY',
          label: { ko: '윈도우 내 정렬', en: 'Intra-window sort' },
          desc: {
            ko: '두 윈도우 함수 모두 ORDER BY emp_id를 사용합니다. Oracle은 WHERE를 통과한 행들을 emp_id 오름차순으로 정렬하여 frame 경계 계산의 기준을 잡습니다.',
            en: 'Both window functions specify ORDER BY emp_id. Oracle sorts the rows that passed WHERE by emp_id ascending to establish the reference for frame boundary calculations.',
          },
          color: 'blue',
        },
        {
          id: 'frame_running',
          phase: '④ Frame 계산 — 누적합',
          label: { ko: 'Frame 계산 — 누적합', en: 'Frame calc — running sum' },
          desc: {
            ko: 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW: 현재 행을 기준으로 파티션의 첫 행(UNBOUNDED PRECEDING)부터 현재 행(CURRENT ROW)까지를 frame으로 잡고 SUM을 계산합니다. 행마다 frame이 한 행씩 늘어나므로 running_sum이 누적됩니다.',
            en: 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW: the frame spans from the first row of the partition to the current row. Each successive row extends the frame by one, so running_sum accumulates.',
          },
          color: 'blue',
        },
        {
          id: 'frame_moving',
          phase: '⑤ Frame 계산 — 이동평균',
          label: { ko: 'Frame 계산 — 이동평균', en: 'Frame calc — moving avg' },
          desc: {
            ko: 'ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING: 현재 행 기준 앞 1행, 현재 행, 뒤 1행, 총 최대 3개 행을 frame으로 잡고 AVG를 계산합니다. 파티션 경계(첫 행·마지막 행)에서는 frame이 자동으로 줄어들어 2행만 평균냅니다.',
            en: 'ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING: the frame is up to 3 rows — one before, current, one after. At the partition boundaries (first and last rows) the frame shrinks to 2 rows.',
          },
          color: 'blue',
        },
        {
          id: 'select',
          phase: '⑥ SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: 'first_name, salary, running_sum, moving_avg 컬럼을 추출합니다. ROUND()는 SELECT 단계에서 avg 결과에 적용됩니다.',
            en: 'first_name, salary, running_sum, and moving_avg are projected. ROUND() is applied to the avg result at this step.',
          },
          color: 'blue',
        },
        {
          id: 'orderby',
          phase: '⑦ ORDER BY',
          label: { ko: 'ORDER BY — 정렬', en: 'ORDER BY — Sort' },
          desc: {
            ko: '최종 결과를 emp_id 오름차순으로 정렬합니다. 윈도우 함수 안의 ORDER BY emp_id와 별개입니다. 윈도우 ORDER BY는 frame 계산 기준이고, 이 ORDER BY는 최종 출력 순서를 결정합니다.',
            en: 'The result is sorted by emp_id ascending for final output. This ORDER BY is independent of the ORDER BY inside the window functions — the window ORDER BY sets the frame reference; this one sets the output order.',
          },
          color: 'amber',
        },
        {
          id: 'result',
          phase: '⑧ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: '최종 결과 집합이 클라이언트로 전달됩니다.',
            en: 'The final result set is returned to the client.',
          },
          color: 'emerald',
        },
      ],
      overrideResult: {
        columns: ['first_name', 'salary', 'running_sum', 'moving_avg'],
        rows: [
          {
            first_name: 'Alexander',
            salary: 9000,
            running_sum: 9000,
            moving_avg: 7500,
          },
          {
            first_name: 'Bruce',
            salary: 6000,
            running_sum: 15000,
            moving_avg: 6600,
          },
          {
            first_name: 'David',
            salary: 4800,
            running_sum: 19800,
            moving_avg: 5000,
          },
          {
            first_name: 'Diana',
            salary: 4200,
            running_sum: 24000,
            moving_avg: 7667,
          },
          {
            first_name: 'John',
            salary: 14000,
            running_sum: 38000,
            moving_avg: 9400,
          },
          {
            first_name: 'Peter',
            salary: 10000,
            running_sum: 48000,
            moving_avg: 12000,
          },
        ],
        summary: { ko: '6개 행 반환', en: '6 rows returned' },
      },
    },
    {
      id: 'q10',
      label: { ko: 'MERGE INTO', en: 'MERGE INTO' },
      sql: 'MERGE INTO employees t\nUSING new_salaries s\n  ON (t.emp_id = s.emp_id)\nWHEN MATCHED THEN\n  UPDATE SET t.salary = s.salary\nWHEN NOT MATCHED THEN\n  INSERT (emp_id, first_name,\n          dept_id, salary)\n  VALUES (s.emp_id, s.first_name,\n          s.dept_id, s.salary)',
      type: 'MERGE',
      mergeData: {
        joinKey: 'emp_id',
        sourceRows: [
          { emp_id: 101, first_name: 'Alice', dept_id: 10, salary: 8000 },
          { emp_id: 103, first_name: 'Carol', dept_id: 10, salary: 9200 },
          { emp_id: 110, first_name: 'Iris', dept_id: 30, salary: 4200 },
          { emp_id: 111, first_name: 'Jake', dept_id: 10, salary: 7100 },
        ],
        targetRows: [
          { emp_id: 101, first_name: 'Alice', dept_id: 10, salary: 7200 },
          { emp_id: 102, first_name: 'Bob', dept_id: 20, salary: 5400 },
          { emp_id: 103, first_name: 'Carol', dept_id: 10, salary: 8100 },
          { emp_id: 104, first_name: 'David', dept_id: 30, salary: 4900 },
        ],
        resultRows: [
          {
            emp_id: 101,
            first_name: 'Alice',
            dept_id: 10,
            salary: 8000,
            _status: 'updated',
          },
          {
            emp_id: 102,
            first_name: 'Bob',
            dept_id: 20,
            salary: 5400,
            _status: 'unchanged',
          },
          {
            emp_id: 103,
            first_name: 'Carol',
            dept_id: 10,
            salary: 9200,
            _status: 'updated',
          },
          {
            emp_id: 104,
            first_name: 'David',
            dept_id: 30,
            salary: 4900,
            _status: 'unchanged',
          },
          {
            emp_id: 110,
            first_name: 'Iris',
            dept_id: 30,
            salary: 4200,
            _status: 'inserted',
          },
          {
            emp_id: 111,
            first_name: 'Jake',
            dept_id: 10,
            salary: 7100,
            _status: 'inserted',
          },
        ],
        matchedIds: [101, 103],
        insertedIds: [110, 111],
      },
      steps: [
        {
          id: 'from',
          phase: '① FROM / USING',
          label: {
            ko: 'USING — 원본 데이터 접근',
            en: 'USING — Access source data',
          },
          desc: {
            ko: 'USING 절에 지정된 원본(new_salaries)을 읽어 들입니다. 이 원본이 대상 테이블(employees)과 비교할 기준 데이터가 됩니다.',
            en: 'The source specified in USING (new_salaries) is read. This becomes the reference data to compare against the target table (employees).',
          },
          color: 'violet',
        },
        {
          id: 'on',
          phase: '② ON',
          label: { ko: 'ON — 행 매칭', en: 'ON — Row matching' },
          desc: {
            ko: 'ON 조건(t.emp_id = s.emp_id)으로 원본의 각 행을 대상 테이블과 비교합니다. emp_id가 일치하면 "매칭됨", 없으면 "매칭 안 됨"으로 분류됩니다.',
            en: 'Each source row is compared to the target using ON (t.emp_id = s.emp_id). Rows with a matching emp_id are "matched"; those without are "not matched."',
          },
          color: 'orange',
        },
        {
          id: 'matched_lock',
          phase: '③ Row Lock (매칭된 행)',
          label: {
            ko: 'Row Lock — 매칭 행 잠금',
            en: 'Row Lock — Lock matched rows',
          },
          desc: {
            ko: '매칭된 대상 행(Alice, Carol)에 자물쇠를 겁니다. UPDATE 또는 DELETE 처리 중 다른 트랜잭션이 같은 행을 수정하지 못하도록 막습니다.',
            en: 'Locks are placed on matched target rows (Alice, Carol) to prevent concurrent modification during UPDATE or DELETE.',
          },
          hint: {
            ko: 'Row Lock: 수정 중인 행을 다른 사람이 동시에 바꾸지 못하도록 잠그는 장치입니다. 지금 자세히 몰라도 됩니다.',
            en: 'Row Lock: prevents other users from modifying the same row while it is being changed. No need to know the details yet.',
          },
          color: 'rose',
        },
        {
          id: 'undo',
          phase: '④ 변경 전 값 저장 (Undo)',
          label: { ko: '변경 전 값 저장 (Undo)', en: 'Save old values (Undo)' },
          desc: {
            ko: '매칭된 행의 변경 전 salary 값(Alice 7200, Carol 8100)을 따로 보관합니다. ROLLBACK하면 이 값으로 되돌아갑니다.',
            en: 'The original salary values of matched rows (Alice 7200, Carol 8100) are saved. ROLLBACK restores these values.',
          },
          hint: {
            ko: 'Undo: "되돌리기용 메모"입니다. ROLLBACK 명령이 오면 Oracle이 이 메모를 보고 원래대로 복구합니다. 지금 자세히 몰라도 됩니다.',
            en: 'Undo: a "scratch note" of the old value for ROLLBACK. No need to know the details yet.',
          },
          color: 'amber',
        },
        {
          id: 'matched',
          phase: '⑤ WHEN MATCHED → UPDATE',
          label: {
            ko: 'WHEN MATCHED — UPDATE 실행',
            en: 'WHEN MATCHED — Run UPDATE',
          },
          desc: {
            ko: '매칭된 행(Alice, Carol)에 UPDATE를 실행합니다. Alice salary 7200 → 8000, Carol salary 8100 → 9200으로 변경됩니다. ON 절에 쓰인 emp_id는 수정할 수 없습니다.',
            en: 'UPDATE runs on the matched rows (Alice, Carol). Alice salary 7200 → 8000, Carol salary 8100 → 9200. emp_id used in ON cannot be updated.',
          },
          color: 'blue',
        },
        {
          id: 'not_matched',
          phase: '⑥ WHEN NOT MATCHED → INSERT',
          label: {
            ko: 'WHEN NOT MATCHED — INSERT 실행',
            en: 'WHEN NOT MATCHED — Run INSERT',
          },
          desc: {
            ko: '대상 테이블에 없던 원본 행(Iris emp_id=110, Jake emp_id=111)을 INSERT합니다. 기존 행(Bob, David)은 원본에 없으므로 이 단계에서 변경되지 않습니다.',
            en: 'Source rows with no match in the target (Iris emp_id=110, Jake emp_id=111) are INSERTed. Existing rows not in the source (Bob, David) are untouched.',
          },
          color: 'emerald',
        },
        {
          id: 'redo',
          phase: '⑦ 변경 이력 기록 (Redo)',
          label: { ko: 'Redo Log 기록', en: 'Write redo log' },
          desc: {
            ko: 'UPDATE 2건, INSERT 2건의 변경 내용을 이력 파일에 기록합니다. 서버가 갑자기 꺼져도 이 이력으로 복구합니다.',
            en: 'All 4 changes (2 UPDATEs, 2 INSERTs) are written to the history file for crash recovery.',
          },
          hint: {
            ko: 'Redo Log: "무슨 변경이 있었는지" 기록하는 장부입니다. 장애 후 재시작 시 Oracle이 이 장부로 커밋된 변경을 복원합니다. 지금 자세히 몰라도 됩니다.',
            en: 'Redo Log: a journal of changes. After a crash, Oracle replays this journal to restore committed changes. No need to know the details yet.',
          },
          color: 'emerald',
        },
        {
          id: 'result',
          phase: '⑧ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: 'MERGE가 완료됩니다. 최종 테이블은 기존 4개 행 중 2개 갱신 + 신규 2개 추가로 총 6개 행이 됩니다.',
            en: 'MERGE completes. The final table has 6 rows: 2 updated + 2 unchanged + 2 newly inserted.',
          },
          color: 'emerald',
        },
      ],
    },
    {
      id: 'q11',
      label: { ko: 'ROLLUP', en: 'ROLLUP' },
      sql: 'SELECT dept_id, job_title,\n       SUM(salary) AS total_sal,\n       COUNT(*)    AS cnt\nFROM   employees\nGROUP BY ROLLUP(dept_id, job_title)\nORDER BY dept_id NULLS LAST,\n         job_title NULLS LAST',
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'EMPLOYEES 테이블 전체를 읽어 들입니다.',
            en: 'All rows of EMPLOYEES are read.',
          },
          color: 'violet',
        },
        {
          id: 'groupby',
          phase: '② GROUP BY ROLLUP',
          label: {
            ko: 'GROUP BY ROLLUP — 계층 집계',
            en: 'GROUP BY ROLLUP — Hierarchical aggregation',
          },
          desc: {
            ko: 'ROLLUP(dept_id, job_title)은 일반 GROUP BY보다 더 많은 그룹을 만듭니다. ① (dept_id, job_title) 상세 조합 → ② dept_id 소계(job_title = NULL) → ③ 전체 총계(dept_id = NULL, job_title = NULL) 순서로 집계 행이 추가됩니다.',
            en: 'ROLLUP(dept_id, job_title) creates more groups than a plain GROUP BY. It adds: ① (dept_id, job_title) detail → ② dept_id subtotal (job_title = NULL) → ③ grand total (both NULL).',
          },
          color: 'blue',
        },
        {
          id: 'null_meaning',
          phase: '③ NULL 의 의미',
          label: {
            ko: 'NULL = 해당 수준의 "전체"',
            en: 'NULL = "all" at that level',
          },
          desc: {
            ko: 'ROLLUP 결과에서 NULL은 값이 없는 게 아니라 "해당 컬럼을 집계 기준으로 쓰지 않음 = 전체"를 의미합니다. dept_id=10, job_title=NULL인 행은 부서 10 전체 소계입니다.',
            en: 'NULL in ROLLUP output does not mean missing data — it means "aggregated across all values of that column." dept_id=10, job_title=NULL is the subtotal for all jobs in dept 10.',
          },
          color: 'orange',
        },
        {
          id: 'select',
          phase: '④ SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: '각 집계 행에서 dept_id, job_title, total_sal, cnt 컬럼을 추출합니다.',
            en: 'dept_id, job_title, total_sal, and cnt are projected from each aggregation row.',
          },
          color: 'blue',
        },
        {
          id: 'orderby',
          phase: '⑤ ORDER BY',
          label: { ko: 'ORDER BY — 정렬', en: 'ORDER BY — Sort' },
          desc: {
            ko: 'dept_id 오름차순으로 정렬하고, NULL(소계/총계 행)은 마지막에 옵니다. job_title도 같은 방식으로 정렬합니다.',
            en: 'Results are sorted by dept_id ascending. NULLS LAST places subtotal/grand-total rows at the bottom. Same rule applies for job_title.',
          },
          color: 'amber',
        },
        {
          id: 'result',
          phase: '⑥ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: '상세 4행 + 부서 소계 3행 + 전체 총계 1행 = 총 8행이 반환됩니다.',
            en: '6 detail rows + 3 dept subtotals + 1 grand total = 10 rows returned.',
          },
          color: 'emerald',
        },
      ],
      overrideResult: {
        columns: ['dept_id', 'job_title', 'total_sal', 'cnt'],
        rows: [
          { dept_id: 10, job_title: 'Engineer', total_sal: 15300, cnt: 2 },
          { dept_id: 10, job_title: 'Lead', total_sal: 9500, cnt: 1 },
          { dept_id: 10, job_title: null, total_sal: 24800, cnt: 3 },
          { dept_id: 20, job_title: 'Analyst', total_sal: 17600, cnt: 3 },
          { dept_id: 20, job_title: null, total_sal: 17600, cnt: 3 },
          { dept_id: 30, job_title: 'Support', total_sal: 8700, cnt: 2 },
          { dept_id: 30, job_title: null, total_sal: 8700, cnt: 2 },
          { dept_id: null, job_title: null, total_sal: 51100, cnt: 8 },
        ],
        summary: {
          ko: '8개 행 반환 (상세 + 소계 + 총계)',
          en: '8 rows (detail + subtotals + grand total)',
        },
      },
    },
    {
      id: 'q12',
      label: { ko: 'CUBE', en: 'CUBE' },
      sql: 'SELECT dept_id, job_title,\n       SUM(salary) AS total_sal,\n       COUNT(*)    AS cnt\nFROM   employees\nGROUP BY CUBE(dept_id, job_title)\nORDER BY dept_id NULLS LAST,\n         job_title NULLS LAST',
      type: 'SELECT',
      steps: [
        {
          id: 'from',
          phase: '① FROM',
          label: { ko: 'FROM — 테이블 접근', en: 'FROM — Access table' },
          desc: {
            ko: 'EMPLOYEES 테이블 전체를 읽어 들입니다.',
            en: 'All rows of EMPLOYEES are read.',
          },
          color: 'violet',
        },
        {
          id: 'groupby',
          phase: '② GROUP BY CUBE',
          label: {
            ko: 'GROUP BY CUBE — 모든 조합 집계',
            en: 'GROUP BY CUBE — All-combination aggregation',
          },
          desc: {
            ko: 'CUBE(dept_id, job_title)은 가능한 모든 컬럼 조합의 집계를 만듭니다. ① (dept_id, job_title) 상세 → ② dept_id 소계 → ③ job_title 소계 → ④ 전체 총계. ROLLUP과 달리 job_title만의 소계 행도 생성됩니다.',
            en: 'CUBE(dept_id, job_title) creates aggregates for every column combination: ① (dept_id, job_title) detail → ② dept subtotal → ③ job subtotal → ④ grand total. Unlike ROLLUP, CUBE also adds job-only subtotals.',
          },
          color: 'blue',
        },
        {
          id: 'cube_vs_rollup',
          phase: '③ CUBE vs ROLLUP 차이',
          label: { ko: 'CUBE vs ROLLUP', en: 'CUBE vs ROLLUP' },
          desc: {
            ko: 'ROLLUP은 왼쪽 컬럼부터 하나씩 제거하는 계층 구조입니다. CUBE는 모든 조합을 구하므로 컬럼 순서와 무관하게 같은 결과가 나옵니다. 이 쿼리에서 ROLLUP보다 job_title 소계 3행이 추가로 생깁니다.',
            en: 'ROLLUP removes columns from the right hierarchically. CUBE computes all combinations regardless of column order. This query produces 3 extra job-only subtotal rows compared to ROLLUP.',
          },
          color: 'orange',
        },
        {
          id: 'select',
          phase: '④ SELECT',
          label: { ko: 'SELECT — 컬럼 투영', en: 'SELECT — Column projection' },
          desc: {
            ko: '각 집계 행에서 dept_id, job_title, total_sal, cnt 컬럼을 추출합니다.',
            en: 'dept_id, job_title, total_sal, and cnt are projected from each aggregation row.',
          },
          color: 'blue',
        },
        {
          id: 'orderby',
          phase: '⑤ ORDER BY',
          label: { ko: 'ORDER BY — 정렬', en: 'ORDER BY — Sort' },
          desc: {
            ko: 'dept_id, job_title 순으로 정렬하며, NULL(소계/총계)은 NULLS LAST로 맨 뒤에 위치합니다.',
            en: 'Sorted by dept_id then job_title. NULLS LAST places subtotal and grand-total rows at the end.',
          },
          color: 'amber',
        },
        {
          id: 'result',
          phase: '⑥ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: '상세 6행 + 부서 소계 3행 + 직무 소계 3행 + 총계 1행 = 총 13행이 반환됩니다.',
            en: '6 detail + 3 dept subtotals + 3 job subtotals + 1 grand total = 13 rows returned.',
          },
          color: 'emerald',
        },
      ],
      overrideResult: {
        columns: ['dept_id', 'job_title', 'total_sal', 'cnt'],
        rows: [
          { dept_id: 10, job_title: 'Engineer', total_sal: 15300, cnt: 2 },
          { dept_id: 10, job_title: 'Lead', total_sal: 9500, cnt: 1 },
          { dept_id: 10, job_title: null, total_sal: 24800, cnt: 3 },
          { dept_id: 20, job_title: 'Analyst', total_sal: 17600, cnt: 3 },
          { dept_id: 20, job_title: null, total_sal: 17600, cnt: 3 },
          { dept_id: 30, job_title: 'Support', total_sal: 8700, cnt: 2 },
          { dept_id: 30, job_title: null, total_sal: 8700, cnt: 2 },
          { dept_id: null, job_title: 'Analyst', total_sal: 17600, cnt: 3 },
          { dept_id: null, job_title: 'Engineer', total_sal: 15300, cnt: 2 },
          { dept_id: null, job_title: 'Lead', total_sal: 9500, cnt: 1 },
          { dept_id: null, job_title: 'Support', total_sal: 8700, cnt: 2 },
          { dept_id: null, job_title: null, total_sal: 51100, cnt: 8 },
        ],
        summary: {
          ko: '12개 행 반환 (상세 + 부서/직무 소계 + 총계)',
          en: '12 rows (detail + dept/job subtotals + grand total)',
        },
      },
    },
    {
      id: 'q13',
      label: { ko: 'PIVOT', en: 'PIVOT' },
      sql: "SELECT *\nFROM (\n  SELECT dept_id, job_title, salary\n  FROM   employees\n)\nPIVOT (\n  SUM(salary)\n  FOR job_title IN (\n    'Engineer' AS Engineer,\n    'Analyst'  AS Analyst,\n    'Support'  AS Support,\n    'Lead'     AS Lead\n  )\n)\nORDER BY dept_id",
      type: 'SELECT',
      steps: [
        {
          id: 'inline_view',
          phase: '① 인라인 뷰',
          label: {
            ko: '인라인 뷰 — 원본 준비',
            en: 'Inline view — Prepare source',
          },
          desc: {
            ko: 'FROM (...) 안의 서브쿼리가 먼저 실행됩니다. dept_id, job_title, salary 세 컬럼만 골라 PIVOT에 넘길 원본 데이터를 만듭니다.',
            en: 'The subquery inside FROM (...) runs first, selecting dept_id, job_title, and salary — the three columns needed for PIVOT.',
          },
          color: 'violet',
        },
        {
          id: 'pivot_group',
          phase: '② PIVOT — 행 그룹화',
          label: {
            ko: 'PIVOT — dept_id 기준 그룹화',
            en: 'PIVOT — Group by dept_id',
          },
          desc: {
            ko: 'PIVOT 절이 FOR에 나열되지 않은 컬럼(dept_id)을 기준으로 행을 그룹화합니다. 각 dept_id 값이 결과의 한 행이 됩니다.',
            en: 'PIVOT groups rows by the column not listed in FOR (dept_id). Each distinct dept_id value becomes one row in the result.',
          },
          color: 'orange',
        },
        {
          id: 'pivot_agg',
          phase: '③ PIVOT — 집계 및 열 생성',
          label: {
            ko: 'PIVOT — SUM 집계 후 열로 변환',
            en: 'PIVOT — Aggregate and create columns',
          },
          desc: {
            ko: "FOR job_title IN ('Engineer', 'Analyst', 'Support', 'Lead') 각 값에 대해 SUM(salary)를 계산하고, 그 결과를 열로 배치합니다. dept_id=10 그룹에서 job_title='Engineer'인 행의 salary 합계가 Engineer 열 값이 됩니다.",
            en: "For each value in FOR job_title IN (...), SUM(salary) is computed and placed as a column. In the dept_id=10 group, the sum of salary where job_title='Engineer' becomes the Engineer column value.",
          },
          color: 'blue',
        },
        {
          id: 'null_col',
          phase: '④ NULL — 해당 조합 없음',
          label: {
            ko: 'NULL — 해당 조합이 없는 경우',
            en: 'NULL — No data for that combination',
          },
          desc: {
            ko: '특정 (dept_id, job_title) 조합의 데이터가 없으면 해당 셀은 NULL이 됩니다. 예를 들어 부서 10에는 Analyst가 없으므로 Analyst 열이 NULL입니다.',
            en: 'If there is no data for a (dept_id, job_title) combination, the cell is NULL. For example, dept 10 has no Analyst, so the Analyst column is NULL for that row.',
          },
          color: 'rose',
        },
        {
          id: 'orderby',
          phase: '⑤ ORDER BY',
          label: { ko: 'ORDER BY — 정렬', en: 'ORDER BY — Sort' },
          desc: {
            ko: '최종 결과를 dept_id 오름차순으로 정렬합니다.',
            en: 'The final result is sorted by dept_id ascending.',
          },
          color: 'amber',
        },
        {
          id: 'result',
          phase: '⑥ 결과 반환',
          label: { ko: '결과 반환', en: 'Return results' },
          desc: {
            ko: '부서 3개 × 직무 4개 열 구조로 3행이 반환됩니다. 기존 8행이 3행으로 압축되고 직무별 급여 합계가 가로로 펼쳐집니다.',
            en: '3 rows are returned in a 3-dept × 4-job-column structure. The original 8 rows are condensed to 3, with job salary totals spread horizontally.',
          },
          color: 'emerald',
        },
      ],
      overrideResult: {
        columns: ['dept_id', 'Engineer', 'Analyst', 'Support', 'Lead'],
        rows: [
          {
            dept_id: 10,
            Engineer: 15300,
            Analyst: null,
            Support: null,
            Lead: 9500,
          },
          {
            dept_id: 20,
            Engineer: null,
            Analyst: 17600,
            Support: null,
            Lead: null,
          },
          {
            dept_id: 30,
            Engineer: null,
            Analyst: null,
            Support: 8700,
            Lead: null,
          },
        ],
        summary: {
          ko: '3개 행 반환 (부서별 직무 급여 합계)',
          en: '3 rows (salary sum per dept × job)',
        },
      },
    },
  ]
}

export const EXAMPLE_QUERIES: ExampleQuery[] = buildExampleQueries(EMPLOYEES)
