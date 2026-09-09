import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PageContainer, ChapterTitle, Prose, InfoBox } from '../../shared'
import { IconSitemap } from '@tabler/icons-react'
import { SqlHighlight } from './SqlHighlight'
import { useSimulationStore } from '@/store/simulationStore'
import type { Employee } from '@/data'

// ── Data ───────────────────────────────────────────────────────────────────
// 계층형 질의(CONNECT BY) 설명용 가상의 조직도. HR 데이터가 아니라 이 페이지 전용.

const EMP_ORG: Array<
  Pick<Employee, 'emp_id' | 'first_name' | 'dept_id' | 'manager_id'>
> = [
  { emp_id: 100, first_name: 'King', dept_id: 10, manager_id: null },
  { emp_id: 101, first_name: 'Alice', dept_id: 10, manager_id: 100 },
  { emp_id: 102, first_name: 'Bob', dept_id: 20, manager_id: 100 },
  { emp_id: 103, first_name: 'Carol', dept_id: 10, manager_id: 101 },
  { emp_id: 104, first_name: 'David', dept_id: 30, manager_id: 102 },
  { emp_id: 105, first_name: 'Eva', dept_id: 20, manager_id: 102 },
  { emp_id: 106, first_name: 'Frank', dept_id: 30, manager_id: 101 },
]

interface HierNode {
  emp_id: number
  first_name: string
  manager_id: number | null
  level: number
  path: string
}

function buildHierarchy(startId: number | null, maxLevel: number): HierNode[] {
  const result: HierNode[] = []

  function pushNode(
    e: (typeof EMP_ORG)[number],
    lvl: number,
    pathSoFar: string
  ) {
    const path = pathSoFar ? `${pathSoFar}/${e.first_name}` : e.first_name
    result.push({
      emp_id: e.emp_id,
      first_name: e.first_name,
      manager_id: e.manager_id,
      level: lvl,
      path,
    })
    if (lvl < maxLevel) {
      EMP_ORG.filter((c) => c.manager_id === e.emp_id).forEach((c) =>
        pushNode(c, lvl + 1, path)
      )
    }
  }

  if (startId === null) {
    const root = EMP_ORG.find((e) => e.manager_id === null)
    if (root) pushNode(root, 1, '')
  } else {
    const start = EMP_ORG.find((e) => e.emp_id === startId)
    if (start) pushNode(start, 1, '')
  }

  return result
}

// ── Translation ────────────────────────────────────────────────────────────

