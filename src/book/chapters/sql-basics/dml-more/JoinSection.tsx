import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { PageContainer, ChapterTitle, Prose, InfoBox } from '../../shared'
import {
  IconArrowMerge,
  IconArrowsJoin,
  IconArrowBarToLeft,
  IconArrowBarToRight,
  IconArrowsHorizontal,
  IconGridDots,
} from '@tabler/icons-react'
import { useSimulationStore } from '@/store/simulationStore'
import { JoinSimulator, JOIN_SQL, type JoinType } from '@/components/join-sim'
import { SqlHighlight } from './SqlHighlight'

// ── Data ───────────────────────────────────────────────────────────────────

const C = {
  bg: 'bg-rail',
  border: 'border-line',
  text: 'text-ink/80',
  badge: 'bg-blue/10 text-blue',
}

const JOIN_COLOR: Record<
  JoinType,
  { border: string; bg: string; text: string; badge: string; var: string }
> = {
  inner: {
    border: 'border-green/50',
    bg: 'bg-green/5',
    text: 'text-green',
    badge: 'bg-green/10 text-green',
    var: 'var(--color-green)',
  },
  left: {
    border: 'border-blue/50',
    bg: 'bg-blue/5',
    text: 'text-blue',
    badge: 'bg-blue/10 text-blue',
    var: 'var(--color-blue)',
  },
  right: {
    border: 'border-purple/50',
    bg: 'bg-purple/5',
    text: 'text-purple',
    badge: 'bg-purple/10 text-purple',
    var: 'var(--color-purple)',
  },
  full: {
    border: 'border-amber/50',
    bg: 'bg-amber/5',
    text: 'text-amber',
    badge: 'bg-amber/10 text-amber',
    var: 'var(--color-amber)',
  },
  cross: {
    border: 'border-red/50',
    bg: 'bg-red/5',
    text: 'text-red',
    badge: 'bg-red/10 text-red',
    var: 'var(--color-red)',
  },
}

// ── JoinDiagram ──────────────────────────────────────────────────────────────
// 조인 종류(교집합·합집합 등)를 나타내는 벤 다이어그램. 이 페이지 전용 구현.
// EMP = 왼쪽 원, DEPT = 오른쪽 원. 앱 디자인 무드(각진 카드·헤어라인·mono 라벨)에 맞춤.

// 원 배치 — 라벨은 각 원의 "바깥쪽 반달"(교집합과 겹치지 않는 영역) 중심에 둬서
// 카드 border·원 스트로크와 절대 겹치지 않게 한다.
const JD_L_CX = 42,
  JD_R_CX = 78,
  JD_CY = 32,
  JD_R = 22
const JD_L_LABEL_X = 33,
  JD_R_LABEL_X = 87,
  JD_LABEL_Y = 35

// CROSS JOIN 격자 — 카테시안 곱(모든 행 조합)은 교집합/합집합 개념이 아니라서
// 벤 다이어그램 은유가 안 맞는다. EMP 행 × DEPT 행의 모든 조합을 점 격자로 표현.
const JD_GRID_COLS = 4 // EMP 행 (가로)
const JD_GRID_ROWS = 3 // DEPT 행 (세로)
const JD_GRID_X0 = 30,
  JD_GRID_X1 = 90
const JD_GRID_Y0 = 14,
  JD_GRID_Y1 = 42
const JD_GRID_DOTS = Array.from({ length: JD_GRID_ROWS }, (_, ri) =>
  Array.from({ length: JD_GRID_COLS }, (_, ci) => ({
    x: JD_GRID_X0 + (ci * (JD_GRID_X1 - JD_GRID_X0)) / (JD_GRID_COLS - 1),
    y: JD_GRID_Y0 + (ri * (JD_GRID_Y1 - JD_GRID_Y0)) / (JD_GRID_ROWS - 1),
  }))
).flat()

