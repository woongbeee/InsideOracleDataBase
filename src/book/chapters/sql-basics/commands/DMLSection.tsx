import {
  PageContainer,
  ChapterTitle,
  Prose,
  InfoBox,
  AccordionSection,
} from '../../shared'
import { useSimulationStore } from '@/store/simulationStore'
import {
  IconEdit,
  IconTable,
  IconFilter,
  IconTrash,
  IconPlayerPlay,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { CLAUSE_COLOR, CLAUSE_DEMOS } from '../dml-more/clauseDemos'
import { ClickableSyntaxRow, SyntaxRow } from '../dml-more/MiniSimulator'

const T = {
  ko: {
    chapterTitle: 'DML — Data Manipulation Language',
    chapterSubtitle:
      '데이터를 조회·수정·삭제하는 가장 기본적인 명령어인 SELECT, FROM, WHERE, UPDATE, DELETE를 알아봐요.',
    clauseTitle: '핵심 절(Clause) 정리',
    clauses: [
      {
        kw: 'SELECT',
        color: 'blue',
        icon: (
          <IconPlayerPlay size={16} color="var(--color-blue)" stroke={1.5} />
        ),
        title: '컬럼 선택',
        desc: '조회할 컬럼명을 적어요. 여러 컬럼을 적을 때는 쉼표로 연결하고, *를 쓰면 전체 컬럼을 조회해요.',
      },
      {
        kw: 'FROM',
        color: 'violet',
        icon: <IconTable size={16} color="var(--color-purple)" stroke={1.5} />,
        title: '테이블 지정',
        desc: '데이터를 가져올 테이블(또는 뷰)을 지정해요.',
      },
      {
        kw: 'WHERE',
        color: 'orange',
        icon: <IconFilter size={16} color="var(--color-amber)" stroke={1.5} />,
        title: '데이터 필터',
        desc: 'FROM 절에 지정한 테이블에서 어떤 행을 가져올지 조건을 적어요.',
      },
      {
        kw: 'UPDATE',
        color: 'amber',
        icon: <IconEdit size={16} color="var(--color-amber)" stroke={1.5} />,
        title: '데이터 수정',
        desc: '테이블에 저장된 데이터를 수정하는 명령어예요.',
      },
      {
        kw: 'DELETE',
        color: 'rose',
        icon: <IconTrash size={16} color="var(--color-red)" stroke={1.5} />,
        title: '데이터 삭제',
        desc: '테이블에 저장된 데이터를 삭제하는 명령어예요.',
      },
    ],
    selectTitle: 'SELECT — 데이터 조회',
    selectDesc:
      '가장 자주 쓰는 구문이에요. SELECT 뒤에 컬럼명, FROM 뒤에 테이블명, WHERE 절에 조건을 적어서 원하는 데이터를 조회해요.',
    distinctTitle: 'DISTINCT — 중복 제거',
    distinctDesc:
      'SELECT DISTINCT는 결과에서 중복된 행을 제거해줘요. 여러 컬럼을 지정하면 해당 컬럼 조합이 동일한 행을 중복으로 처리해요.',
    distinctTip:
      'DISTINCT는 결과 전체에 Sort 또는 Hash 연산을 수행하기 때문에 대용량 테이블에서는 성능 비용이 발생해요. 꼭 필요할 때만 쓰고, 가능하면 WHERE로 먼저 행을 줄이세요.',
    distinctOps: [
      ['구문', '설명'],
      ['SELECT DISTINCT col', 'col 값이 같은 행을 중복으로 처리해요'],
      [
        'SELECT DISTINCT col1, col2',
        'col1과 col2 두 값이 모두 같은 행을 중복으로 처리해요',
      ],
    ],
    whereTitle: 'WHERE — 행 필터링',
    whereDesc:
      'WHERE 절에는 어떤 데이터를 가져올지 조건을 적어요. 비교 연산자(=, >, <, !=)와 논리 연산자(AND, OR, NOT), LIKE, IN, BETWEEN을 사용해서 조건을 기술해요.',
    whereOps: [
      ['연산자', '의미', '예시'],
      ['=', '같음', 'dept_id = 10'],
      ['!= / <>', '같지 않음', 'dept_id != 10'],
      ['> / >= / < / <=', '크기 비교', 'salary >= 7000'],
      [
        'BETWEEN a AND b',
        '범위 설정 (a 이상 b 이하)',
        'salary BETWEEN 5000 AND 7500',
      ],
      [
        'NOT BETWEEN a AND b',
        'BETWEEN 범위 밖',
        'salary NOT BETWEEN 5000 AND 7500',
      ],
      ['LIKE', '패턴 매칭 (% : 임의 문자)', "last_name LIKE 'K%'"],
      ['IN (a, b, …)', '목록 중 하나', 'dept_id IN (10, 20)'],
      ['IS NULL / IS NOT NULL', 'NULL 여부 확인', 'manager_id IS NULL'],
      ['AND', '적힌 조건 모두 참', 'dept_id = 20 AND salary >= 5500'],
      ['OR', '적힌 조건들 중 하나라도 참', 'dept_id = 10 OR dept_id = 30'],
    ],
    whereNullTip:
      "NULL은 값이 없음을 나타내는 특수한 상태예요. 0이나 빈 문자열('')과는 달라요. NULL과의 비교는 항상 UNKNOWN이 되기 때문에 = NULL이나 != NULL은 동작하지 않아요. NULL 여부를 확인할 때는 반드시 IS NULL / IS NOT NULL을 사용하세요.",
    updateTitle: 'UPDATE — 데이터 수정',
    updateDesc:
      'UPDATE는 기존 행의 값을 바꿔요. SET 절에 수정할 컬럼명과 새 값을 적고, WHERE 절에 수정하려는 행의 조건을 기술해요.',
    updateWarning:
      'WHERE 절 없이 UPDATE를 실행하면 테이블의 모든 행이 수정돼요. 항상 먼저 SELECT로 대상 행을 확인한 뒤 실행하세요.',
    deleteTitle: 'DELETE — 데이터 삭제',
    deleteDesc:
      'WHERE 절에 조건을 기술해서 해당하는 행을 삭제해요. WHERE 절을 쓰지 않으면 테이블의 전체 행이 삭제되니 주의하세요.',
    deleteTip:
      'DELETE는 행 단위로 Undo 로그를 남기기 때문에 느릴 수 있어요. (대신 ROLLBACK이 가능해요.) 전체 행을 지워야 한다면 TRUNCATE TABLE이 훨씬 빨라요.\n\nTRUNCATE는 "잘라내다"는 뜻이에요. TRUNCATE TABLE은 테이블의 모든 행을 한 번에 제거하는 DDL 명령이에요. DELETE와 달리 행별 Undo 로그를 남기지 않아서 매우 빠르지만, ROLLBACK은 불가능해요.',
  },
  en: {
    chapterTitle: 'Core Syntax — SELECT / FROM / WHERE',
    chapterSubtitle:
      'Learn the most fundamental commands for querying, modifying, and deleting data — SELECT, FROM, WHERE, UPDATE, and DELETE.',
    clauseTitle: 'Key Clause Reference',
    clauses: [
      {
        kw: 'SELECT',
        color: 'blue',
        icon: (
          <IconPlayerPlay size={16} color="var(--color-blue)" stroke={1.5} />
        ),
        title: 'Column Selection',
        desc: 'Write the column names to retrieve. Separate multiple columns with commas. * retrieves all columns.',
      },
      {
        kw: 'FROM',
        color: 'violet',
        icon: <IconTable size={16} color="var(--color-purple)" stroke={1.5} />,
        title: 'Table Source',
        desc: 'Specifies the table or view to retrieve data from.',
      },
      {
        kw: 'WHERE',
        color: 'orange',
        icon: <IconFilter size={16} color="var(--color-amber)" stroke={1.5} />,
        title: 'Data Filter',
        desc: 'Write the condition that determines which rows to retrieve from the table specified in FROM.',
      },
      {
        kw: 'UPDATE',
        color: 'amber',
        icon: <IconEdit size={16} color="var(--color-amber)" stroke={1.5} />,
        title: 'Data Modification',
        desc: 'A command that modifies data already stored in a table.',
      },
      {
        kw: 'DELETE',
        color: 'rose',
        icon: <IconTrash size={16} color="var(--color-red)" stroke={1.5} />,
        title: 'Data Deletion',
        desc: 'A command that deletes data already stored in a table.',
      },
    ],
    selectTitle: 'SELECT — Querying Data',
    selectDesc:
      'The most commonly used command for querying data. Write column names after SELECT, the table name after FROM, and conditions in the WHERE clause to retrieve the data you want.',
    distinctTitle: 'DISTINCT — Removing Duplicates',
    distinctDesc:
      'SELECT DISTINCT eliminates duplicate rows from the result. When multiple columns are specified, rows where all listed column values are identical are considered duplicates.',
    distinctTip:
      'DISTINCT triggers a Sort or Hash operation over the entire result set, which can be costly on large tables. Use it only when necessary, and reduce rows with WHERE first.',
    distinctOps: [
      ['Syntax', 'Description'],
      [
        'SELECT DISTINCT col',
        'Rows with the same col value are treated as duplicates',
      ],
      [
        'SELECT DISTINCT col1, col2',
        'Rows where both col1 and col2 are identical are treated as duplicates',
      ],
    ],
    whereTitle: 'WHERE — Filtering Rows',
    whereDesc:
      'In the WHERE clause, you can write conditions that determine which data to retrieve. Use comparison operators (=, >, <, !=) and logical operators (AND, OR, NOT), along with LIKE, IN, and BETWEEN to specify conditions.',
    whereOps: [
      ['Operator', 'Meaning', 'Example'],
      ['=', 'Equal', 'dept_id = 10'],
      ['!= / <>', 'Not equal', 'dept_id != 10'],
      ['> / >= / < / <=', 'Comparison', 'salary >= 7000'],
      [
        'BETWEEN a AND b',
        'Range (a to b inclusive)',
        'salary BETWEEN 5000 AND 7500',
      ],
      [
        'NOT BETWEEN a AND b',
        'Outside the BETWEEN range',
        'salary NOT BETWEEN 5000 AND 7500',
      ],
      ['LIKE', 'Pattern match (% = wildcard)', "last_name LIKE 'K%'"],
      ['IN (a, b, …)', 'Value in list', 'dept_id IN (10, 20)'],
      ['IS NULL / IS NOT NULL', 'NULL check', 'manager_id IS NULL'],
      [
        'AND',
        'All listed conditions are true',
        'dept_id = 20 AND salary >= 5500',
      ],
      [
        'OR',
        'At least one listed condition is true',
        'dept_id = 10 OR dept_id = 30',
      ],
    ],
    whereNullTip:
      "What is NULL? — NULL represents the absence of a value. It is not the same as 0 or an empty string (''). Any comparison with NULL evaluates to UNKNOWN, so = NULL and != NULL do not work. Always use IS NULL / IS NOT NULL to check for NULL.",
    updateTitle: 'UPDATE — Modifying Data',
    updateDesc:
      'UPDATE changes existing row values. Write the column name and new value in the SET clause, and specify the condition for the rows to modify in the WHERE clause. Omitting WHERE updates every row in the table.',
    updateWarning:
      'Running UPDATE without a WHERE clause modifies every row in the table. Always verify your target rows with a SELECT first.',
    deleteTitle: 'DELETE — Removing Data',
    deleteDesc:
      'Write a condition in the WHERE clause to delete the matching rows. Omitting WHERE deletes all rows.',
    deleteTip:
      'DELETE writes per-row undo logs and can be slow. (However, ROLLBACK is possible.) For full-table removal, TRUNCATE TABLE is much faster.\n\nTRUNCATE means "to cut off". TRUNCATE TABLE is a DDL command that removes all rows from a table at once. Unlike DELETE, it does not write per-row undo logs — making it extremely fast — but ROLLBACK is not possible.',
  },
}

export function DMLSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const introDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'intro')!
  const selectDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'select')!
  const distinctDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'distinct')!
  const whereDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'where')!
  const updateDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'update')!
  const deleteDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'delete')!

  return (
    <PageContainer className="max-w-6xl">
      <ChapterTitle
        icon={<IconEdit size={36} color="var(--color-blue)" stroke={1.5} />}
        title={t.chapterTitle}
        subtitle={t.chapterSubtitle}
      />

      {/* ── Intro: clause overview ── */}
      <SyntaxRow
        demo={introDemo}
        left={
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {t.clauses.map((c) => (
                <div
                  key={c.kw}
                  className={cn(
                    'rounded-card border p-3',
                    CLAUSE_COLOR[c.color]
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-base">{c.icon}</span>
                    <code className="rounded bg-current/10 px-1.5 py-0.5 font-mono text-xs font-bold">
                      {c.kw}
                    </code>
                  </div>
                  <div className="mb-0.5 text-xs font-bold">{c.title}</div>
                  <div className="text-xs leading-relaxed opacity-80">
                    {c.desc}
                  </div>
                </div>
              ))}
            </div>
          </>
        }
      />

      {/* ── SELECT ── */}
      <AccordionSection title={t.selectTitle} defaultOpen>
        <SyntaxRow demo={selectDemo} left={<Prose>{t.selectDesc}</Prose>} />
      </AccordionSection>

      {/* ── DISTINCT ── */}
      <AccordionSection title={t.distinctTitle}>
        <ClickableSyntaxRow
          demo={distinctDemo}
          header={t.distinctOps[0]}
          rows={t.distinctOps.slice(1)}
          topContent={<Prose>{t.distinctDesc}</Prose>}
          bottomContent={<InfoBox variant="tip">{t.distinctTip}</InfoBox>}
        />
      </AccordionSection>

      {/* ── WHERE ── */}
      <AccordionSection title={t.whereTitle}>
        <ClickableSyntaxRow
          demo={whereDemo}
          header={t.whereOps[0]}
          rows={t.whereOps.slice(1)}
          topContent={<Prose>{t.whereDesc}</Prose>}
          bottomContent={<InfoBox variant="note">{t.whereNullTip}</InfoBox>}
        />
      </AccordionSection>

      {/* ── UPDATE ── */}
      <AccordionSection title={t.updateTitle}>
        <SyntaxRow
          demo={updateDemo}
          left={
            <>
              <Prose>{t.updateDesc}</Prose>
              <InfoBox variant="warning">{t.updateWarning}</InfoBox>
            </>
          }
        />
      </AccordionSection>

      {/* ── DELETE ── */}
      <AccordionSection title={t.deleteTitle}>
        <SyntaxRow
          demo={deleteDemo}
          left={
            <>
              <Prose>{t.deleteDesc}</Prose>
              <InfoBox variant="tip">
                <span style={{ whiteSpace: 'pre-line' }}>{t.deleteTip}</span>
              </InfoBox>
            </>
          }
        />
      </AccordionSection>
    </PageContainer>
  )
}
