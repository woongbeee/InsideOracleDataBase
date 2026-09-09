import { useState } from 'react'
import {
  PageContainer,
  ChapterTitle,
  Prose,
  Divider,
  InfoBox,
  TermPopup,
  AccordionSection,
} from '../../shared'
import { IconCalendarEvent } from '@tabler/icons-react'
import { SqlHighlight } from './SqlHighlight'
import { useSimulationStore } from '@/store/simulationStore'

// ── Types ──────────────────────────────────────────────────────────────────

interface ArithRow {
  expr: string
  result: string
  desc: { ko: string; en: string }
}

interface TzSetupBlock {
  title: { ko: string; en: string }
  lines: Array<{ code: string; comment: { ko: string; en: string } }>
}

interface FormatMaskRow {
  mask: string
  example: string
  desc: { ko: string; en: string }
}

interface FuncItem {
  name: string
  signature: string
  desc: { ko: string; en: string }
  example: string
  resultHeaders: string[]
  resultRows: string[][]
  note?: { ko: string; en: string }
  dualInfo?: { ko: string; en: string }
  arith?: { title: { ko: string; en: string }; rows: ArithRow[] }
  arith2?: { title: { ko: string; en: string }; rows: ArithRow[] }
  tzSetup?: TzSetupBlock[]
  vsNote?: { ko: string; en: string }
  tzInfo?: { ko: string; en: string }
  tzConvert?: {
    desc: { ko: string; en: string }
    example: string
    resultHeaders: string[]
    resultRows: string[][]
    tzSetup: TzSetupBlock[]
  }
  castExample?: { sql: string; headers: string[]; rows: string[][] }
  formatMasks?: { title: { ko: string; en: string }; rows: FormatMaskRow[] }
  nlsNote?: { ko: string; en: string }
}

// ── Data ───────────────────────────────────────────────────────────────────