function JoinDiagram({ type }: { type: JoinType }) {
  const c = JOIN_COLOR[type]

  if (type === 'cross') {
    return (
      <div
        className={cn(
          'rounded-panel flex h-full flex-col items-center justify-center gap-3 border p-4 transition-colors',
          c.border,
          c.bg
        )}
      >
        <svg viewBox="0 0 120 64" className="h-24 w-full max-w-[176px]">
          {/* 격자선 — EMP 각 행에서 DEPT 각 행으로 뻗는 결합을 옅게 암시 */}
          {JD_GRID_DOTS.map((d, i) => (
            <line
              key={`gl-${i}`}
              x1={JD_GRID_X0}
              y1={d.y}
              x2={d.x}
              y2={JD_GRID_Y1 + 6}
              stroke="var(--color-red)"
              strokeWidth="0.5"
              opacity="0.18"
            />
          ))}
          {/* 조합 점 — 각 점 = (EMP 행, DEPT 행) 조합 하나 */}
          {JD_GRID_DOTS.map((d, i) => (
            <circle
              key={`gd-${i}`}
              cx={d.x}
              cy={d.y}
              r="3.2"
              fill="var(--color-red)"
              opacity="0.85"
            />
          ))}
          <text
            x={(JD_GRID_X0 + JD_GRID_X1) / 2}
            y={JD_GRID_Y1 + 16}
            fontSize="10"
            fontFamily="var(--font-mono)"
            fill="var(--color-red)"
            fontWeight="700"
            textAnchor="middle"
          >
            EMP × DEPT
          </text>
        </svg>
        <span
          className={cn(
            'rounded-chip px-2 py-0.5 font-mono text-[10px] font-bold',
            c.badge
          )}
        >
          {type.toUpperCase()} JOIN
        </span>
      </div>
    )
  }

  // 결과에 포함되는 영역만 강조색으로 채운다 — 나머지 테두리는 중립색 헤어라인.
  // inner: 교집합만 / left: 왼쪽 원 전체 / right: 오른쪽 원 전체 / full: 합집합(양쪽)
  const fillLeftWhole = type === 'left' || type === 'full'
  const fillRightWhole = type === 'right' || type === 'full'
  const fillOnlyMid = type === 'inner'
  const highlight = `color-mix(in srgb, ${c.var} 40%, var(--color-paper))`
  const strokeNeutral = 'var(--color-line-2)'

  return (
    <div
      className={cn(
        'rounded-panel flex h-full flex-col items-center justify-center gap-3 border p-4 transition-colors',
        c.border,
        c.bg
      )}
    >
      <svg viewBox="0 0 120 64" className="h-24 w-full max-w-[176px]">
        <circle
          cx={JD_L_CX}
          cy={JD_CY}
          r={JD_R}
          fill={fillLeftWhole ? highlight : 'none'}
          stroke={strokeNeutral}
          strokeWidth="1.5"
        />
        <circle
          cx={JD_R_CX}
          cy={JD_CY}
          r={JD_R}
          fill={fillRightWhole ? highlight : 'none'}
          stroke={strokeNeutral}
          strokeWidth="1.5"
        />
        {fillOnlyMid && (
          <>
            <clipPath id={`jd-${type}`}>
              <circle cx={JD_L_CX} cy={JD_CY} r={JD_R} />
            </clipPath>
            <circle
              cx={JD_R_CX}
              cy={JD_CY}
              r={JD_R}
              fill={highlight}
              stroke="none"
              clipPath={`url(#jd-${type})`}
            />
          </>
        )}
        {/* 결과에 포함되는 원의 테두리만 강조색으로 다시 덧그려 경계를 또렷하게 */}
        {fillLeftWhole && (
          <circle
            cx={JD_L_CX}
            cy={JD_CY}
            r={JD_R}
            fill="none"
            stroke={c.var}
            strokeWidth="2"
          />
        )}
        {fillRightWhole && (
          <circle
            cx={JD_R_CX}
            cy={JD_CY}
            r={JD_R}
            fill="none"
            stroke={c.var}
            strokeWidth="2"
          />
        )}
        <text
          x={JD_L_LABEL_X}
          y={JD_LABEL_Y}
          fontSize="10"
          fontFamily="var(--font-mono)"
          fill="var(--color-ink-2)"
          fontWeight="700"
          textAnchor="middle"
        >
          EMP
        </text>
        <text
          x={JD_R_LABEL_X}
          y={JD_LABEL_Y}
          fontSize="10"
          fontFamily="var(--font-mono)"
          fill="var(--color-ink-2)"
          fontWeight="700"
          textAnchor="middle"
        >
          DEPT
        </text>
      </svg>
      <span
        className={cn(
          'rounded-chip px-2 py-0.5 font-mono text-[10px] font-bold',
          c.badge
        )}
      >
        {type.toUpperCase()} JOIN
      </span>
    </div>
  )
}

// ── Translation ────────────────────────────────────────────────────────────

