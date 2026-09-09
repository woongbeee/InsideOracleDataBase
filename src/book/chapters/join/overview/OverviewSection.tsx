import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconArrowMerge,
  IconBolt,
  IconArrowsJoin,
  IconArrowBarToLeft,
  IconArrowBarToRight,
  IconArrowsHorizontal,
  IconGridDots,
} from '@tabler/icons-react'
import { useSimulationStore } from '@/store/simulationStore'
import {
  PageContainer,
  ChapterTitle,
  SectionTitle,
  Prose,
  Divider,
} from '../../shared'
import { cn } from '@/lib/utils'
import { JoinSimulator, JOIN_SQL, type JoinType } from '@/components/join-sim'
import { SqlHighlight } from '../../sql-basics/dml-more/SqlHighlight'

const T = {
  ko: {
    title: '조인 원리와 활용',
    subtitle:
      '두 개의 데이터 원본을 하나의 결과 집합으로 결합하는 세 가지 조인 알고리즘의 동작 원리를 알아봐요.',

    whatTitle: '조인이란?',
    whatDesc:
      '조인은 정확히 두 개의 데이터 원본(테이블 또는 뷰)의 결과를 하나의 결과 집합으로 결합해요. 두 개보다 많은 테이블을 포함하는 쿼리에서 Oracle은 한 번에 두 개씩 조인하며, 중간 결과가 다음 조인의 한쪽 입력이 돼요.\n\n조인 조건(join condition)은 두 데이터 원본을 비교하는 표현식이에요. 조인 조건이 없으면 카테시안 조인(Cartesian join)이 발생해요 — 한 테이블의 모든 행이 다른 테이블의 모든 행과 매칭돼요.',

    methodsTitle: '세 가지 조인 알고리즘',
    methods: [
      {
        id: 'Nested Loop Join',
        color: 'border-blue/30 bg-blue/5',
        badge: 'bg-blue/10 text-blue',
        title: 'Nested Loop Join',
        desc: 'Outer 테이블의 각 행마다 Inner 테이블을 반복 탐색해요. Inner 테이블에 선택도 높은 인덱스가 있을 때 가장 효율적이에요.',
      },
      {
        id: 'Hash Join',
        color: 'border-amber/30 bg-amber/5',
        badge: 'bg-amber/10 text-amber',
        title: 'Hash Join',
        desc: '작은 테이블(빌드 입력)을 해시 테이블로 PGA에 적재한 뒤, 큰 테이블(프로브 입력)을 스캔하면서 해시 키로 매칭해요. 등치(=) 조건에만 사용할 수 있어요.',
      },
      {
        id: 'Sort Merge Join',
        color: 'border-purple/30 bg-purple/5',
        badge: 'bg-purple/10 text-purple',
        title: 'Sort Merge Join',
        desc: '양쪽 데이터 집합을 조인 키로 정렬한 뒤 병합해요. 비등치(범위) 조인이나 이미 정렬된 데이터에서 특히 유리해요.',
      },
    ],

    joinSimTitle: 'SQL JOIN 종류 시뮬레이션',
    joinSimSubtitle:
      '조인 종류를 선택하면 테이블 결합 과정을 단계별로 확인할 수 있어요.',
    joinTypes: [
      {
        key: 'inner' as JoinType,
        icon: <IconArrowsJoin size={14} />,
        label: 'INNER JOIN',
      },
      {
        key: 'left' as JoinType,
        icon: <IconArrowBarToLeft size={14} />,
        label: 'LEFT OUTER',
      },
      {
        key: 'right' as JoinType,
        icon: <IconArrowBarToRight size={14} />,
        label: 'RIGHT OUTER',
      },
      {
        key: 'full' as JoinType,
        icon: <IconArrowsHorizontal size={14} />,
        label: 'FULL OUTER',
      },
      {
        key: 'cross' as JoinType,
        icon: <IconGridDots size={14} />,
        label: 'CROSS JOIN',
      },
    ],
    joinQueryDesc: {
      inner: 'employees와 departments 테이블에서 dept_id가 같은 행만 반환해요.',
      left: 'employees 테이블의 모든 행을 가져오고, 일치하는 departments 행을 결합해요. 일치하는 부서가 없으면 NULL로 채워요.',
      right:
        'departments 테이블의 모든 행을 가져오고, 일치하는 employees 행을 결합해요. 소속 직원이 없는 부서도 포함돼요.',
      full: '양쪽 테이블의 모든 행을 가져와요. 일치하지 않는 쪽은 NULL로 채워요.',
      cross: '모든 행의 조합(카테시안 곱)을 반환해요. ON 조건이 없어요.',
    },
    joinRowCount: (n: number) => `${n}개 행 반환`,
  },
  en: {
    title: 'Join Principles & Usage',
    subtitle:
      'Learn the mechanics of the three join algorithms Oracle uses to combine two row sources into a single result set.',

    whatTitle: 'What Is a Join?',
    whatDesc:
      'A join combines the output of exactly two row sources — tables or views — into a single result set. For queries involving more than two tables, Oracle joins them two at a time, with each intermediate result becoming one input of the next join.\n\nA join condition is an expression that compares two row sources and defines the relationship between them. When no join condition exists, a Cartesian join occurs — every row in one table is matched with every row in the other.',

    methodsTitle: 'Three Join Algorithms',
    methods: [
      {
        id: 'Nested Loop Join',
        color: 'border-blue/30 bg-blue/5',
        badge: 'bg-blue/10 text-blue',
        title: 'Nested Loop Join',
        desc: 'For each row in the outer table, Oracle probes the inner table for matching rows. Most efficient when the inner table has a highly selective index.',
      },
      {
        id: 'Hash Join',
        color: 'border-amber/30 bg-amber/5',
        badge: 'bg-amber/10 text-amber',
        title: 'Hash Join',
        desc: 'Loads the smaller table (build input) into a hash table in PGA, then scans the larger table (probe input) matching by hash key. Requires an equality (=) join condition.',
      },
      {
        id: 'Sort Merge Join',
        color: 'border-purple/30 bg-purple/5',
        badge: 'bg-purple/10 text-purple',
        title: 'Sort Merge Join',
        desc: 'Sorts both datasets on the join key, then merges them sequentially. Especially efficient for non-equijoins (range conditions) or pre-sorted data.',
      },
    ],

    joinSimTitle: 'SQL JOIN Type Simulation',
    joinSimSubtitle:
      'Select a join type to see the table-combining process step by step.',
    joinTypes: [
      {
        key: 'inner' as JoinType,
        icon: <IconArrowsJoin size={14} />,
        label: 'INNER JOIN',
      },
      {
        key: 'left' as JoinType,
        icon: <IconArrowBarToLeft size={14} />,
        label: 'LEFT OUTER',
      },
      {
        key: 'right' as JoinType,
        icon: <IconArrowBarToRight size={14} />,
        label: 'RIGHT OUTER',
      },
      {
        key: 'full' as JoinType,
        icon: <IconArrowsHorizontal size={14} />,
        label: 'FULL OUTER',
      },
      {
        key: 'cross' as JoinType,
        icon: <IconGridDots size={14} />,
        label: 'CROSS JOIN',
      },
    ],
    joinQueryDesc: {
      inner:
        'Returns only rows where dept_id matches in both employees and departments.',
      left: 'Returns all rows from employees, joined with matching departments rows. Non-matching departments columns are NULL.',
      right:
        'Returns all rows from departments, joined with matching employees rows. Departments with no employees are included.',
      full: 'Returns all rows from both tables. Non-matching rows on either side are filled with NULL.',
      cross:
        'Returns every combination of rows (Cartesian product). No ON condition.',
    },
    joinRowCount: (n: number) => `${n} row${n === 1 ? '' : 's'} returned`,
  },
}

