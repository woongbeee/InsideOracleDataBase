// ============================================================================
// theme.tsx — 디자인 토큰의 유일한 TypeScript 매핑 지점
//
// 색(hex)·폰트 원본 값은 여기에 두지 않는다 → src/styles/tokens.css.
// 이 파일은 그 토큰을 가리키는 Tailwind 클래스 / var(--…) 문자열 "매핑"만:
//   · InfoBox variant → 좌측선·라벨 색 + ko/en 라벨 (INFOBOX_VARIANT / INFOBOX_LEGACY_COLOR)
//   · 다이어그램·코드 색 (DIAGRAM / DATA_PALETTE / CODE)
//   · ACCENT_COLORS — 레거시(챕터별 raw Tailwind 색 세트). 값은 미사용, AccentColor
//     타입만 bookStructure.tsx 가 참조. Phase 3에서 제거.
//
// 컴포넌트 파일에 색상 맵(Record<…, {bg,text,border}>)을 새로 만들지 말고 여기서 import.
// 이 파일에 `#rrggbb` 리터럴이 있으면 버그다 (2026-08-30 기준 0개).
// ============================================================================

// ── 챕터 / 액센트 색 (레거시) ────────────────────────────────────────────────
// AccentColor 타입만 bookStructure.tsx 에서 참조. ACCENT_COLORS 값은 현재 미사용.

export type AccentColor =
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'orange'
  | 'cyan'
  | 'rose'
  | 'amber'
  | 'teal'
  | 'brand-pink'
  | 'brand-navy'
  | 'brand-teal'
  | 'brand-orange'
  | 'brand-salmon'

export interface AccentColorSet {
  /** Chapter icon tint (TOC, bookStructure.tsx). */
  icon: string
  /** Breadcrumb / label text. */
  text: string
  border: string
  /** Card & chip fill. */
  bg: string
  /** Small indicator dot. */
  dot: string
  /** Pill / tag. */
  badge: string
}