const T = {
  ko: {
    chapterTitle: 'JOIN — 테이블 결합',
    joinSectionSubtitle:
      '두 개 이상의 테이블을 결합해서 데이터를 찾는 JOIN의 종류와 동작 방식을 알아봐요.',
    joinIntro:
      'JOIN은 서로 다른 테이블의 행을 결합 조건(ON 절)에 따라 연결해서 결과 집합을 만들어요. 결합 방식에 따라 INNER, LEFT OUTER, RIGHT OUTER, FULL OUTER, CROSS JOIN으로 나뉘어요.',
    joinTypes: [
      {
        key: 'inner',
        icon: (
          <IconArrowsJoin size={16} color="var(--color-blue)" stroke={1.5} />
        ),
        title: 'INNER JOIN',
        desc: '양쪽 테이블 모두에서 조건을 만족하는 행만 반환해요. 가장 일반적인 JOIN이에요.',
      },
      {
        key: 'left',
        icon: (
          <IconArrowBarToLeft
            size={16}
            color="var(--color-green)"
            stroke={1.5}
          />
        ),
        title: 'LEFT OUTER JOIN',
        desc: '왼쪽 테이블의 모든 행 + 오른쪽 테이블에서 조건에 맞는 행. 오른쪽에 일치하는 행이 없으면 NULL이 돼요.',
      },
      {
        key: 'right',
        icon: (
          <IconArrowBarToRight
            size={16}
            color="var(--color-amber)"
            stroke={1.5}
          />
        ),
        title: 'RIGHT OUTER JOIN',
        desc: '오른쪽 테이블의 모든 행 + 왼쪽 테이블에서 조건에 맞는 행. 왼쪽에 일치하는 행이 없으면 NULL이 돼요.',
      },
      {
        key: 'full',
        icon: (
          <IconArrowsHorizontal
            size={16}
            color="var(--color-purple)"
            stroke={1.5}
          />
        ),
        title: 'FULL OUTER JOIN',
        desc: '양쪽 테이블의 모든 행을 반환해요. 조건을 만족하지 않는 쪽은 NULL로 채워요.',
      },
      {
        key: 'cross',
        icon: <IconGridDots size={16} color="var(--color-red)" stroke={1.5} />,
        title: 'CROSS JOIN',
        desc: '모든 행의 조합(Cartesian Join)을 반환해요. ON 절이 없어요.',
      },
    ],
    joinQueryDesc: {
      inner:
        'employees(직원) 테이블과 departments(부서) 테이블에서 dept_id(부서 번호)가 같은 행을 찾아요.',
      left: 'employees(직원) 테이블의 모든 행을 가져오고, dept_id가 일치하는 departments(부서) 행을 결합해요. 일치하는 부서가 없으면 dept_name, location은 NULL이 돼요.',
      right:
        'departments(부서) 테이블의 모든 행을 가져오고, dept_id가 일치하는 employees(직원) 행을 결합해요. 소속 직원이 없는 부서도 결과에 포함되며, emp_id, first_name은 NULL이 돼요.',
      full: 'employees(직원)와 departments(부서) 양쪽 테이블의 모든 행을 가져와요. dept_id가 일치하지 않는 행은 상대 테이블 컬럼이 NULL이 돼요.',
      cross:
        'employees(직원) 테이블의 모든 행과 departments(부서) 테이블의 모든 행을 조합해요. ON 조건 없이 가능한 모든 쌍을 반환해요.',
    },
    joinRowCount: (n: number) => `${n}개 행 반환`,
    ansiDesc:
      'ANSI(American National Standards Institute, 미국 국가 표준 협회)는 SQL의 공통 문법 표준을 정의해요. INNER JOIN, LEFT OUTER JOIN 같은 JOIN 문법은 ANSI SQL 표준에 포함되어 있어서 Oracle, MySQL, PostgreSQL 등 대부분의 데이터베이스에서 동일하게 동작해요.',
    oracleTip:
      'Oracle에서는 ANSI JOIN 외에 (+) 표기법으로 OUTER JOIN을 표현할 수도 있어요. WHERE e.dept_id = d.dept_id(+)는 LEFT OUTER JOIN과 동일해요. 새로 작성하는 코드에서는 ANSI 표준 JOIN을 권장해요.',
  },
  en: {
    chapterTitle: 'JOIN — Combining Tables',
    joinSectionSubtitle:
      'Learn how JOIN connects rows from multiple tables using a join condition, with live simulations for each type.',
    joinIntro:
      'JOIN connects rows from different tables based on a condition in the ON clause. The join type determines which rows are included in the result.',
    joinTypes: [
      {
        key: 'inner',
        icon: (
          <IconArrowsJoin size={16} color="var(--color-blue)" stroke={1.5} />
        ),
        title: 'INNER JOIN',
        desc: 'Returns only rows with matching values in both tables. The most common join type.',
      },
      {
        key: 'left',
        icon: (
          <IconArrowBarToLeft
            size={16}
            color="var(--color-green)"
            stroke={1.5}
          />
        ),
        title: 'LEFT OUTER JOIN',
        desc: 'All rows from the left table, plus matching rows from the right. Non-matching right rows become NULL.',
      },
      {
        key: 'right',
        icon: (
          <IconArrowBarToRight
            size={16}
            color="var(--color-amber)"
            stroke={1.5}
          />
        ),
        title: 'RIGHT OUTER JOIN',
        desc: 'All rows from the right table, plus matching rows from the left. Non-matching left rows become NULL.',
      },
      {
        key: 'full',
        icon: (
          <IconArrowsHorizontal
            size={16}
            color="var(--color-purple)"
            stroke={1.5}
          />
        ),
        title: 'FULL OUTER JOIN',
        desc: 'All rows from both tables. Non-matching rows on either side are filled with NULL.',
      },
      {
        key: 'cross',
        icon: <IconGridDots size={16} color="var(--color-red)" stroke={1.5} />,
        title: 'CROSS JOIN',
        desc: 'Returns every combination of rows (Cartesian product). No ON clause.',
      },
    ],
    joinQueryDesc: {
      inner:
        'Finds rows where dept_id matches in both the employees table and the departments table.',
      left: 'Returns all rows from employees, joined with matching rows from departments. If no matching department exists, dept_name and location are filled with NULL.',
      right:
        'Returns all rows from departments, joined with matching rows from employees. Departments with no employees are included, with emp_id and first_name as NULL.',
      full: "Returns all rows from both employees and departments. Rows with no match on either side have the other table's columns filled with NULL.",
      cross:
        'Combines every row in employees with every row in departments. Returns all possible pairs with no ON condition.',
    },
    joinRowCount: (n: number) => `${n} row${n === 1 ? '' : 's'} returned`,
    ansiDesc:
      'ANSI (American National Standards Institute) defines common SQL syntax standards. JOIN syntax such as INNER JOIN and LEFT OUTER JOIN is part of the ANSI SQL standard, meaning it works the same way across most databases including Oracle, MySQL, and PostgreSQL.',
    oracleTip:
      'Oracle also supports the (+) notation for OUTER JOINs in addition to ANSI syntax. WHERE e.dept_id = d.dept_id(+) is equivalent to a LEFT OUTER JOIN. ANSI standard JOIN syntax is recommended for new code.',
  },
}