const T = {
  ko: {
    chapterTitle: '계층형 질의 (Hierarchical Query)',
    chapterSubtitle: 'CONNECT BY로 부모-자식 관계를 재귀적으로 탐색해요.',
    hierIntro:
      'Oracle의 CONNECT BY 절은 부모-자식 관계를 가진 데이터를 계층 구조로 탐색해요. 셀프 조인과 달리 몇 단계가 되더라도 쿼리 하나로 표현할 수 있어서 조직도, 카테고리 트리, BOM(Bill of Materials, 자재 명세서) 등에 자주 사용돼요.',
    hierClauses: [
      {
        clause: 'START WITH',
        desc: '계층 탐색을 시작할 루트 조건을 지정해요. 이 조건을 만족하는 행이 LEVEL = 1이 돼요.',
      },
      {
        clause: 'CONNECT BY PRIOR',
        desc: '부모-자식 관계를 정의해요. PRIOR 키워드가 붙은 컬럼이 "현재 행의 부모"를 참조해요.',
      },
      {
        clause: 'LEVEL',
        desc: '현재 행의 깊이(계층 레벨)를 나타내는 의사 컬럼(Pseudocolumn)이에요. 루트가 1, 자식이 2, 손자가 3...',
      },
      {
        clause: 'SYS_CONNECT_BY_PATH',
        desc: "루트에서 현재 행까지의 경로를 문자열로 반환해요. SYS_CONNECT_BY_PATH(col, '/') 형태로 사용해요.",
      },
      {
        clause: 'CONNECT_BY_ROOT',
        desc: '현재 행이 속한 계층의 루트 값을 반환해요.',
      },
      {
        clause: 'NOCYCLE',
        desc: '순환 참조가 있는 데이터에서도 오류 없이 실행되도록 해줘요. CONNECT_BY_ISCYCLE로 순환 여부를 확인할 수 있어요.',
      },
    ],
    hierSqlBasic:
      "SELECT emp_id,\n       LPAD(' ', (LEVEL-1)*4) || first_name AS name,\n       manager_id,\n       LEVEL\nFROM   employees\nSTART WITH manager_id IS NULL\nCONNECT BY PRIOR emp_id = manager_id",
    hierSqlPath:
      "SELECT emp_id,\n       LPAD(' ', (LEVEL-1)*4) || first_name AS name,\n       LEVEL,\n       SYS_CONNECT_BY_PATH(first_name, '/') AS path\nFROM   employees\nSTART WITH manager_id IS NULL\nCONNECT BY PRIOR emp_id = manager_id",
    hierTabBasic: '기본 계층 탐색',
    hierTabPath: 'SYS_CONNECT_BY_PATH',
    hierDescBasic:
      'manager_id IS NULL 조건으로 최상위 관리자(King)에서 시작해요. CONNECT BY PRIOR emp_id = manager_id는 "현재 행의 emp_id = 자식 행의 manager_id" 관계로 아래 방향으로 탐색해요. LPAD로 LEVEL만큼 들여쓰기해서 트리 구조를 시각화해요.',
    hierDescPath:
      "SYS_CONNECT_BY_PATH(first_name, '/')는 루트부터 현재 행까지의 이름을 /로 구분한 경로 문자열로 반환해요. 특정 직원의 조직 상위 경로를 한눈에 파악하는 데 유용해요.",
    hierLevelLabel: 'LEVEL',
    hierPathLabel: 'path',
    hierNote:
      'CONNECT BY는 Oracle 전용 문법이에요. SQL:1999 표준의 재귀 CTE(WITH ... AS (... UNION ALL ...))와 비교하면 Oracle CONNECT BY가 더 간결하지만, 다른 데이터베이스와의 호환성이 필요하면 재귀 CTE를 사용하세요.',
    hierPriorNote:
      'CONNECT BY PRIOR emp_id = manager_id와 CONNECT BY emp_id = PRIOR manager_id는 반대 방향 탐색을 의미해요. 전자는 위→아래(하향), 후자는 아래→위(상향) 탐색이에요.',
    startFrom: '시작 직원',
    allHierarchy: '전체 계층',
  },
  en: {
    chapterTitle: 'Hierarchical Query (CONNECT BY)',
    chapterSubtitle:
      'Recursively traverse parent-child relationships with CONNECT BY.',
    hierIntro:
      "Oracle's CONNECT BY clause traverses data with parent-child relationships as a tree structure. Unlike self joins, any depth of hierarchy can be expressed in a single query — making it ideal for org charts, category trees, and BOMs (Bill of Materials).",
    hierClauses: [
      {
        clause: 'START WITH',
        desc: 'Specifies the root condition to begin hierarchy traversal. Rows matching this condition get LEVEL = 1.',
      },
      {
        clause: 'CONNECT BY PRIOR',
        desc: "Defines the parent-child relationship. The column with PRIOR refers to the current row's parent.",
      },
      {
        clause: 'LEVEL',
        desc: 'A pseudocolumn representing the depth of the current row in the hierarchy. Root = 1, children = 2, grandchildren = 3...',
      },
      {
        clause: 'SYS_CONNECT_BY_PATH',
        desc: "Returns the path from the root to the current row as a string. Used as SYS_CONNECT_BY_PATH(col, '/').",
      },
      {
        clause: 'CONNECT_BY_ROOT',
        desc: 'Returns the root value of the hierarchy that the current row belongs to.',
      },
      {
        clause: 'NOCYCLE',
        desc: 'Prevents errors when the data contains cycles. Use CONNECT_BY_ISCYCLE to identify cyclic rows.',
      },
    ],
    hierSqlBasic:
      "SELECT emp_id,\n       LPAD(' ', (LEVEL-1)*4) || first_name AS name,\n       manager_id,\n       LEVEL\nFROM   employees\nSTART WITH manager_id IS NULL\nCONNECT BY PRIOR emp_id = manager_id",
    hierSqlPath:
      "SELECT emp_id,\n       LPAD(' ', (LEVEL-1)*4) || first_name AS name,\n       LEVEL,\n       SYS_CONNECT_BY_PATH(first_name, '/') AS path\nFROM   employees\nSTART WITH manager_id IS NULL\nCONNECT BY PRIOR emp_id = manager_id",
    hierTabBasic: 'Basic Traversal',
    hierTabPath: 'SYS_CONNECT_BY_PATH',
    hierDescBasic:
      'The query starts from the top-level manager (King) using manager_id IS NULL. CONNECT BY PRIOR emp_id = manager_id means "the current row\'s emp_id equals the child\'s manager_id" — a top-down traversal. LPAD indents each row by (LEVEL - 1) × 4 spaces to visualize the tree.',
    hierDescPath:
      "SYS_CONNECT_BY_PATH(first_name, '/') returns the path from the root to the current row as names separated by /. This is useful for quickly seeing an employee's full organizational path.",
    hierLevelLabel: 'LEVEL',
    hierPathLabel: 'path',
    hierNote:
      'CONNECT BY is Oracle-specific syntax. The SQL:1999 standard equivalent is a recursive CTE (WITH ... AS (... UNION ALL ...)). CONNECT BY is more concise in Oracle, but use recursive CTEs if portability across databases is needed.',
    hierPriorNote:
      'CONNECT BY PRIOR emp_id = manager_id and CONNECT BY emp_id = PRIOR manager_id traverse in opposite directions. The former is top-down (parent → child); the latter is bottom-up (child → parent).',
    startFrom: 'Start from',
    allHierarchy: 'All hierarchy',
  },
}