const FUNC_ITEMS: FuncItem[] = [
  {
    name: 'SYSDATE',
    signature: 'SYSDATE',
    desc: {
      ko: 'DB 서버의 현재 날짜와 시간을 반환해요. 인자가 없으며 FROM DUAL과 함께 자주 사용돼요. 시·분·초까지 포함된 DATE 타입을 반환하고, 타임존 정보는 포함되지 않아요.',
      en: 'Returns the current date and time of the DB server. Takes no arguments and is commonly used with FROM DUAL. Returns a DATE type including hours, minutes, and seconds — without timezone information.',
    },
    dualInfo: {
      ko: 'DUAL은 Oracle이 제공하는 특수한 1행 1열 더미 테이블이에요. 테이블 없이 함수나 표현식의 결과만 조회할 때 FROM DUAL을 사용해요. SELECT SYSDATE FROM DUAL처럼 실제 테이블 없이도 SQL 문법을 유지할 수 있어요.',
      en: 'DUAL is a special one-row, one-column dummy table provided by Oracle. Use FROM DUAL when you only need to evaluate a function or expression without querying a real table — e.g., SELECT SYSDATE FROM DUAL.',
    },
    nlsNote: {
      ko: "예시의 결과값이 실제 실행 결과와 다를 수 있습니다. SYSDATE는 쿼리를 실행하는 시점의 DB 서버 시각을 반환하기 때문에 실행할 때마다 값이 달라집니다. 또한 NLS_DATE_FORMAT 설정에 따라 날짜의 표시 형식도 환경마다 다르게 보일 수 있습니다.\n\nNLS(National Language Support)란 Oracle이 날짜·숫자·문자 표기 방식을 각 나라의 언어 및 지역 설정에 맞게 자동으로 처리하는 기능입니다. SYSDATE를 화면에 표시할 때 어떤 형식으로 보여줄지는 세션의 NLS_DATE_FORMAT 값이 결정합니다.\n\nV$NLS_PARAMETERS 뷰에서 현재 적용된 NLS 설정을 확인할 수 있습니다.\n\n  SELECT parameter, value\n  FROM   V$NLS_PARAMETERS\n  WHERE  parameter = 'NLS_DATE_FORMAT';\n\n결과 예시: NLS_DATE_FORMAT = 'RR/MM/DD'\n\n세션 단위로 바꾸려면 ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS' 명령을 사용합니다. 이 설정은 현재 접속에만 적용되며, SYSDATE를 조회하면 지정한 형식으로 출력됩니다.",
      en: "The example result above may differ from what you see when you run it. SYSDATE returns the DB server's current date and time at the moment the query executes, so the value changes every time. The display format may also vary depending on your session's NLS_DATE_FORMAT setting.\n\nNLS (National Language Support) is Oracle's mechanism for automatically adapting date, number, and character display to each country's language and regional settings. When SYSDATE is displayed, the session's NLS_DATE_FORMAT value controls how it appears.\n\nCheck the current NLS settings via the V$NLS_PARAMETERS view:\n\n  SELECT parameter, value\n  FROM   V$NLS_PARAMETERS\n  WHERE  parameter = 'NLS_DATE_FORMAT';\n\nSample result: NLS_DATE_FORMAT = 'RR/MM/DD'\n\nTo change it for the current session: ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS'. This applies only to the current connection — SYSDATE output will then appear in the specified format.",
    },
    example:
      "SELECT SYSDATE,\n       SYSDATE + 1                      AS tomorrow,\n       SYSDATE - 7                      AS week_ago,\n       SYSDATE + 1/24                   AS plus_1h,\n       SYSDATE + 30/1440                AS plus_30m,\n       SYSDATE - TO_DATE('2025-01-01', 'YYYY-MM-DD') AS days_since\nFROM   DUAL",
    resultHeaders: [
      'SYSDATE',
      'tomorrow',
      'week_ago',
      'plus_1h',
      'plus_30m',
      'days_since',
    ],
    resultRows: [
      [
        '2025-04-25 09:30:00',
        '2025-04-26 09:30:00',
        '2025-04-18 09:30:00',
        '2025-04-25 10:30:00',
        '2025-04-25 10:00:00',
        '114.396',
      ],
    ],
    arith: {
      title: { ko: 'DATE 산술 연산 규칙', en: 'DATE Arithmetic Rules' },
      rows: [
        {
          expr: 'SYSDATE + 1',
          result: '내일 (1일 후)',
          desc: { ko: '정수 1 = 1일', en: 'integer 1 = 1 day' },
        },
        {
          expr: 'SYSDATE - 7',
          result: '7일 전',
          desc: { ko: '정수 7 = 7일', en: 'integer 7 = 7 days' },
        },
        {
          expr: 'SYSDATE + 1/24',
          result: '1시간 후',
          desc: { ko: '1/24일 = 1시간', en: '1/24 day = 1 hour' },
        },
        {
          expr: 'SYSDATE + 30/1440',
          result: '30분 후',
          desc: { ko: '30/1440일 = 30분', en: '30/1440 day = 30 min' },
        },
        {
          expr: 'SYSDATE + 1/86400',
          result: '1초 후',
          desc: { ko: '1/86400일 = 1초', en: '1/86400 day = 1 sec' },
        },
        {
          expr: 'date1 - date2',
          result: '일수 차이 (숫자)',
          desc: {
            ko: 'DATE - DATE = NUMBER',
            en: 'DATE − DATE = NUMBER (days)',
          },
        },
      ],
    },
    note: {
      ko: 'DATE - DATE 연산은 일(day) 단위 NUMBER를 반환해요. 두 날짜 사이의 시간 차이를 구할 때 (date1 - date2) * 24로 시간을, * 1440으로 분을 얻을 수 있어요.',
      en: 'DATE - DATE returns a NUMBER in days. Multiply by 24 for hours, 1440 for minutes, or 86400 for seconds.',
    },
  },
  {
    name: 'SYSTIMESTAMP',
    signature: 'SYSTIMESTAMP',
    tzInfo: {
      ko: "타임존(Timezone)이란 지구를 경도에 따라 나눈 시간 구역입니다. 같은 순간이라도 지역마다 현지 시각이 다르기 때문에 국제 시스템에서는 타임존을 명시해 시각의 기준을 맞춥니다.\n\n타임존을 표현하는 방법은 두 가지입니다.\n\n① 고정 오프셋: '+09:00', '-05:00' 처럼 UTC(협정 세계시)와의 시간 차이를 직접 숫자로 표기합니다.\n② 지역 이름(IANA 데이터베이스): 'Asia/Seoul', 'America/New_York', 'Europe/London', 'UTC' 처럼 도시·지역 이름을 사용합니다. 이 방식은 일광절약시간(DST) 전환을 자동으로 반영합니다.\n\nOracle에서 사용 가능한 전체 타임존 목록은 SELECT * FROM V$TIMEZONE_NAMES 로 조회할 수 있습니다.",
      en: "A timezone is a region of the globe that observes the same standard time. Because the same moment corresponds to different local times in different places, international systems attach timezone information to timestamps so everyone agrees on when something happened.\n\nTimezones are expressed in two ways:\n\n① Fixed offset: '+09:00', '-05:00' — the numeric difference from UTC (Coordinated Universal Time).\n② Region name (IANA database): 'Asia/Seoul', 'America/New_York', 'Europe/London', 'UTC'. This form automatically handles Daylight Saving Time (DST) transitions.\n\nQuery the full list of timezones Oracle supports: SELECT * FROM V$TIMEZONE_NAMES.",
    },
    desc: {
      ko: 'DB 서버의 현재 날짜·시간·소수점 이하 초(Fractional Seconds)와 타임존 오프셋을 포함한 TIMESTAMP WITH TIME ZONE 타입을 반환해요. SYSDATE보다 정밀한 시각이 필요하거나 타임존 정보가 필요할 때 사용해요.',
      en: 'Returns the current date, time, fractional seconds, and timezone offset as TIMESTAMP WITH TIME ZONE. Use when you need sub-second precision or timezone-aware timestamps — more precise than SYSDATE.',
    },
    example:
      "SELECT SYSTIMESTAMP                                AS ts_now,\n       SYSTIMESTAMP + INTERVAL '1' DAY            AS plus_1d,\n       SYSTIMESTAMP - INTERVAL '7' DAY            AS minus_7d,\n       SYSTIMESTAMP + INTERVAL '3' HOUR           AS plus_3h,\n       SYSTIMESTAMP - INTERVAL '30' MINUTE        AS minus_30m,\n       SYSTIMESTAMP + INTERVAL '0.5' SECOND       AS plus_half_sec\nFROM   DUAL",
    resultHeaders: [
      'ts_now',
      'plus_1d',
      'minus_7d',
      'plus_3h',
      'minus_30m',
      'plus_half_sec',
    ],
    resultRows: [
      [
        '2025-04-25 09:30:00.123 +09:00',
        '2025-04-26 09:30:00.123 +09:00',
        '2025-04-18 09:30:00.123 +09:00',
        '2025-04-25 12:30:00.123 +09:00',
        '2025-04-25 09:00:00.123 +09:00',
        '2025-04-25 09:30:00.623 +09:00',
      ],
    ],
    arith: {
      title: {
        ko: 'TIMESTAMP 산술 — INTERVAL 리터럴',
        en: 'TIMESTAMP Arithmetic — INTERVAL Literals',
      },
      rows: [
        {
          expr: "SYSTIMESTAMP + INTERVAL '1' DAY",
          result: '1일 후',
          desc: { ko: '1일 단위 이동', en: 'move by 1 day' },
        },
        {
          expr: "SYSTIMESTAMP + INTERVAL '3' HOUR",
          result: '3시간 후',
          desc: { ko: '시간 단위 이동', en: 'move by hours' },
        },
        {
          expr: "SYSTIMESTAMP - INTERVAL '30' MINUTE",
          result: '30분 전',
          desc: { ko: '분 단위 이동', en: 'move by minutes' },
        },
        {
          expr: "SYSTIMESTAMP + INTERVAL '0.5' SECOND",
          result: '0.5초 후',
          desc: {
            ko: '소수점 이하 초도 가능',
            en: 'fractional seconds supported',
          },
        },
        {
          expr: 'ts1 - ts2',
          result: 'INTERVAL 값',
          desc: {
            ko: 'TIMESTAMP - TIMESTAMP = INTERVAL DAY TO SECOND',
            en: 'result is INTERVAL DAY TO SECOND',
          },
        },
      ],
    },
    arith2: {
      title: {
        ko: 'SYSTIMESTAMP 끼리 뺄셈 예시',
        en: 'SYSTIMESTAMP Subtraction Example',
      },
      rows: [
        {
          expr: 'ts_end - ts_start',
          result: '+00 00:02:35.847000',
          desc: {
            ko: 'INTERVAL DAY TO SECOND 타입 반환',
            en: 'returns INTERVAL DAY TO SECOND',
          },
        },
        {
          expr: '(ts_end - ts_start) * 86400',
          result: '155.847',
          desc: {
            ko: '초 단위로 환산 (INTERVAL → 초)',
            en: 'convert to seconds',
          },
        },
        {
          expr: 'EXTRACT(MINUTE FROM ts_end - ts_start)',
          result: '2',
          desc: {
            ko: 'EXTRACT로 분 단위만 추출',
            en: 'extract minutes with EXTRACT',
          },
        },
        {
          expr: 'EXTRACT(SECOND FROM ts_end - ts_start)',
          result: '35.847',
          desc: {
            ko: 'EXTRACT로 초(소수점 포함) 추출',
            en: 'extract seconds (with fractions)',
          },
        },
      ],
    },
    tzConvert: {
      desc: {
        ko: 'Oracle은 세 가지 방법으로 타임존을 변환해요. AT TIME ZONE은 기존 TIMESTAMP를 다른 시간대로 변환해요. FROM_TZ는 타임존 정보가 없는 TIMESTAMP에 타임존을 붙여요. SYS_EXTRACT_UTC는 어떤 타임존이든 UTC(협정 세계시)로 통일해서 비교할 때 써요.',
        en: 'Oracle provides three main timezone tools. AT TIME ZONE converts an existing TIMESTAMP to a different timezone. FROM_TZ attaches a timezone to a plain TIMESTAMP. SYS_EXTRACT_UTC normalizes any timestamp to UTC for comparison.',
      },
      example:
        "SELECT SYSTIMESTAMP                                        AS seoul_time,\n       SYSTIMESTAMP AT TIME ZONE 'UTC'                      AS utc_time,\n       SYSTIMESTAMP AT TIME ZONE 'America/New_York'         AS ny_time,\n       FROM_TZ(CAST(SYSDATE AS TIMESTAMP), 'Asia/Seoul')\n         AT TIME ZONE 'Europe/London'                       AS london_time,\n       SYS_EXTRACT_UTC(SYSTIMESTAMP)                        AS extracted_utc\nFROM   DUAL",
      resultHeaders: [
        'seoul_time',
        'utc_time',
        'ny_time',
        'london_time',
        'extracted_utc',
      ],
      resultRows: [
        [
          '2025-04-25 09:30:00 +09:00',
          '2025-04-25 00:30:00 +00:00',
          '2025-04-24 20:30:00 -04:00',
          '2025-04-25 01:30:00 +01:00',
          '2025-04-25 00:30:00',
        ],
      ],
      tzSetup: [
        {
          title: {
            ko: '세션 타임존 설정 및 확인',
            en: 'Session Timezone — Set & Check',
          },
          lines: [
            {
              code: "ALTER SESSION SET TIME_ZONE = 'Asia/Seoul';",
              comment: {
                ko: '세션 타임존을 서울(+09:00)로 설정',
                en: 'set session timezone to Seoul (+09:00)',
              },
            },
            {
              code: "ALTER SESSION SET TIME_ZONE = '+09:00';",
              comment: {
                ko: '오프셋으로 직접 지정도 가능',
                en: 'fixed offset also works',
              },
            },
            {
              code: 'SELECT DBTIMEZONE      FROM DUAL;',
              comment: {
                ko: 'DB 서버 타임존 확인',
                en: 'check DB server timezone',
              },
            },
            {
              code: 'SELECT SESSIONTIMEZONE FROM DUAL;',
              comment: {
                ko: '현재 세션 타임존 확인',
                en: 'check current session timezone',
              },
            },
            {
              code: 'SELECT CURRENT_TIMESTAMP FROM DUAL;',
              comment: {
                ko: '세션 타임존 반영 — 세션 변경 시 값도 바뀜',
                en: 'reflects session timezone — changes with session',
              },
            },
            {
              code: 'SELECT SYSTIMESTAMP    FROM DUAL;',
              comment: {
                ko: 'DB 서버 타임존 고정 — 세션 변경과 무관',
                en: 'fixed to DB server timezone — unaffected by session',
              },
            },
          ],
        },
      ],
    },
    castExample: {
      sql: "-- SYSDATE → TIMESTAMP 변환 (타임존 없음)\nSELECT CAST(SYSDATE AS TIMESTAMP)          AS ts_no_tz,\n       -- TIMESTAMP에 타임존 붙이기\n       FROM_TZ(CAST(SYSDATE AS TIMESTAMP),\n               'Asia/Seoul')               AS ts_with_tz,\n       -- SYSTIMESTAMP → DATE 변환 (소수초·타임존 손실)\n       CAST(SYSTIMESTAMP AS DATE)           AS back_to_date\nFROM   DUAL",
      headers: ['ts_no_tz', 'ts_with_tz', 'back_to_date'],
      rows: [
        [
          '2025-04-25 09:30:00.000000',
          '2025-04-25 09:30:00.000000 +09:00',
          '2025-04-25 09:30:00',
        ],
      ],
    },
    vsNote: {
      ko: 'SYSDATE(DATE, 초 정밀도, 타임존 없음) vs SYSTIMESTAMP(TIMESTAMP WITH TIME ZONE, 나노초 정밀도, 타임존 포함). TIMESTAMP 산술에는 숫자 분수 대신 INTERVAL 리터럴을 사용하는 걸 권장해요.',
      en: 'SYSDATE (DATE, second precision, no timezone) vs SYSTIMESTAMP (TIMESTAMP WITH TIME ZONE, nanosecond precision, with timezone). Use INTERVAL literals for TIMESTAMP arithmetic instead of numeric fractions.',
    },
    note: {
      ko: 'SYSTIMESTAMP - SYSTIMESTAMP는 INTERVAL DAY TO SECOND 타입을 반환해요. 정밀한 경과 시간 측정(예: 쿼리 수행 시간)에 활용해요.',
      en: 'SYSTIMESTAMP - SYSTIMESTAMP returns an INTERVAL DAY TO SECOND. Useful for precise elapsed-time measurement such as query execution duration.',
    },
  },
  {
    name: 'ADD_MONTHS',
    signature: 'ADD_MONTHS(date, n)',
    desc: {
      ko: '날짜에 n개월을 더한 결과를 반환해요. n이 음수이면 날짜가 이전 월로 이동해요. 월말 처리도 자동으로 수행해요.',
      en: 'Returns the date plus n months. A negative n moves the date to an earlier month. Automatically handles end-of-month adjustments.',
    },
    example:
      'SELECT hire_date,\n       ADD_MONTHS(hire_date,  3) AS plus_3m,\n       ADD_MONTHS(hire_date, -1) AS minus_1m\nFROM   employees\nWHERE  emp_id IN (101, 102, 103)',
    resultHeaders: ['hire_date', 'plus_3m', 'minus_1m'],
    resultRows: [
      ['2020-01-15', '2020-04-15', '2019-12-15'],
      ['2020-03-01', '2020-06-01', '2020-02-01'],
      ['2021-07-31', '2021-10-31', '2021-06-30'],
    ],
    note: {
      ko: '월말 날짜(예: 1월 31일)에 1개월을 더하면 2월의 마지막 날(28일 또는 29일)로 자동 조정돼요.',
      en: 'Adding a month to a month-end date (e.g., Jan 31) automatically adjusts to the last day of the next month (Feb 28 or 29).',
    },
  },
  {
    name: 'MONTHS_BETWEEN',
    signature: 'MONTHS_BETWEEN(date1, date2)',
    desc: {
      ko: 'date1과 date2 사이의 개월 수를 숫자로 반환해요. date1이 date2보다 늦으면 양수, 이르면 음수를 반환해요. 소수점이 포함될 수 있어요.',
      en: 'Returns the number of months between date1 and date2 as a number. Positive if date1 is later, negative if earlier. The result may include a decimal.',
    },
    example:
      "-- 양수: SYSDATE가 hire_date보다 나중 → 근속 개월\nSELECT first_name,\n       hire_date,\n       ROUND(MONTHS_BETWEEN(SYSDATE, hire_date))   AS months_worked,\n       -- 음수: hire_date가 미래 기준일보다 이전\n       ROUND(MONTHS_BETWEEN(hire_date,\n             TO_DATE('2026-01-01','YYYY-MM-DD')))   AS months_until_2026\nFROM   employees\nWHERE  emp_id IN (101, 102, 103)",
    resultHeaders: [
      'first_name',
      'hire_date',
      'months_worked',
      'months_until_2026',
    ],
    resultRows: [
      ['Alice', '2020-01-15', '63', '-9'],
      ['Bob', '2020-03-01', '61', '-10'],
      ['Carol', '2021-07-31', '45', '-9'],
    ],
    note: {
      ko: 'date1 < date2이면 결과가 음수예요. 예: MONTHS_BETWEEN(hire_date, SYSDATE)는 입사일이 현재보다 과거이므로 음수를 반환해요.',
      en: 'The result is negative when date1 < date2. e.g. MONTHS_BETWEEN(hire_date, SYSDATE) returns a negative value because hire_date is earlier than now.',
    },
  },
  {
    name: 'TRUNC (날짜)',
    signature: 'TRUNC(date [, fmt])',
    desc: {
      ko: "TRUNC는 '잘라내다(truncate)'의 줄임말이에요. 숫자에서 소수점 이하를 버리듯, 날짜에서는 지정한 단위 아래의 시간 정보를 모두 제거해요. 반올림 없이 항상 내림(버림)만 해요.\n\n날짜를 지정한 단위(fmt)로 잘라낼 수 있어요. fmt를 생략하면 시간을 00:00:00으로 초기화하고, TRUNC(date, 'MM')은 해당 월의 1일, TRUNC(date, 'YYYY')는 해당 연도의 1월 1일을 반환해요.",
      en: "TRUNC is short for 'truncate', meaning to cut off. Just as truncating a number drops the decimal part, truncating a date removes all time information below the specified unit — always rounding down, never up.\n\nTruncates a date to the specified unit (fmt). Omitting fmt zeros out the time portion (00:00:00). TRUNC(date, 'MM') returns the 1st of the month; TRUNC(date, 'YYYY') returns January 1st of the year.",
    },
    example:
      "SELECT SYSDATE,\n       TRUNC(SYSDATE)           AS day_start,\n       TRUNC(SYSDATE, 'MM')     AS month_start,\n       TRUNC(SYSDATE, 'YYYY')   AS year_start,\n       TRUNC(SYSDATE, 'IW')     AS iso_week_mon,\n       TRUNC(SYSDATE, 'WW')     AS week_sun,\n       TRUNC(SYSDATE, 'MI')     AS minute_start,\n       TRUNC(SYSDATE, 'YEAR')   AS year_start2\nFROM   DUAL",
    resultHeaders: [
      'SYSDATE',
      'day_start',
      'month_start',
      'year_start',
      'iso_week_mon',
      'week_sun',
      'minute_start',
      'year_start2',
    ],
    resultRows: [
      [
        '2025-04-25 09:30:45',
        '2025-04-25 00:00:00',
        '2025-04-01 00:00:00',
        '2025-01-01 00:00:00',
        '2025-04-21 00:00:00',
        '2025-04-20 00:00:00',
        '2025-04-25 09:30:00',
        '2025-01-01 00:00:00',
      ],
    ],
    formatMasks: {
      title: { ko: 'TRUNC 주요 fmt 값', en: 'TRUNC fmt Values' },
      rows: [
        {
          mask: '(생략)',
          example: '2025-04-25 00:00:00',
          desc: {
            ko: '시간 부분을 00:00:00으로 초기화',
            en: 'zero out time portion',
          },
        },
        {
          mask: 'DD',
          example: '2025-04-25 00:00:00',
          desc: {
            ko: '하루의 시작 (생략과 동일)',
            en: 'start of day (same as omitting)',
          },
        },
        {
          mask: 'MM',
          example: '2025-04-01 00:00:00',
          desc: { ko: '해당 월의 1일', en: '1st of the month' },
        },
        {
          mask: 'YYYY',
          example: '2025-01-01 00:00:00',
          desc: { ko: '해당 연도의 1월 1일', en: 'January 1st of the year' },
        },
        {
          mask: 'YEAR',
          example: '2025-01-01 00:00:00',
          desc: {
            ko: 'YYYY와 동일 (연도 시작)',
            en: 'same as YYYY (year start)',
          },
        },
        {
          mask: 'IW',
          example: '2025-04-21 00:00:00',
          desc: {
            ko: 'ISO 주의 월요일 (ISO 8601 기준)',
            en: 'Monday of the ISO week (ISO 8601)',
          },
        },
        {
          mask: 'WW',
          example: '2025-04-20 00:00:00',
          desc: {
            ko: '연도 시작 기준 해당 주의 첫날(일요일)',
            en: 'first day of the week from year start (Sunday)',
          },
        },
        {
          mask: 'MI',
          example: '2025-04-25 09:30:00',
          desc: {
            ko: '해당 분의 시작 (초 제거)',
            en: 'start of the minute (seconds zeroed)',
          },
        },
        {
          mask: 'HH / HH24',
          example: '2025-04-25 09:00:00',
          desc: {
            ko: '해당 시의 시작 (분·초 제거)',
            en: 'start of the hour (minutes and seconds zeroed)',
          },
        },
        {
          mask: 'Q',
          example: '2025-04-01 00:00:00',
          desc: { ko: '해당 분기의 첫날', en: 'first day of the quarter' },
        },
        {
          mask: 'DDD',
          example: '2025-04-25 00:00:00',
          desc: { ko: 'DD와 동일', en: 'same as DD' },
        },
      ],
    },
    note: {
      ko: "날짜 범위 검색 시 WHERE hire_date >= TRUNC(SYSDATE, 'MM') 패턴으로 이번 달 1일부터의 데이터를 정확하게 조회할 수 있어요.",
      en: "For range queries, WHERE hire_date >= TRUNC(SYSDATE, 'MM') precisely retrieves data from the first day of the current month.",
    },
  },
  {
    name: 'TO_DATE',
    signature: "TO_DATE(string, 'format')",
    desc: {
      ko: "문자열을 날짜(DATE) 타입으로 변환해요. format은 'YYYY-MM-DD', 'YYYY/MM/DD HH24:MI:SS' 등 입력 문자열의 형식과 일치해야 해요.",
      en: "Converts a string to a DATE type. The format must match the structure of the input string, such as 'YYYY-MM-DD' or 'YYYY/MM/DD HH24:MI:SS'.",
    },
    example:
      "SELECT TO_DATE('2025-01-15', 'YYYY-MM-DD')          AS d1,\n       TO_DATE('2025/06/30 18:00', 'YYYY/MM/DD HH24:MI') AS d2\nFROM   DUAL",
    resultHeaders: ['d1', 'd2'],
    resultRows: [['2025-01-15 00:00:00', '2025-06-30 18:00:00']],
    note: {
      ko: 'NLS_DATE_FORMAT 세션 설정과 다른 형식의 문자열을 비교하면 암묵적 변환이 발생해서 인덱스를 사용하지 못할 수 있어요. 명시적으로 TO_DATE를 사용하는 게 안전해요.',
      en: "Comparing a string whose format differs from the session's NLS_DATE_FORMAT triggers implicit conversion, which can prevent index use. Explicitly using TO_DATE is safer.",
    },
  },
  {
    name: 'TO_CHAR (날짜)',
    signature: "TO_CHAR(date, 'format')",
    desc: {
      ko: "날짜(DATE)를 지정한 형식의 문자열로 변환해요. 'YYYY-MM-DD', 'YYYY년 MM월 DD일', 'Day' 등 다양한 포맷 마스크를 조합해서 사용할 수 있어요.",
      en: "Converts a DATE to a string using the specified format. Supports a wide range of format masks such as 'YYYY-MM-DD', 'Month DD, YYYY', or 'Day'.",
    },
    example:
      "SELECT hire_date,\n       TO_CHAR(hire_date, 'YYYY-MM-DD')           AS iso,\n       TO_CHAR(hire_date, 'YYYY\"년\" MM\"월\" DD\"일\"') AS korean,\n       TO_CHAR(hire_date, 'Day, DD Month YYYY')   AS long_fmt,\n       TO_CHAR(hire_date, 'HH24:MI:SS')           AS time_only,\n       TO_CHAR(hire_date, 'Q')                    AS quarter,\n       TO_CHAR(hire_date, 'IW')                   AS iso_week\nFROM   employees\nWHERE  emp_id IN (101, 102)",
    resultHeaders: [
      'hire_date',
      'iso',
      'korean',
      'long_fmt',
      'time_only',
      'quarter',
      'iso_week',
    ],
    resultRows: [
      [
        '2020-01-15 00:00:00',
        '2020-01-15',
        '2020년 01월 15일',
        'Wednesday, 15 January 2020',
        '00:00:00',
        '1',
        '03',
      ],
      [
        '2020-03-01 00:00:00',
        '2020-03-01',
        '2020년 03월 01일',
        'Sunday, 01 March 2020',
        '00:00:00',
        '1',
        '09',
      ],
    ],
    formatMasks: {
      title: { ko: '주요 포맷 마스크 참고', en: 'Format Mask Reference' },
      rows: [
        {
          mask: 'YYYY',
          example: '2025',
          desc: { ko: '4자리 연도', en: '4-digit year' },
        },
        {
          mask: 'YY',
          example: '25',
          desc: { ko: '2자리 연도', en: '2-digit year' },
        },
        {
          mask: 'MM',
          example: '04',
          desc: { ko: '2자리 월', en: '2-digit month' },
        },
        {
          mask: 'MON',
          example: 'APR',
          desc: { ko: '월 약어 (3자)', en: 'month abbreviation' },
        },
        {
          mask: 'MONTH',
          example: 'APRIL',
          desc: { ko: '월 전체 이름', en: 'full month name' },
        },
        {
          mask: 'DD',
          example: '25',
          desc: { ko: '2자리 일', en: '2-digit day' },
        },
        {
          mask: 'DY',
          example: 'FRI',
          desc: { ko: '요일 약어', en: 'day abbreviation' },
        },
        {
          mask: 'DAY',
          example: 'FRIDAY',
          desc: { ko: '요일 전체 이름', en: 'full day name' },
        },
        {
          mask: 'HH24',
          example: '09',
          desc: { ko: '24시간 형식', en: '24-hour clock' },
        },
        {
          mask: 'HH12 / HH',
          example: '09',
          desc: { ko: '12시간 형식', en: '12-hour clock' },
        },
        { mask: 'MI', example: '30', desc: { ko: '분', en: 'minutes' } },
        { mask: 'SS', example: '00', desc: { ko: '초', en: 'seconds' } },
        {
          mask: 'AM / PM',
          example: 'AM',
          desc: { ko: '오전/오후 표시', en: 'meridian indicator' },
        },
        {
          mask: 'Q',
          example: '2',
          desc: { ko: '분기 (1–4)', en: 'quarter (1–4)' },
        },
        {
          mask: 'IW',
          example: '17',
          desc: { ko: 'ISO 주차 (01–53)', en: 'ISO week number' },
        },
        {
          mask: 'WW',
          example: '17',
          desc: { ko: '연 기준 주차', en: 'week of year' },
        },
        {
          mask: 'DDD',
          example: '115',
          desc: { ko: '연 기준 일자 (1–366)', en: 'day of year' },
        },
        {
          mask: 'TZH:TZM',
          example: '+09:00',
          desc: {
            ko: '타임존 오프셋 (TIMESTAMP 전용)',
            en: 'timezone offset (TIMESTAMP only)',
          },
        },
      ],
    },
    note: {
      ko: 'TO_CHAR 결과는 VARCHAR2 타입이에요. 날짜 비교 연산에 사용하면 문자열 비교가 되므로, 날짜 비교는 반드시 DATE 타입으로 수행하세요.',
      en: 'The result of TO_CHAR is VARCHAR2. Using it in date comparisons performs string comparison — always compare dates as DATE types.',
    },
  },
]