const JOIN_TAB_COLOR: Record<
  JoinType,
  {
    active: string
    inactive: string
    border: string
    bg: string
    badge: string
    var: string
  }
> = {
  inner: {
    active: 'border-green/50 bg-green/5 text-green',
    inactive: 'border-line text-ink-2 hover:bg-rail',
    border: 'border-green/50',
    bg: 'bg-green/5',
    badge: 'bg-green/10 text-green',
    var: 'var(--color-green)',
  },
  left: {
    active: 'border-blue/50 bg-blue/5 text-blue',
    inactive: 'border-line text-ink-2 hover:bg-rail',
    border: 'border-blue/50',
    bg: 'bg-blue/5',
    badge: 'bg-blue/10 text-blue',
    var: 'var(--color-blue)',
  },
  right: {
    active: 'border-purple/50 bg-purple/5 text-purple',
    inactive: 'border-line text-ink-2 hover:bg-rail',
    border: 'border-purple/50',
    bg: 'bg-purple/5',
    badge: 'bg-purple/10 text-purple',
    var: 'var(--color-purple)',
  },
  full: {
    active: 'border-amber/50 bg-amber/5 text-amber',
    inactive: 'border-line text-ink-2 hover:bg-rail',
    border: 'border-amber/50',
    bg: 'bg-amber/5',
    badge: 'bg-amber/10 text-amber',
    var: 'var(--color-amber)',
  },
  cross: {
    active: 'border-red/50 bg-red/5 text-red',
    inactive: 'border-line text-ink-2 hover:bg-rail',
    border: 'border-red/50',
    bg: 'bg-red/5',
    badge: 'bg-red/10 text-red',
    var: 'var(--color-red)',
  },
}