// ── HierarchySection ─────────────────────────────────────────────────────────

type HierTab = 'basic' | 'path'

export function HierarchySection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const [hierTab, setHierTab] = useState<HierTab>('basic')
  const [startId, setStartId] = useState<number | null>(null)

  const hierNodes = buildHierarchy(startId, 5)
  const resultIds = new Set(hierNodes.map((n) => n.emp_id))

  const startOptions: Array<{ label: string; id: number | null }> = [
    { label: t.allHierarchy, id: null },
    ...EMP_ORG.filter(
      (e) =>
        e.manager_id === null || EMP_ORG.some((c) => c.manager_id === e.emp_id)
    ).map((e) => ({
      label: e.first_name,
      id: e.emp_id,
    })),
  ]

  return (
    <PageContainer>
      <ChapterTitle
        icon={<IconSitemap size={36} color="var(--color-blue)" stroke={1.5} />}
        title={t.chapterTitle}
        subtitle={t.chapterSubtitle}
      />

      <Prose>{t.hierIntro}</Prose>

      {/* Clause reference table */}
      <div>
        <p className="text-ink-2 mb-2 font-mono text-[10px] font-bold tracking-wide uppercase">
          {lang === 'ko' ? '주요 키워드' : 'Key Keywords'}
        </p>
        <div className="rounded-panel bg-paper overflow-x-auto border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-rail border-b">
                <th className="text-green px-3 py-2 text-left font-mono text-[10px] font-bold whitespace-nowrap">
                  Keyword
                </th>
                <th className="text-ink-2 px-3 py-2 text-left font-mono text-[10px] font-bold">
                  {lang === 'ko' ? '설명' : 'Description'}
                </th>
              </tr>
            </thead>
            <tbody>
              {t.hierClauses.map((row, i) => (
                <tr key={i} className="hover:bg-rail border-b last:border-0">
                  <td className="text-green px-3 py-2 font-mono text-[11px] font-bold whitespace-nowrap">
                    {row.clause}
                  </td>
                  <td className="text-ink/80 px-3 py-2 font-mono text-[11px] leading-relaxed">
                    {row.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <div className="mb-4 flex gap-2">
          {(['basic', 'path'] as HierTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setHierTab(tab)}
              className={cn(
                'rounded-card border px-4 py-1.5 font-mono text-xs font-bold transition-all',
                hierTab === tab
                  ? 'border-green/30 bg-green/10 text-green'
                  : 'border-line bg-paper text-ink-2 hover:bg-rail'
              )}
            >
              {tab === 'basic' ? t.hierTabBasic : t.hierTabPath}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* SQL + desc */}
          <div className="flex flex-col gap-3">
            <SqlHighlight
              sql={hierTab === 'basic' ? t.hierSqlBasic : t.hierSqlPath}
            />
            <div className="rounded-card border-green/30 bg-green/10 text-green border px-3 py-2 text-[12px] leading-relaxed">
              {hierTab === 'basic' ? t.hierDescBasic : t.hierDescPath}
            </div>
          </div>

          {/* Right column: start buttons → query result → source table */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink-2 font-mono text-[10px]">
                {t.startFrom}:
              </span>
              {startOptions.map((opt) => (
                <button
                  key={opt.id ?? 'all'}
                  onClick={() => setStartId(opt.id)}
                  className={cn(
                    'rounded-card border px-2.5 py-0.5 font-mono text-[11px] transition-all',
                    startId === opt.id
                      ? 'border-green/50 bg-green/5 text-green font-bold'
                      : 'border-line bg-paper text-ink-2 hover:bg-rail'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Query result table */}
            <div className="rounded-card bg-paper overflow-x-auto border text-xs">
              <div className="bg-rail text-ink-2 border-b px-3 py-1.5 font-mono text-[10px] font-bold">
                {lang === 'ko' ? '쿼리 결과' : 'Query Result'}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-rail border-b">
                    {hierTab === 'basic'
                      ? [
                          'emp_id',
                          'name (LPAD)',
                          'manager_id',
                          t.hierLevelLabel,
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-ink-2 px-3 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))
                      : [
                          'emp_id',
                          'name (LPAD)',
                          t.hierLevelLabel,
                          t.hierPathLabel,
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-ink-2 px-3 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {hierNodes.map((node) => (
                    <tr
                      key={node.emp_id}
                      className="hover:bg-rail border-b last:border-0"
                    >
                      <td className="text-blue px-3 py-1.5 font-mono text-[11px] font-bold">
                        {node.emp_id}
                      </td>
                      <td className="py-1.5 pr-4 pl-3 font-mono text-[11px] whitespace-pre">
                        <span className="text-green">
                          {' '.repeat((node.level - 1) * 4)}
                        </span>
                        <span className="text-ink/90 font-bold">
                          {node.first_name}
                        </span>
                      </td>
                      {hierTab === 'basic' ? (
                        <>
                          <td className="text-ink/60 px-3 py-1.5 font-mono text-[11px]">
                            {node.manager_id ?? 'NULL'}
                          </td>
                          <td className="text-green px-3 py-1.5 font-mono text-[11px] font-bold">
                            {node.level}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="text-green px-3 py-1.5 font-mono text-[11px] font-bold">
                            {node.level}
                          </td>
                          <td className="text-ink/60 px-3 py-1.5 font-mono text-[11px]">
                            /{node.path}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Source table */}
            <div className="rounded-card bg-paper overflow-x-auto border text-xs">
              <div className="bg-rail text-ink-2 border-b px-3 py-1.5 font-mono text-[10px] font-bold">
                employees
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-rail border-b">
                    {['name', 'emp_id', 'manager_id'].map((h) => (
                      <th
                        key={h}
                        className="text-ink-2 px-3 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EMP_ORG.map((emp) => (
                    <tr
                      key={emp.emp_id}
                      className={cn(
                        'border-b last:border-0',
                        resultIds.has(emp.emp_id)
                          ? 'bg-green/5 dark:bg-green'
                          : 'opacity-40'
                      )}
                    >
                      <td className="text-ink/90 px-3 py-1.5 font-mono text-[11px] font-bold">
                        {emp.first_name}
                      </td>
                      <td className="text-blue px-3 py-1.5 font-mono text-[11px] font-bold">
                        {emp.emp_id}
                      </td>
                      <td className="text-ink/60 px-3 py-1.5 font-mono text-[11px]">
                        {emp.manager_id ?? 'NULL'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <InfoBox variant="warning">{t.hierPriorNote}</InfoBox>
        <InfoBox variant="tip">{t.hierNote}</InfoBox>
      </div>
    </PageContainer>
  )
}