// ── ResultTable ──────────────────────────────────────────────────────────────

function ResultTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="rounded-card overflow-x-auto border text-xs">
      <table className="w-max min-w-full">
        <thead>
          <tr className="bg-rail border-b">
            {headers.map((h) => (
              <th
                key={h}
                className="text-ink-2 px-2.5 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="text-ink/80 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── FormatMaskTable ──────────────────────────────────────────────────────────

function FormatMaskTable({
  title,
  rows,
  lang,
}: {
  title: { ko: string; en: string }
  rows: FormatMaskRow[]
  lang: 'ko' | 'en'
}) {
  return (
    <div>
      <p className="text-ink-2 mb-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
        {title[lang]}
      </p>
      <div className="rounded-card inline-block border text-xs">
        <table className="w-auto">
          <thead>
            <tr className="bg-rail border-b">
              <th className="text-ink-2 px-2.5 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap">
                {lang === 'ko' ? '마스크' : 'Mask'}
              </th>
              <th className="text-ink-2 px-2.5 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap">
                {lang === 'ko' ? '출력 예' : 'Output'}
              </th>
              <th className="text-ink-2 px-2.5 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap">
                {lang === 'ko' ? '설명' : 'Note'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mask} className="border-b last:border-0">
                <td className="text-blue px-2.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap">
                  {r.mask}
                </td>
                <td className="text-ink/80 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap">
                  {r.example}
                </td>
                <td className="text-ink/70 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap">
                  {r.desc[lang]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── ArithTable ───────────────────────────────────────────────────────────────

function ArithTable({
  title,
  rows,
  lang,
}: {
  title: { ko: string; en: string }
  rows: ArithRow[]
  lang: 'ko' | 'en'
}) {
  return (
    <div>
      <p className="text-ink-2 mb-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
        {title[lang]}
      </p>
      <div className="rounded-card inline-block border text-xs">
        <table className="w-auto">
          <thead>
            <tr className="bg-rail border-b">
              <th className="text-ink-2 px-2.5 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap">
                식
              </th>
              <th className="text-ink-2 px-2.5 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap">
                {lang === 'ko' ? '결과' : 'Result'}
              </th>
              <th className="text-ink-2 px-2.5 py-1.5 text-left font-mono text-[10px] font-bold whitespace-nowrap">
                {lang === 'ko' ? '설명' : 'Note'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.expr} className="border-b last:border-0">
                <td className="text-blue px-2.5 py-1 font-mono text-[11px] whitespace-nowrap">
                  {r.expr}
                </td>
                <td className="text-ink/80 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap">
                  {r.result}
                </td>
                <td className="text-ink/70 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap">
                  {r.desc[lang]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const T = {
  ko: {
    chapterTitle: '날짜와 시간을 다루는 법',
    chapterSubtitle: 'Oracle에서 날짜와 시간을 어떻게 계산하는지 알아봐요.',
    categoryLabel: '날짜 / 시간 함수',
    exampleQuery: '예시 쿼리',
    result: '실행 결과',
    dualBoxTitle: 'DUAL 이란?',
    vsTitle: 'SYSDATE vs SYSTIMESTAMP',
    nlsBoxTitle: 'SYSDATE의 실행 결과가 다르게 보인다면?',
    tzConvertTitle: '타임존 변환',
    arith2Title: 'SYSTIMESTAMP 끼리의 연산',
  },
  en: {
    chapterTitle: '날짜와 시간를 다루는 법',
    chapterSubtitle:
      'Learn the essential Oracle date and time functions: SYSDATE, SYSTIMESTAMP, timezone conversion, ADD_MONTHS, MONTHS_BETWEEN, TRUNC, TO_DATE, and TO_CHAR.',
    categoryLabel: 'Date / Time Functions',
    exampleQuery: 'Example Query',
    result: 'Result',
    dualBoxTitle: 'What is DUAL?',
    vsTitle: 'SYSDATE vs SYSTIMESTAMP',
    nlsBoxTitle: 'Why Does Your SYSDATE Result Look Different?',
    tzConvertTitle: 'Timezone Conversion',
    arith2Title: 'SYSTIMESTAMP Subtraction',
  },
}

// ── FuncContent ──────────────────────────────────────────────────────────────

function FuncContent({
  item,
  lang,
  t,
}: {
  item: FuncItem
  lang: 'ko' | 'en'
  t: (typeof T)['ko']
}) {
  const [tzModalOpen, setTzModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {/* 시그니처 */}
      <div>
        <span className="bg-blue/10 text-blue inline-block rounded border px-2 py-0.5 font-mono text-[11px]">
          {item.signature}
        </span>
      </div>

      {/* 설명 */}
      <div>
        {item.desc[lang].split('\n\n').map((para, i) => (
          <Prose key={i}>{para}</Prose>
        ))}
        {item.tzInfo && (
          <div className="mt-1">
            <TermPopup
              label={lang === 'ko' ? '타임존이란?' : 'What is a Timezone?'}
              title={lang === 'ko' ? '타임존이란?' : 'What is a Timezone?'}
              open={tzModalOpen}
              onOpen={() => setTzModalOpen(true)}
              onClose={() => setTzModalOpen(false)}
            >
              <span style={{ whiteSpace: 'pre-line' }}>
                {item.tzInfo[lang]}
              </span>
            </TermPopup>
          </div>
        )}
      </div>

      {/* DUAL 설명 InfoBox */}
      {item.dualInfo && <InfoBox variant="note">{item.dualInfo[lang]}</InfoBox>}

      {/* 예시 쿼리 */}
      <div>
        <p className="text-ink-2 mb-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
          {t.exampleQuery}
        </p>
        <SqlHighlight sql={item.example} />
      </div>

      {/* 실행 결과 */}
      <div>
        <p className="text-ink-2 mb-2 font-mono text-[11px] font-bold tracking-wider uppercase">
          {t.result}
        </p>
        <ResultTable headers={item.resultHeaders} rows={item.resultRows} />
      </div>

      {/* SYSDATE ↔ TIMESTAMP 변환 예시 */}
      {item.castExample && (
        <div>
          <p className="text-ink-2 mb-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
            {lang === 'ko'
              ? 'SYSDATE ↔ TIMESTAMP 변환'
              : 'SYSDATE ↔ TIMESTAMP Conversion'}
          </p>
          <SqlHighlight sql={item.castExample.sql} className="mb-3" />
          <ResultTable
            headers={item.castExample.headers}
            rows={item.castExample.rows}
          />
        </div>
      )}

      {/* 산술 연산 표 */}
      {item.arith && (
        <ArithTable
          title={item.arith.title}
          rows={item.arith.rows}
          lang={lang}
        />
      )}

      {/* SYSTIMESTAMP 끼리의 연산 예시 */}
      {item.arith2 && (
        <div>
          <p className="text-ink-2 mb-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
            {t.arith2Title}
          </p>
          <SqlHighlight
            className="mb-3"
            sql={
              "-- 두 SYSTIMESTAMP 값 사이의 경과 시간 측정\nSELECT ts_end - ts_start                              AS diff_interval,\n       EXTRACT(MINUTE FROM ts_end - ts_start)          AS diff_min,\n       EXTRACT(SECOND FROM ts_end - ts_start)          AS diff_sec\nFROM (\n  SELECT SYSTIMESTAMP                          AS ts_start,\n         SYSTIMESTAMP + INTERVAL '0:2:35.847' MINUTE TO SECOND AS ts_end\n  FROM DUAL\n)"
            }
          />
          <ArithTable
            title={item.arith2.title}
            rows={item.arith2.rows}
            lang={lang}
          />
        </div>
      )}

      {/* 타임존 변환 */}
      {item.tzConvert && (
        <>
          <Divider />
          <div>
            <p className="text-ink-2 mb-2 font-mono text-[11px] font-bold tracking-wider uppercase">
              {t.tzConvertTitle}
            </p>
            <div className="rounded-panel bg-paper mb-3 border px-4 py-3">
              <Prose>{item.tzConvert.desc[lang]}</Prose>
            </div>
            <SqlHighlight sql={item.tzConvert.example} className="mb-3" />
            <ResultTable
              headers={item.tzConvert.resultHeaders}
              rows={item.tzConvert.resultRows}
            />
          </div>

          {item.tzConvert.tzSetup.map((block) => (
            <div key={block.title.ko}>
              <p className="text-ink-2 mb-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
                {block.title[lang]}
              </p>
              <div className="rounded-panel bg-rail overflow-x-auto border px-4 py-3">
                <table className="w-full text-xs">
                  <tbody>
                    {block.lines.map((line, i) => (
                      <tr key={i}>
                        <td className="text-blue py-0.5 pr-4 font-mono text-[11px] whitespace-nowrap">
                          {line.code}
                        </td>
                        {line.comment[lang] && (
                          <td className="text-ink-2 py-0.5 font-mono text-[11px]">
                            {`-- ${line.comment[lang]}`}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      {/* 포맷 마스크 표 */}
      {item.formatMasks && (
        <FormatMaskTable
          title={item.formatMasks.title}
          rows={item.formatMasks.rows}
          lang={lang}
        />
      )}

      {/* vs 비교 노트 */}
      {item.vsNote && <InfoBox variant="warning">{item.vsNote[lang]}</InfoBox>}

      {/* NLS 설명 InfoBox */}
      {item.nlsNote && (
        <InfoBox variant="tip">
          <span style={{ whiteSpace: 'pre-line' }}>{item.nlsNote[lang]}</span>
        </InfoBox>
      )}

      {/* 참고 */}
      {item.note && (
        <div className="rounded-panel bg-rail text-ink/80 border px-4 py-3 text-xs leading-relaxed">
          <span className="mr-1.5 font-bold">💡</span>
          {item.note[lang]}
        </div>
      )}
    </div>
  )
}

// ── DateSection ─────────────────────────────────────────────────────────────

export function DateSection() {
  const lang = useSimulationStore((s) => s.lang)
  const t = T[lang]

  return (
    <PageContainer className="max-w-5xl">
      <ChapterTitle
        icon={
          <IconCalendarEvent size={36} color="var(--color-blue)" stroke={1.5} />
        }
        title={t.chapterTitle}
        subtitle={t.chapterSubtitle}
      />

      <div className="flex flex-col gap-2">
        {FUNC_ITEMS.map((item, idx) => (
          <AccordionSection
            key={item.name}
            title={`${item.name}  —  ${item.signature}`}
            defaultOpen={idx === 0}
          >
            <FuncContent item={item} lang={lang} t={t} />
          </AccordionSection>
        ))}
      </div>
    </PageContainer>
  )
}
