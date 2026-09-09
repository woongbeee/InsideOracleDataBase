import {
  PageContainer,
  ChapterTitle,
  SectionTitle,
  Prose,
  InfoBox,
  Divider,
} from '../../shared'
import { useSimulationStore } from '@/store/simulationStore'
import { IconSortAscending } from '@tabler/icons-react'
import { CLAUSE_DEMOS } from './clauseDemos'
import { ClickableSyntaxRow, SyntaxRow } from './MiniSimulator'

const T = {
  ko: {
    chapterTitle: 'ORDER BY / GROUP BY / HAVING',
    clausesSectionSubtitle:
      '데이터 조회 결과를 정렬하고, 특정 컬럼값을 기준으로 그룹화(Grouping)하고, 그룹화된 데이터를 필터링하는 방법을 알아봐요.',
    orderByTitle: 'ORDER BY — 결과 정렬',
    orderByDesc:
      'SELECT 결과를 하나 이상의 컬럼 기준으로 정렬해요. ASC(오름차순, 기본값)와 DESC(내림차순)를 지정할 수 있어요. ORDER BY는 SQL 실행 순서에서 가장 마지막에 처리돼요.',
    orderByOps: [
      ['구문', '설명'],
      ['ORDER BY col', 'col 기준 오름차순 정렬 (ASC 기본)'],
      ['ORDER BY col DESC', 'col 기준 내림차순 정렬'],
      ['ORDER BY col1, col2', '여러 컬럼 순서대로 정렬 (1차·2차 기준)'],
      ['ORDER BY 2', 'SELECT의 두 번째 컬럼 기준 정렬'],
      ['ORDER BY col NULLS LAST', 'NULL 값을 정렬 결과 맨 마지막으로'],
      ['ORDER BY col NULLS FIRST', 'NULL 값을 정렬 결과 맨 처음으로'],
    ],
    groupByTitle: 'GROUP BY — 그룹 집계',
    groupByDesc:
      '같은 값을 가진 행들을 하나의 그룹으로 묶고, COUNT·SUM·AVG·MAX·MIN 같은 집계 함수를 적용해요. GROUP BY에 쓰이지 않은 컬럼을 SELECT 절에서 쓸 때는 반드시 집계 함수와 함께 써야 해요.',
    groupByOps: [
      ['집계 함수', '설명'],
      ['COUNT(*)', '그룹 내 행 수'],
      ['AVG(col)', '그룹 내 col 평균'],
      ['SUM(col)', '그룹 내 col 합계'],
      ['MAX(col) / MIN(col)', '그룹 내 col 최댓값 / 최솟값'],
    ],
    groupByAliasTip:
      'AS로 컬럼에 별명(Alias)을 붙일 수 있어요. 컬럼명이 길 때 유용해요. AS 키워드를 생략하고 별명만 써도 돼요.\nSELECT AVG(salary) avg_sal  →  결과 컬럼명이 avg_sal로 표시돼요.',
    havingTitle: 'HAVING — 그룹 조건 필터',
    havingDesc:
      'WHERE는 개별 행을 필터링하지만, HAVING은 GROUP BY로 만들어진 그룹을 필터링해요. 집계 함수 결과에 조건을 걸 때 사용해요.',
    havingTip:
      'WHERE는 집계 전(개별 행), HAVING은 집계 후(그룹) 필터예요. 가능하면 WHERE로 먼저 행을 줄인 뒤 GROUP BY를 실행하는 게 성능에 유리해요.',
  },
  en: {
    chapterTitle: 'ORDER BY / GROUP BY / HAVING',
    clausesSectionSubtitle:
      'Learn how to sort query results, group rows by column values, and filter grouped data.',
    orderByTitle: 'ORDER BY — Sorting Results',
    orderByDesc:
      'Sorts the SELECT result by one or more columns. ASC (ascending, default) or DESC (descending) can be specified. ORDER BY is processed last when SQL is executed.',
    orderByOps: [
      ['Syntax', 'Description'],
      ['ORDER BY col', 'Sort by col ascending (ASC default)'],
      ['ORDER BY col DESC', 'Sort by col descending'],
      ['ORDER BY col1, col2', 'Sort by multiple columns in order'],
      ['ORDER BY 2', 'Sort by the 2nd column in SELECT'],
      ['ORDER BY col NULLS LAST', 'Place NULL values at the end of results'],
      ['ORDER BY col NULLS FIRST', 'Place NULL values at the start of results'],
    ],
    groupByTitle: 'GROUP BY — Grouping & Aggregation',
    groupByDesc:
      'Group rows with the same value into a single group and applies aggregate functions like COUNT, SUM, AVG, MAX, and MIN. Columns not listed in GROUP BY must always be used with an aggregate function in the SELECT clause.',
    groupByOps: [
      ['Function', 'Description'],
      ['COUNT(*)', 'Number of rows in the group'],
      ['AVG(col)', 'Average of col in the group'],
      ['SUM(col)', 'Sum of col in the group'],
      ['MAX(col) / MIN(col)', 'Max / min value of col in the group'],
    ],
    groupByAliasTip:
      'Use AS to assign an alias to a column. This is especially useful for aggregate function results with long names. AS is optional.\nSELECT AVG(salary) AS avg_sal  →  the result column is displayed as avg_sal.',
    havingTitle: 'HAVING — Filtering Groups',
    havingDesc:
      'WHERE filters individual rows, but HAVING filters the groups created by GROUP BY. Use it when you need to apply conditions on aggregate function results.',
    havingTip:
      'WHERE filters before aggregation (individual rows); HAVING filters after (groups). For best performance, reduce rows with WHERE first, then aggregate.',
  },
}

export function ClausesSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]
  const orderByDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'orderby')!
  const groupByDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'groupby')!
  const havingDemo = CLAUSE_DEMOS.find((d) => d.sectionKey === 'having')!

  return (
    <PageContainer className="max-w-6xl">
      <ChapterTitle
        icon={
          <IconSortAscending size={36} color="var(--color-blue)" stroke={1.5} />
        }
        title={t.chapterTitle}
        subtitle={t.clausesSectionSubtitle}
      />

      {/* ── ORDER BY ── */}
      <ClickableSyntaxRow
        demo={orderByDemo}
        header={t.orderByOps[0]}
        rows={t.orderByOps.slice(1)}
        topContent={
          <>
            <SectionTitle>{t.orderByTitle}</SectionTitle>
            <Prose>{t.orderByDesc}</Prose>
          </>
        }
      />

      <Divider />

      {/* ── GROUP BY ── */}
      <ClickableSyntaxRow
        demo={groupByDemo}
        header={t.groupByOps[0]}
        rows={t.groupByOps.slice(1)}
        topContent={
          <>
            <SectionTitle>{t.groupByTitle}</SectionTitle>
            <Prose>{t.groupByDesc}</Prose>
          </>
        }
        bottomContent={<InfoBox variant="tip">{t.groupByAliasTip}</InfoBox>}
      />

      <Divider />

      {/* ── HAVING ── */}
      <SyntaxRow
        demo={havingDemo}
        left={
          <>
            <SectionTitle>{t.havingTitle}</SectionTitle>
            <Prose>{t.havingDesc}</Prose>
            <InfoBox variant="tip">{t.havingTip}</InfoBox>
          </>
        }
      />
    </PageContainer>
  )
}