// ── JoinSection ─────────────────────────────────────────────────────────────

export function JoinSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const [activeJoin, setActiveJoin] = useState<JoinType>('inner')

  return (
    <PageContainer className="max-w-6xl">
      <ChapterTitle
        icon={
          <IconArrowMerge size={36} color="var(--color-blue)" stroke={1.5} />
        }
        title={t.chapterTitle}
        subtitle={t.joinSectionSubtitle}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-6"
      >
        <Prose className="pt-2.5">{t.joinIntro}</Prose>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
          {/* LEFT: JOIN type selector */}
          <div className="flex flex-col gap-2">
            {(
              t.joinTypes as Array<{
                key: string
                icon: ReactNode
                title: string
                desc: string
              }>
            ).map((jt) => {
              const jk = jt.key as JoinType
              const isActive = activeJoin === jk
              return (
                <button
                  key={jk}
                  onClick={() => setActiveJoin(jk)}
                  className={cn(
                    'rounded-panel flex items-start gap-3 border-2 p-3 text-left transition-all',
                    isActive
                      ? `${JOIN_COLOR[jk].bg} ${JOIN_COLOR[jk].border} `
                      : 'border-line bg-paper hover:bg-rail'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-card mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-sm font-bold',
                      isActive ? JOIN_COLOR[jk].badge : 'bg-rail text-ink-2'
                    )}
                  >
                    {jt.icon}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        'font-mono text-xs font-bold',
                        isActive ? JOIN_COLOR[jk].text : 'text-ink/70'
                      )}
                    >
                      {jt.title}
                    </div>
                    <div
                      className={cn(
                        'mt-0.5 text-[11px] leading-snug',
                        isActive ? 'text-ink/70' : 'text-ink-2'
                      )}
                    >
                      {jt.desc}
                    </div>
                  </div>
                  {isActive && (
                    <span
                      className={cn(
                        'mt-0.5 ml-auto shrink-0 text-xs',
                        JOIN_COLOR[jk].text
                      )}
                    >
                      ◀
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* RIGHT: SQL + diagram + animation simulator */}
          <div
            className={cn(
              'rounded-panel border p-4 transition-colors',
              C.bg,
              C.border
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeJoin}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3"
              >
                {/* SQL 블록(왼쪽) + 벤 다이어그램(오른쪽, 크게) */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <SqlHighlight
                    sql={JOIN_SQL[activeJoin]}
                    className="min-w-0 flex-1"
                  />
                  <div className="shrink-0 sm:w-44">
                    <JoinDiagram type={activeJoin} />
                  </div>
                </div>

                <JoinSimulator
                  type={activeJoin}
                  rowCountLabel={t.joinRowCount}
                  queryDesc={t.joinQueryDesc[activeJoin]}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <InfoBox variant="note">{t.ansiDesc}</InfoBox>
          <InfoBox variant="tip">{t.oracleTip}</InfoBox>
        </div>
      </motion.div>
    </PageContainer>
  )
}