export const ACCENT_COLORS: Record<AccentColor, AccentColorSet> = {
  blue: {
    icon: 'text-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-200',
    bg: 'bg-blue-50/60',
    dot: 'bg-blue-400',
    badge: 'bg-blue-100 text-blue-700',
  },
  violet: {
    icon: 'text-violet-500',
    text: 'text-violet-600',
    border: 'border-violet-200',
    bg: 'bg-violet-50/60',
    dot: 'bg-violet-400',
    badge: 'bg-violet-100 text-violet-700',
  },
  emerald: {
    icon: 'text-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  orange: {
    icon: 'text-orange-500',
    text: 'text-orange-600',
    border: 'border-orange-200',
    bg: 'bg-orange-50/60',
    dot: 'bg-orange-400',
    badge: 'bg-orange-100 text-orange-700',
  },
  cyan: {
    icon: 'text-cyan-500',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    bg: 'bg-cyan-50/60',
    dot: 'bg-cyan-400',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  rose: {
    icon: 'text-rose-500',
    text: 'text-rose-600',
    border: 'border-rose-200',
    bg: 'bg-rose-50/60',
    dot: 'bg-rose-400',
    badge: 'bg-rose-100 text-rose-700',
  },
  amber: {
    icon: 'text-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-200',
    bg: 'bg-amber-50/60',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
  },
  teal: {
    icon: 'text-teal-500',
    text: 'text-teal-600',
    border: 'border-teal-200',
    bg: 'bg-teal-50/60',
    dot: 'bg-teal-400',
    badge: 'bg-teal-100 text-teal-700',
  },

  'brand-pink': {
    icon: 'text-brand-pink',
    text: 'text-brand-pink-dark',
    border: 'border-brand-pink/30',
    bg: 'bg-brand-pink-light',
    dot: 'bg-brand-pink',
    badge: 'bg-brand-pink/15 text-brand-pink-dark',
  },
  'brand-navy': {
    icon: 'text-brand-navy',
    text: 'text-brand-navy-dark',
    border: 'border-brand-navy/25',
    bg: 'bg-brand-navy-light',
    dot: 'bg-brand-navy',
    badge: 'bg-brand-navy/15 text-brand-navy-dark',
  },
  'brand-teal': {
    icon: 'text-brand-teal',
    text: 'text-brand-teal-dark',
    border: 'border-brand-teal/30',
    bg: 'bg-brand-teal-light',
    dot: 'bg-brand-teal',
    badge: 'bg-brand-teal/15 text-brand-teal-dark',
  },
  'brand-orange': {
    icon: 'text-brand-orange',
    text: 'text-brand-orange-dark',
    border: 'border-brand-orange/30',
    bg: 'bg-brand-orange-light',
    dot: 'bg-brand-orange',
    badge: 'bg-brand-orange/15 text-brand-orange-dark',
  },
  'brand-salmon': {
    icon: 'text-brand-salmon',
    text: 'text-brand-salmon-dark',
    border: 'border-brand-salmon/30',
    bg: 'bg-brand-salmon-light',
    dot: 'bg-brand-salmon',
    badge: 'bg-brand-salmon/15 text-brand-salmon-dark',
  },
}

export const DEFAULT_ACCENT: AccentColor = 'blue'

// ── InfoBox variant ──────────────────────────────────────────────────────────
// shared.tsx <InfoBox> 가 참조. Notion 콜아웃 = 좌측 3px 색선 + mono 색 라벨(배경 없음).

export type InfoVariant =
  | 'tip'
  | 'note'
  | 'warning'
  | 'usage'
  | 'summary'
  | 'danger'
/** 구버전 <InfoBox color=…> 경로용. */
export type InfoColor = 'info' | 'tip' | 'warning' | 'danger'

export interface InfoVariantDef {
  /** 좌측 border 색 클래스 (border-l-*). */
  border: string
  /** 라벨 텍스트 색 클래스 (text-*). */
  label: string
  ko: string
  en: string
}

export const INFOBOX_VARIANT: Record<InfoVariant, InfoVariantDef> = {
  tip: {
    border: 'border-l-blue',
    label: 'text-blue',
    ko: '더 알아보기',
    en: 'Advanced',
  },
  note: {
    border: 'border-l-slate',
    label: 'text-slate',
    ko: '참고',
    en: 'Note',
  },
  warning: {
    border: 'border-l-amber',
    label: 'text-amber',
    ko: '주의',
    en: 'Caution',
  },
  usage: {
    border: 'border-l-green',
    label: 'text-green',
    ko: '어디서 사용할까?',
    en: 'When to Use',
  },
  summary: {
    border: 'border-l-slate',
    label: 'text-slate',
    ko: '핵심 정리',
    en: 'Summary',
  },
  danger: {
    border: 'border-l-red',
    label: 'text-red',
    ko: '위험',
    en: 'Danger',
  },
}

/** 구버전 <InfoBox color=…> 경로. */
export const INFOBOX_LEGACY_COLOR: Record<
  InfoColor,
  Pick<InfoVariantDef, 'border' | 'label'>
> = {
  info: { border: 'border-l-blue', label: 'text-blue' },
  tip: { border: 'border-l-blue', label: 'text-blue' },
  warning: { border: 'border-l-amber', label: 'text-amber' },
  danger: { border: 'border-l-red', label: 'text-red' },
}

// ── 다이어그램(SVG) 색 ───────────────────────────────────────────────────────
// SVG fill/stroke, inline style 에 그대로 넣는 var(--color-*) 문자열.
// tokens.css §2c 와 이름이 일치한다 (테마 따라 자동 스왑). Phase 3에서 각
// 다이어그램 파일의 하드코딩 hex를 이것으로 치환한다.

/** 오퍼레이션/계열 구분용 — 채도 높은 확정색 순환 (teal·파스텔 없음). */
export const DATA_PALETTE = [
  'var(--color-blue)',
  'var(--color-green)',
  'var(--color-amber)',
  'var(--color-purple)',
  'var(--color-red)',
  'var(--color-slate)',
] as const

/** 셸/구조 색. */
export const DIAGRAM = {
  paper: 'var(--color-paper)',
  paperSunk: 'var(--color-paper-sunk)',
  rail: 'var(--color-rail)',
  line: 'var(--color-line)',
  line2: 'var(--color-line-2)',
  ink: 'var(--color-ink)',
  ink2: 'var(--color-ink-2)',
  ink3: 'var(--color-ink-3)',
  accent: 'var(--color-accent)',
  blue: 'var(--color-blue)',
  green: 'var(--color-green)',
  red: 'var(--color-red)',
  amber: 'var(--color-amber)',
  purple: 'var(--color-purple)',
  slate: 'var(--color-slate)',
} as const

/** 코드 블록 색 — 함몰된 웜 그레이 배경 + 확정색 문법 강조. */
export const CODE = {
  bg: 'var(--color-code-bg)',
  border: 'var(--color-code-border)',
  fg: 'var(--color-ink)',
  bar: 'var(--color-rail)',
  keyword: 'var(--color-sy-kw)',
  fn: 'var(--color-sy-fn)',
  string: 'var(--color-sy-str)',
  number: 'var(--color-sy-num)',
  comment: 'var(--color-sy-com)',
  error: 'var(--color-red)',
} as const