// ── JoinDiagram ──────────────────────────────────────────────────────────────
// 조인 종류(교집합·합집합 등)를 나타내는 벤 다이어그램. 이 페이지 전용 구현.
// EMP = 왼쪽 원, DEPT = 오른쪽 원.

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
  const c = JOIN_TAB_COLOR[type]

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
            <clipPath id={`jd-ov-${type}`}>
              <circle cx={JD_L_CX} cy={JD_CY} r={JD_R} />
            </clipPath>
            <circle
              cx={JD_R_CX}
              cy={JD_CY}
              r={JD_R}
              fill={highlight}
              stroke="none"
              clipPath={`url(#jd-ov-${type})`}
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

export function JoinOverviewSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const [activeJoin, setActiveJoin] = useState<JoinType>('inner')

  return (
    <PageContainer>
      <ChapterTitle
        icon={<IconArrowMerge size={36} stroke={1.5} className="text-green" />}
        title={t.title}
        subtitle={t.subtitle}
      />

      <SectionTitle>{t.whatTitle}</SectionTitle>
      <Prose>{t.whatDesc}</Prose>

      <Divider />

      <SectionTitle>{t.methodsTitle}</SectionTitle>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {t.methods.map((item) => (
          <div
            key={item.id}
            className={cn('rounded-panel border-2 p-4', item.color)}
          >
            <div className="mb-2 flex items-center gap-2">
              <IconBolt size={14} className="text-ink-2 shrink-0" />
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                  item.badge
                )}
              >
                {item.id}
              </span>
            </div>
            <p className="text-ink/80 mb-1 font-mono text-xs font-bold">
              {item.title}
            </p>
            <p className="text-ink-2 text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <Divider />

      <SectionTitle>{t.joinSimTitle}</SectionTitle>
      <p className="text-ink-2 mb-4 text-sm">{t.joinSimSubtitle}</p>

      {/* JOIN type tab switcher */}
      <div className="mb-4 flex flex-wrap gap-2">
        {t.joinTypes.map((jt) => {
          const isActive = activeJoin === jt.key
          return (
            <button
              key={jt.key}
              onClick={() => setActiveJoin(jt.key)}
              className={cn(
                'rounded-card flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs font-bold transition-all',
                isActive
                  ? JOIN_TAB_COLOR[jt.key].active
                  : JOIN_TAB_COLOR[jt.key].inactive
              )}
            >
              {jt.icon}
              {jt.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-panel bg-rail border p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeJoin}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
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
    </PageContainer>
  )
}
