import { type ComponentType, Fragment, type ReactNode } from 'react'
import styled, { type DefaultTheme, useTheme } from 'styled-components'

import {
  AiSparkleFilledIcon,
  ArrowTopRightIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CheckOutlineIcon,
  CircleDashIcon,
  ClaudeLogoIcon,
  CpuIcon,
  DatadogLogoIcon,
  ElasticsearchLogoIcon,
  ErrorIcon,
  FileIcon,
  GitHubLogoIcon,
  GitLabLogoIcon,
  GitPullIcon,
  GrafanaLogoIcon,
  JiraLogoIcon,
  LinearLogoIcon,
  LogsIcon,
  MegaphoneIcon,
  OpenAILogoIcon,
  PluralLogoIcon,
  PrometheusLogoIcon,
  RamIcon,
  StackIcon,
  TicketIcon,
  WarningIcon,
} from '../../icons'
import type {
  ProductShotBlock,
  ProductShotHighlightPart,
  ProductShotLogo,
  ProductShotMeta,
  ProductShotTableCell,
} from './scenarios'

type LogoIcon = ComponentType<{
  size?: number
  color?: string
  fullColor?: boolean
}>

const logos: Record<ProductShotLogo, LogoIcon> = {
  openai: OpenAILogoIcon,
  claude: ClaudeLogoIcon,
  datadog: DatadogLogoIcon,
  grafana: GrafanaLogoIcon,
  prometheus: PrometheusLogoIcon,
  jira: JiraLogoIcon,
  linear: LinearLogoIcon,
  gitlab: GitLabLogoIcon,
  github: GitHubLogoIcon,
  elastic: ElasticsearchLogoIcon,
  plural: PluralLogoIcon,
}

export const accent = {
  teal: '#52F4D9',
  purple: '#969AF8',
  gradient: 'linear-gradient(90deg, #52F4D9 0%, #969AF8 100%)',
  button: 'linear-gradient(90deg, #5FD6C8 0%, #8B6DF6 100%)',
}

export const shotTokens = (theme: DefaultTheme) =>
  theme.mode === 'dark'
    ? {
        stage: '#111216',
        contour: '#2A2E37',
        window: '#1B1C21',
        windowBorder: 'rgb(255 255 255 / 0.07)',
        dots: 'rgb(255 255 255 / 0.13)',
        outer: '#2A2C33',
        outerBorder: 'rgb(255 255 255 / 0.1)',
        inner: '#1F2026',
        innerHeader: '#25272D',
        well: '#17181C',
        border: 'rgb(255 255 255 / 0.09)',
        glow: '0 0 34px rgb(98 92 255 / 0.28), 0 18px 50px rgb(0 0 0 / 0.35)',
        text: '#EBEFF0',
        muted: '#A1A5B0',
        faint: '#747B8B',
        rail: '#8B909C',
        skeleton: '#43464F',
        codeKeyword: '#F2D57E',
        codeString: '#99DAFF',
        codeNumber: '#52F4D9',
        codeKey: '#B2B5FA',
      }
    : {
        stage: '#F1F2F6',
        contour: '#DCDFE6',
        window: '#FFFFFF',
        windowBorder: 'rgb(28 36 72 / 0.1)',
        dots: 'rgb(28 36 72 / 0.14)',
        outer: '#F3F4F8',
        outerBorder: 'rgb(28 36 72 / 0.1)',
        inner: '#FFFFFF',
        innerHeader: '#F6F7FA',
        well: '#F6F7FA',
        border: 'rgb(28 36 72 / 0.1)',
        glow: '0 0 34px rgb(98 92 255 / 0.16), 0 18px 46px rgb(28 36 72 / 0.12)',
        text: '#1F232C',
        muted: '#5D6373',
        faint: '#8A90A0',
        rail: '#7A8090',
        skeleton: '#DFE2EA',
        codeKeyword: '#9A6A00',
        codeString: '#2B6FB5',
        codeNumber: '#0F8F7A',
        codeKey: '#5B52E0',
      }

export type ShotTokens = ReturnType<typeof shotTokens>

const tk = (theme: DefaultTheme) => shotTokens(theme)

export function useShotTokens() {
  const theme = useTheme()

  return { ...shotTokens(theme), mode: theme.mode }
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {text
        .split('`')
        .map((segment, index) =>
          index % 2 ? (
            <InlineCode key={index}>{segment}</InlineCode>
          ) : (
            <Fragment key={index}>{segment}</Fragment>
          )
        )}
    </>
  )
}

const InlineCode = styled.code(({ theme }) => ({
  background: theme.mode === 'dark' ? '#35373F' : '#ECEEF3',
  borderRadius: 3,
  color: tk(theme).text,
  fontFamily: theme.fontFamilies.mono,
  fontSize: '0.92em',
  padding: '1px 4px',
}))

export const Panel = styled.div(({ theme }) => ({
  background: tk(theme).inner,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 6,
  overflow: 'hidden',
}))

const GradientFrame = styled.div(({ theme }) => ({
  background: `linear-gradient(${tk(theme).inner}, ${tk(theme).inner}) padding-box, ${accent.gradient} border-box`,
  border: '1px solid transparent',
  borderRadius: 6,
  overflow: 'hidden',
}))

const GradientText = styled.div({
  background: accent.gradient,
  backgroundClip: 'text',
  color: 'transparent',
  WebkitBackgroundClip: 'text',
  width: 'fit-content',
})

const Ellipsis = styled.div({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

function Logo({ logo, size = 18 }: { logo: ProductShotLogo; size?: number }) {
  const Icon = logos[logo]

  return (
    <Icon
      fullColor
      size={size}
    />
  )
}

const IconCircle = styled.span(({ theme }) => ({
  alignItems: 'center',
  border: `1px solid ${tk(theme).border}`,
  borderRadius: '50%',
  color: tk(theme).muted,
  display: 'inline-flex',
  flexShrink: 0,
  height: 26,
  justifyContent: 'center',
  width: 26,
}))

const Connection = styled.div(({ theme }) => ({
  padding: '10px 8px 8px',
  '.label': {
    color: tk(theme).muted,
    fontSize: 13,
    letterSpacing: '0.04em',
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  '.row': {
    alignItems: 'center',
    display: 'grid',
    gridTemplateColumns: '158px 1fr',
    height: 35,
  },
  '.key': { color: tk(theme).faint, fontSize: 19, letterSpacing: '0.01em' },
  '.value': {
    alignItems: 'center',
    color: tk(theme).text,
    display: 'flex',
    fontSize: 19,
    gap: 8,
  },
  '.more': { color: tk(theme).muted, fontSize: 14 },
  '.action': {
    alignItems: 'center',
    background: accent.button,
    borderRadius: 4,
    color: '#FFFFFF',
    display: 'inline-flex',
    fontSize: 14,
    fontWeight: 600,
    gap: 12,
    height: 41,
    marginTop: 12,
    padding: '0 16px 0 18px',
  },
  '.skeleton': {
    display: 'grid',
    gap: 7,
    gridTemplateColumns: '245px 157px',
    marginTop: 20,
  },
  '.skeleton i': {
    background: tk(theme).skeleton,
    borderRadius: 3,
    display: 'block',
    height: 17,
  },
  '.skeleton i:last-child': { gridColumn: 1, width: 123 },
  '.skeleton i:nth-child(2)': { marginLeft: 40 },
}))

const Agent = styled(GradientFrame)(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: 14,
  padding: '13px 16px',
  '.title': { fontSize: 14, fontWeight: 500 },
  '.subtitle': {
    color: tk(theme).muted,
    fontSize: 12,
    marginTop: 2,
    maxWidth: 312,
  },
  '.spinner': { color: tk(theme).muted, flexShrink: 0 },
}))

const Todos = styled(Panel)(({ theme }) => ({
  padding: '16px 16px 12px',
  '.title': { color: tk(theme).muted, fontSize: 13, marginBottom: 12 },
  '.item': {
    alignItems: 'center',
    color: tk(theme).text,
    display: 'grid',
    fontSize: 14,
    gap: 9,
    gridTemplateColumns: '16px minmax(0, 1fr) 16px',
    minHeight: 30,
  },
  '.detail': {
    color: tk(theme).muted,
    fontSize: 12,
    gridColumn: '2 / 4',
    marginBottom: 8,
    marginTop: -4,
  },
  '.icon': { color: tk(theme).muted },
}))

const Highlight = styled(GradientFrame)(({ theme }) => ({
  color: tk(theme).text,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '16px 16px 18px',
  '.title': { fontSize: 15, fontWeight: 500 },
  '.text': { color: tk(theme).muted, fontSize: 12, lineHeight: 1.55 },
  '.heading': { color: tk(theme).text, fontSize: 13, marginTop: 4 },
  ul: {
    color: tk(theme).muted,
    fontSize: 12,
    lineHeight: 1.6,
    margin: 0,
    paddingLeft: 18,
  },
}))

const Facts = styled.div(({ theme }) => ({
  color: tk(theme).muted,
  fontSize: 12,
  lineHeight: 1.65,
  b: { color: tk(theme).text, fontWeight: 400 },
}))

const Stats = styled.div(({ theme }) => ({
  display: 'grid',
  gap: 14,
  gridTemplateColumns: '1.3fr 1fr 1fr',
  '.stat': { alignItems: 'center', display: 'flex', gap: 9 },
  '.label': { color: tk(theme).text, fontSize: 11 },
  '.value': { color: tk(theme).muted, fontSize: 10, marginTop: 2 },
}))

const Table = styled.div(({ theme }) => ({
  background: tk(theme).well,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 3,
  fontSize: 9,
  margin: '4px 0',
  '.row': {
    alignItems: 'center',
    borderTop: `1px solid ${tk(theme).border}`,
    color: tk(theme).text,
    display: 'grid',
    gridTemplateColumns: '92px minmax(0, 1fr)',
    minHeight: 30,
    padding: '0 8px',
  },
  '.row > div': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.head': {
    borderTop: 0,
    color: tk(theme).text,
    fontSize: 9,
    fontWeight: 600,
    minHeight: 26,
  },
  '.head + .row, .row:nth-child(odd)': { background: tk(theme).inner },
  '&.narrow .row': {
    gridTemplateColumns: '58px minmax(0, 1fr)',
    minHeight: 36,
    fontSize: 10,
  },
}))

const Severity = styled.span<{ $tone: 'critical' | 'warning' }>(
  ({ theme, $tone }) => ({
    alignItems: 'center',
    background: theme.mode === 'dark' ? '#2E3037' : '#EEF0F4',
    borderRadius: 2,
    color: $tone === 'critical' ? '#F599A8' : tk(theme).text,
    display: 'inline-flex',
    gap: 4,
    padding: '2px 6px',
  })
)

const PullRequests = styled(Panel)(({ theme }) => ({
  padding: '12px 16px 14px',
  '.header': {
    alignItems: 'center',
    color: tk(theme).text,
    display: 'flex',
    fontSize: 14,
    fontWeight: 600,
    gap: 10,
    marginBottom: 8,
  },
  '.pr': {
    alignItems: 'center',
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'minmax(0, 1fr) auto auto',
    padding: '6px 0',
  },
  '.path': { color: tk(theme).text, fontSize: 14 },
  '.description': { color: tk(theme).muted, fontSize: 12, marginTop: 2 },
  '.open': {
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 3,
    color: theme.mode === 'dark' ? '#99DAFF' : '#2B6FB5',
    fontSize: 12,
    padding: '2px 8px',
  },
  '.view': {
    background: theme.colors['action-primary'],
    borderRadius: 3,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 600,
    padding: '8px 15px',
  },
}))

const Code = styled(Panel)(({ theme }) => ({
  '.header': {
    alignItems: 'center',
    background: tk(theme).innerHeader,
    borderBottom: `1px solid ${tk(theme).border}`,
    color: tk(theme).muted,
    display: 'flex',
    fontFamily: theme.fontFamilies.mono,
    fontSize: 11,
    gap: 8,
    height: 43,
    padding: '0 14px',
  },
  pre: {
    color: tk(theme).text,
    fontFamily: theme.fontFamilies.mono,
    fontSize: 13,
    lineHeight: 1.55,
    margin: 0,
    padding: '16px 14px 14px',
    whiteSpace: 'pre',
  },
  '.comment': { color: tk(theme).faint },
  '.keyword': { color: tk(theme).codeKeyword },
  '.string': { color: tk(theme).codeString },
  '.number': { color: tk(theme).codeNumber },
  '.key': { color: tk(theme).codeKey },
}))

const Diff = styled(Panel)(({ theme }) => ({
  '.header': {
    alignItems: 'center',
    background: tk(theme).innerHeader,
    borderBottom: `1px solid ${tk(theme).border}`,
    color: tk(theme).muted,
    display: 'flex',
    fontFamily: theme.fontFamilies.mono,
    fontSize: 9,
    gap: 6,
    height: 28,
    padding: '0 10px',
  },
  '.summary': { marginLeft: 'auto' },
  '.columns': {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    padding: '8px 0',
  },
  '.line': {
    color: tk(theme).text,
    display: 'grid',
    fontFamily: theme.fontFamilies.mono,
    fontSize: 9,
    gridTemplateColumns: '22px 1fr',
    lineHeight: '18px',
    overflow: 'hidden',
    paddingLeft: 8,
    whiteSpace: 'nowrap',
  },
  '.number': { color: tk(theme).faint },
  '.removed': {
    background:
      theme.mode === 'dark'
        ? 'rgb(237 70 108 / 0.22)'
        : 'rgb(237 70 108 / 0.13)',
  },
  '.added': {
    background:
      theme.mode === 'dark'
        ? 'rgb(64 200 160 / 0.18)'
        : 'rgb(64 200 160 / 0.15)',
  },
}))

const Record = styled(Panel)(({ theme }) => ({
  padding: '12px 16px 16px',
  '.header': {
    alignItems: 'center',
    color: tk(theme).text,
    display: 'flex',
    fontSize: 13,
    fontWeight: 600,
    gap: 12,
    marginBottom: 18,
  },
  '.caret': { color: tk(theme).muted, marginLeft: 'auto' },
  '.url': { alignItems: 'center', display: 'flex', gap: 12 },
  '.description': { color: tk(theme).muted, fontSize: 11, marginTop: 2 },
  '.meta': {
    display: 'grid',
    gap: 14,
    gridTemplateColumns: '1.4fr 1fr 1fr 0.8fr',
    marginTop: 18,
    whiteSpace: 'nowrap',
  },
}))

const MetaItem = styled.div(({ theme }) => ({
  '.metaLabel': { color: tk(theme).muted, fontSize: 11, marginBottom: 5 },
  '.metaValue': {
    alignItems: 'center',
    color: tk(theme).text,
    display: 'flex',
    fontSize: 12,
    gap: 5,
  },
}))

const Chip = styled.span<{ $tone: 'progress' | 'firing' | 'plain' }>(
  ({ theme, $tone }) => ({
    alignItems: 'center',
    background:
      $tone === 'progress'
        ? 'transparent'
        : theme.mode === 'dark'
          ? '#33353C'
          : '#EEF0F4',
    border: $tone === 'progress' ? `1px solid ${tk(theme).border}` : 0,
    borderRadius: 3,
    color: tk(theme).text,
    display: 'inline-flex',
    fontSize: 11,
    gap: 6,
    padding: '3px 8px',
  })
)

const Ticket = styled(Panel)(({ theme }) => ({
  padding: '22px 22px 18px',
  '.id': { color: tk(theme).muted, fontSize: 12, marginBottom: 6 },
  '.title': {
    color: tk(theme).text,
    fontSize: 14,
    lineHeight: 1.3,
    marginBottom: 16,
  },
  '.body': { color: tk(theme).muted, fontSize: 14, lineHeight: 1.35 },
  '.meta': {
    display: 'grid',
    gridTemplateColumns: '110px 110px max-content',
    marginTop: 12,
    whiteSpace: 'nowrap',
  },
}))

const Integration = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  '.box': {
    background: tk(theme).inner,
    borderRadius: 4,
    padding: '18px 22px 22px',
  },
  '.label': {
    color: tk(theme).muted,
    fontSize: 11,
    letterSpacing: '0.08em',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  '.select': {
    alignItems: 'center',
    background: tk(theme).outer,
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 3,
    color: tk(theme).text,
    display: 'flex',
    fontSize: 14,
    gap: 10,
    height: 40,
    padding: '0 12px',
  },
  '.select svg:last-child': { marginLeft: 'auto' },
  '.form': { border: `1px solid ${tk(theme).border}`, position: 'relative' },
  '.field': {
    color: tk(theme).muted,
    fontSize: 14,
    height: 39,
    whiteSpace: 'nowrap',
  },
  '.more': { color: tk(theme).faint, fontSize: 14, marginTop: 2 },
  '.menu': {
    background: tk(theme).outer,
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 3,
    boxShadow: '0 10px 24px rgb(0 0 0 / 0.25)',
    left: 120,
    position: 'absolute',
    top: 21,
    width: 198,
  },
  '.option': {
    alignItems: 'center',
    borderBottom: `1px solid ${tk(theme).border}`,
    color: tk(theme).text,
    display: 'flex',
    fontSize: 11,
    gap: 8,
    height: 37,
    padding: '0 12px',
  },
  '.option.active': {
    background: theme.mode === 'dark' ? '#3A3C44' : '#ECEEF4',
    fontWeight: 600,
  },
  '.avatar': {
    alignItems: 'center',
    background: tk(theme).well,
    border: `1px solid ${tk(theme).border}`,
    borderRadius: '50%',
    color: tk(theme).muted,
    display: 'inline-flex',
    fontSize: 7,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  '.pluralAvatar': {
    alignItems: 'center',
    background: 'linear-gradient(135deg, #8B6DF6, #494FF2)',
    borderRadius: '50%',
    color: '#FFFFFF',
    display: 'inline-flex',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
}))

const Chat = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 2,
  '.message': { alignItems: 'center', display: 'flex', gap: 8 },
  '.message.plural': { justifyContent: 'flex-end' },
  '.bubble': {
    background: tk(theme).inner,
    borderRadius: 6,
    color: tk(theme).text,
    fontSize: 11,
    lineHeight: 1.4,
    maxWidth: 212,
    padding: '7px 9px',
  },
  '.avatar': {
    alignItems: 'center',
    border: `1px solid ${tk(theme).border}`,
    borderRadius: '50%',
    color: tk(theme).muted,
    display: 'inline-flex',
    fontSize: 9,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  '.pluralAvatar': {
    alignItems: 'center',
    background: 'linear-gradient(135deg, #8B6DF6, #494FF2)',
    borderRadius: '50%',
    color: '#FFFFFF',
    display: 'inline-flex',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  '.composer': {
    background: theme.mode === 'dark' ? '#35373F' : tk(theme).inner,
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 6,
    marginTop: 4,
    padding: '10px 12px 10px 14px',
  },
  '.placeholder': { color: tk(theme).muted, fontSize: 10, marginBottom: 12 },
  '.controls': {
    alignItems: 'center',
    color: tk(theme).muted,
    display: 'flex',
    gap: 8,
  },
  '.model': {
    alignItems: 'center',
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 4,
    color: tk(theme).text,
    display: 'flex',
    fontSize: 11,
    gap: 7,
    height: 24,
    marginLeft: 'auto',
    padding: '0 8px',
  },
  '.send': {
    alignItems: 'center',
    border: `1px solid ${tk(theme).border}`,
    borderRadius: '50%',
    color: tk(theme).text,
    display: 'inline-flex',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
}))

const Report = styled.div(({ theme }) => ({
  display: 'grid',
  gap: 8,
  gridTemplateColumns: '161px 1fr',
  '.stat': {
    background: tk(theme).inner,
    borderRadius: 4,
    padding: '20px 14px',
  },
  '.statLabel': {
    color: tk(theme).muted,
    fontSize: 8,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  '.statValue': { color: tk(theme).text, fontSize: 19, margin: '4px 0 3px' },
  '.delta': { color: tk(theme).muted, fontSize: 8 },
  '.delta b': { color: '#F599A8', fontWeight: 400 },
}))

const Bars = styled.div(({ theme }) => ({
  background: tk(theme).inner,
  borderRadius: 4,
  padding: '14px 14px 18px',
  '.title': { color: tk(theme).text, fontSize: 10, marginBottom: 14 },
  '.bar': {
    alignItems: 'center',
    display: 'grid',
    fontFamily: theme.fontFamilies.mono,
    fontSize: 6,
    gap: 10,
    gridTemplateColumns: '75px 1fr 34px',
    height: 22,
  },
  '.barLabel': { color: tk(theme).muted },
  '.track': {
    background: theme.mode === 'dark' ? '#33353C' : '#E8EAF0',
    borderRadius: 4,
    height: 4,
    overflow: 'hidden',
  },
  '.fill': { borderRadius: 4, height: '100%' },
  '.barValue': { color: tk(theme).muted },
}))

const ChartCard = styled.div(({ theme }) => ({
  background: tk(theme).inner,
  borderRadius: 4,
  padding: '10px 10px 12px',
  '.header': {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  '.title': { color: tk(theme).text, fontSize: 8 },
  '.ranges': { display: 'flex', gap: 2 },
  '.range': {
    borderRadius: 2,
    color: tk(theme).muted,
    fontSize: 5,
    padding: '3px 3px',
  },
  '.range:first-child': {
    background: theme.mode === 'dark' ? '#33353C' : '#ECEEF4',
    color: tk(theme).text,
  },
  '.caption': { color: tk(theme).faint, fontSize: 5, marginTop: 6 },
  svg: { display: 'block', width: '100%' },
}))

const Logs = styled(Panel)(({ theme }) => ({
  background: tk(theme).inner,
  padding: '10px 10px 0',
  '.header': {
    alignItems: 'center',
    color: tk(theme).text,
    display: 'flex',
    fontSize: 8,
    gap: 8,
    marginBottom: 12,
  },
  '.subtitle': {
    alignItems: 'center',
    color: tk(theme).muted,
    display: 'flex',
    fontSize: 8,
    justifyContent: 'space-between',
    marginBottom: 6,
    padding: '0 6px',
  },
  '.lines': { background: tk(theme).well, padding: '6px 0' },
  '.line': {
    borderLeft: '2px solid transparent',
    color: tk(theme).muted,
    fontFamily: theme.fontFamilies.mono,
    fontSize: 6,
    lineHeight: '13px',
    overflow: 'hidden',
    padding: '0 8px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.line.info': { borderLeftColor: accent.teal },
  '.line.error': { borderLeftColor: '#F599A8' },
}))

function Meta({ item }: { item: ProductShotMeta }) {
  return (
    <MetaItem>
      <div className="metaLabel">{item.label}</div>
      <div className="metaValue">
        {item.chip ? (
          <Chip $tone={item.chip}>
            {item.chip === 'progress' && <CircleDashIcon size={9} />}
            {item.chip === 'firing' && (
              <ErrorIcon
                color="#F599A8"
                size={9}
              />
            )}
            {item.value}
          </Chip>
        ) : (
          <>
            {item.logo && (
              <Logo
                logo={item.logo}
                size={11}
              />
            )}
            {item.value}
          </>
        )}
      </div>
    </MetaItem>
  )
}

function HighlightPart({ part }: { part: ProductShotHighlightPart }) {
  switch (part.type) {
    case 'text':
      return (
        <div className="text">
          <RichText text={part.text} />
        </div>
      )
    case 'heading':
      return (
        <div className="heading">
          <RichText text={part.text} />
        </div>
      )
    case 'bullets':
      return (
        <ul>
          {part.items.map((item) => (
            <li key={item}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      )
    case 'facts':
      return (
        <Facts>
          {part.items.map((fact) => (
            <div key={fact.label}>
              {fact.label} <b>{fact.value}</b>
            </div>
          ))}
        </Facts>
      )
    case 'stats':
      return (
        <Stats>
          {part.items.map((stat) => (
            <div
              className="stat"
              key={stat.label}
            >
              <IconCircle>
                {stat.icon === 'memory' ? (
                  <RamIcon size={11} />
                ) : stat.icon === 'cpu' ? (
                  <CpuIcon size={11} />
                ) : (
                  <StackIcon size={11} />
                )}
              </IconCircle>
              <div>
                <div className="label">{stat.label}</div>
                <div className="value">{stat.value}</div>
              </div>
            </div>
          ))}
        </Stats>
      )
    case 'table':
      return (
        <Table className={part.columns[0] === 'PR' ? 'narrow' : undefined}>
          <div className="row head">
            {part.columns.map((column) => (
              <div key={column}>{column}</div>
            ))}
          </div>
          {part.rows.map((row, rowIndex) => (
            <div
              className="row"
              key={rowIndex}
            >
              {row.map((cell, cellIndex) => (
                <div key={cellIndex}>
                  <TableCell cell={cell} />
                </div>
              ))}
            </div>
          ))}
        </Table>
      )
  }
}

function TableCell({ cell }: { cell: ProductShotTableCell }) {
  if (typeof cell === 'string') return <RichText text={cell} />

  return (
    <Severity $tone={cell.severity}>
      {cell.severity === 'critical' ? (
        <ErrorIcon
          color="#F599A8"
          size={8}
        />
      ) : (
        <WarningIcon
          color="#FFF48F"
          size={8}
        />
      )}
      {cell.label}
    </Severity>
  )
}

const highlightCode = (line: string, language: 'HCL' | 'YAML'): ReactNode => {
  if (line.trim().startsWith('#'))
    return <span className="comment">{line}</span>
  if (language === 'YAML') {
    const match = line.match(/^(\s*)([\w-]+):(.*)$/)

    if (!match) return line

    return (
      <>
        {match[1]}
        <span className="key">{match[2]}</span>:
        <span className="string">{match[3]}</span>
      </>
    )
  }

  return line.split(/("[^"]*"|\b\d+\b|\bvariable\b)/).map((token, index) => {
    if (token === 'variable')
      return (
        <span
          className="keyword"
          key={index}
        >
          {token}
        </span>
      )
    if (token.startsWith('"'))
      return (
        <span
          className="string"
          key={index}
        >
          {token}
        </span>
      )
    if (/^\d+$/.test(token))
      return (
        <span
          className="number"
          key={index}
        >
          {token}
        </span>
      )

    return token
  })
}

const linePoints = [
  [8, 30, 18, 22, 38, 34, 26, 36],
  [26, 24, 32, 46, 52, 44, 30, 16],
  [34, 14, 8, 12, 30, 40, 58, 44],
  [40, 36, 34, 22, 20, 12, 8, 4],
]
const lineColors = ['#99DAFF', '#F2B66D', '#99F5D5', '#C6A8FF']

function LineChart() {
  const t = useShotTokens()

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 140"
    >
      {[20, 45, 70, 95, 120].map((y) => (
        <line
          key={y}
          stroke={t.border}
          x1="16"
          x2="300"
          y1={y}
          y2={y}
        />
      ))}
      {linePoints.map((points, index) => (
        <polyline
          fill="none"
          key={index}
          points={points
            .map((value, i) => `${18 + i * 40},${120 - value * 1.6}`)
            .join(' ')}
          stroke={lineColors[index]}
          strokeWidth="1.4"
        />
      ))}
    </svg>
  )
}

const errorSeries = [
  6, 9, 8, 10, 7, 14, 16, 8, 7, 8, 9, 7, 12, 8, 13, 9, 10, 9, 10, 10,
]
const okSeries = [3, 5, 4, 5, 4, 8, 9, 3, 4, 4, 5, 3, 6, 5, 6, 5, 6, 5, 6, 6]

function AreaChart({ labels }: { labels: readonly string[] }) {
  const t = useShotTokens()
  const toPoints = (series: number[]) =>
    series
      .map((value, index) => `${24 + index * 14},${150 - value * 8}`)
      .join(' ')

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 180"
    >
      {Array.from({ length: 9 }, (_, index) => (
        <g key={index}>
          <line
            stroke={t.border}
            x1="22"
            x2="300"
            y1={14 + index * 17}
            y2={14 + index * 17}
          />
          <text
            fill={t.muted}
            fontSize="6"
            x="0"
            y={16 + index * 17}
          >
            {`.0${16 - index * 2}`.replace('.0-', '-.0')}
          </text>
        </g>
      ))}
      <polygon
        fill="rgb(73 79 242 / 0.35)"
        points={`24,150 ${toPoints(errorSeries)} 290,150`}
        stroke="#7075F7"
        strokeWidth="1.3"
      />
      <polygon
        fill={
          t.mode === 'dark'
            ? 'rgb(235 239 240 / 0.24)'
            : 'rgb(80 88 110 / 0.22)'
        }
        points={`24,150 ${toPoints(okSeries)} 290,150`}
        stroke={t.mode === 'dark' ? '#EBEFF0' : '#596070'}
        strokeWidth="1.3"
      />
      <line
        stroke="#F599A8"
        strokeWidth="0.8"
        x1="22"
        x2="300"
        y1="62"
        y2="62"
      />
      {labels.map((label, index) => (
        <text
          fill={t.muted}
          fontSize="6"
          key={label}
          transform={`rotate(45 ${30 + index * 36} 162)`}
          x={30 + index * 36}
          y="162"
        >
          {label}
        </text>
      ))}
    </svg>
  )
}

export function ShotBlock({ block }: { block: ProductShotBlock }) {
  const t = useShotTokens()

  switch (block.type) {
    case 'connection':
      return (
        <Connection>
          <div className="label">{block.label}</div>
          {block.rows.map((row) => (
            <div
              className="row"
              key={row.label}
            >
              <span className="key">{row.label}</span>
              <span className="value">
                {row.logos.map((logo) => (
                  <Logo
                    key={logo}
                    logo={logo}
                    size={row.value ? 20 : 22}
                  />
                ))}
                {row.value}
                {row.more && <span className="more">{row.more}</span>}
              </span>
            </div>
          ))}
          <div className="action">
            <AiSparkleFilledIcon size={15} />
            {block.action}
          </div>
          <div
            aria-hidden="true"
            className="skeleton"
          >
            <i />
            <i />
            <i />
          </div>
        </Connection>
      )
    case 'agent':
      return (
        <Agent>
          <svg
            aria-hidden="true"
            className="spinner"
            height="20"
            viewBox="0 0 20 20"
            width="20"
          >
            {Array.from({ length: 8 }, (_, index) => (
              <line
                key={index}
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.3"
                transform={`rotate(${index * 45} 10 10)`}
                x1="10"
                x2="10"
                y1="2"
                y2="6"
              />
            ))}
          </svg>
          <div>
            <GradientText className="title">{block.title}</GradientText>
            <Ellipsis className="subtitle">{block.subtitle}</Ellipsis>
          </div>
        </Agent>
      )
    case 'todos':
      return (
        <Todos>
          <div className="title">{block.title}</div>
          {block.items.map((item) => (
            <Fragment key={item.label}>
              <div className="item">
                {item.done ? (
                  <CheckOutlineIcon
                    className="icon"
                    size={15}
                  />
                ) : (
                  <CircleDashIcon
                    className="icon"
                    size={15}
                  />
                )}
                <Ellipsis>{item.label}</Ellipsis>
                {item.done ? (
                  <CaretDownIcon
                    className="icon"
                    size={13}
                  />
                ) : (
                  <CaretLeftIcon
                    className="icon"
                    size={13}
                  />
                )}
              </div>
              {item.detail && (
                <div className="item">
                  <Ellipsis className="detail">{item.detail}</Ellipsis>
                </div>
              )}
            </Fragment>
          ))}
        </Todos>
      )
    case 'highlight':
      return (
        <Highlight>
          <GradientText className="title">{block.title}</GradientText>
          {block.parts.map((part, index) => (
            <HighlightPart
              key={index}
              part={part}
            />
          ))}
        </Highlight>
      )
    case 'pullRequests':
      return (
        <PullRequests>
          <div className="header">
            <IconCircle>
              <GitPullIcon size={13} />
            </IconCircle>
            {block.title}
          </div>
          {block.items.map((item) => (
            <div
              className="pr"
              key={item.path}
            >
              <div style={{ minWidth: 0 }}>
                <div className="path">{item.path}</div>
                <Ellipsis className="description">{item.description}</Ellipsis>
              </div>
              <span className="open">Open</span>
              <span className="view">View PR</span>
            </div>
          ))}
        </PullRequests>
      )
    case 'code':
      return (
        <Code>
          <div className="header">
            <FileIcon size={11} />
            {block.language}
          </div>
          <pre>
            {block.lines.map((line, index) => (
              <div key={index}>
                {line ? highlightCode(line, block.language) : ' '}
              </div>
            ))}
          </pre>
        </Code>
      )
    case 'diff':
      return (
        <Diff>
          <div className="header">
            <FileIcon size={9} />
            {block.file}
            <span className="summary">{block.summary}</span>
          </div>
          <div className="columns">
            {[block.left, block.right].map((side, sideIndex) => (
              <div key={sideIndex}>
                {side.map((line, index) => (
                  <div
                    className={`line ${'removed' in line && line.removed ? 'removed' : ''} ${'added' in line && line.added ? 'added' : ''}`}
                    key={index}
                  >
                    <span className="number">{index + 1}</span>
                    <span>{line.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Diff>
      )
    case 'record':
      return (
        <Record>
          <div className="header">
            <IconCircle>
              {block.icon === 'alert' ? (
                <MegaphoneIcon size={12} />
              ) : (
                <TicketIcon size={12} />
              )}
            </IconCircle>
            {block.title}
            <CaretDownIcon
              className="caret"
              size={12}
            />
          </div>
          <div className="url">
            <Ellipsis
              style={{
                color: block.icon === 'alert' ? t.text : t.codeString,
                fontSize: 12,
              }}
            >
              {block.url}
            </Ellipsis>
            <ArrowTopRightIcon
              color={t.muted}
              size={10}
            />
          </div>
          <div className="description">{block.description}</div>
          <div className="meta">
            {block.meta.map((item) => (
              <Meta
                item={item}
                key={item.label}
              />
            ))}
          </div>
        </Record>
      )
    case 'ticket':
      return (
        <Ticket>
          <div className="id">{block.id}</div>
          <div className="title">{block.title}</div>
          <div className="body">{block.body}</div>
          <div className="meta">
            {block.meta.map((item) => (
              <Meta
                item={item}
                key={item.label}
              />
            ))}
          </div>
        </Ticket>
      )
    case 'integration':
      return (
        <Integration>
          <div className="box">
            <div className="label">{block.label}</div>
            <div className="select">
              <Logo
                logo={block.integration.logo}
                size={18}
              />
              {block.integration.name}
              <CaretDownIcon size={12} />
            </div>
          </div>
          <div className="box form">
            {block.fields.map((field) => (
              <div
                className="field"
                key={field}
              >
                {field}
              </div>
            ))}
            <div className="more">{block.more}</div>
            <div className="menu">
              {block.options.map((option) => (
                <div
                  className={`option ${option.plural ? 'active' : ''}`}
                  key={option.name}
                >
                  {option.plural ? (
                    <span className="pluralAvatar">
                      <PluralLogoIcon size={11} />
                    </span>
                  ) : (
                    <span className="avatar">{option.initials}</span>
                  )}
                  {option.name}
                </div>
              ))}
            </div>
          </div>
        </Integration>
      )
    case 'chat':
      return (
        <Chat>
          {block.messages.map((message) => (
            <div
              className={`message ${message.from}`}
              key={message.text}
            >
              {message.from === 'user' && (
                <span className="avatar">{message.initials}</span>
              )}
              <div className="bubble">{message.text}</div>
              {message.from === 'plural' && (
                <span className="pluralAvatar">
                  <PluralLogoIcon size={11} />
                </span>
              )}
            </div>
          ))}
          <div className="composer">
            <div className="placeholder">{block.placeholder}</div>
            <div className="controls">
              <AiSparkleFilledIcon size={12} />
              <span className="model">
                <Logo
                  logo={block.model.logo}
                  size={11}
                />
                {block.model.name}
                <CaretDownIcon size={8} />
              </span>
              <span className="send">
                <ArrowUpIcon size={12} />
              </span>
            </div>
          </div>
        </Chat>
      )
    case 'report':
      return (
        <Report>
          <Highlight style={{ gap: 6, padding: '12px 12px 14px' }}>
            <GradientText
              className="title"
              style={{ fontSize: 12 }}
            >
              {block.title}
            </GradientText>
            <Facts style={{ fontSize: 9 }}>
              {block.facts.map((fact) => (
                <div key={fact.label}>
                  {fact.label} <b>{fact.value}</b>
                </div>
              ))}
            </Facts>
          </Highlight>
          <div className="stat">
            <div className="statLabel">{block.stat.label}</div>
            <div className="statValue">{block.stat.value}</div>
            <div className="delta">
              <b>↑ {block.stat.delta.split(' ')[0]}</b>{' '}
              {block.stat.delta.split(' ').slice(1).join(' ')}
            </div>
          </div>
        </Report>
      )
    case 'bars':
      return (
        <Bars>
          <div className="title">{block.title}</div>
          {block.items.map((item, index) => (
            <div
              className="bar"
              key={item.label}
            >
              <span className="barLabel">{item.label}</span>
              <span className="track">
                <span
                  className="fill"
                  style={{
                    background: lineColors[[0, 3, 2, 3][index]],
                    display: 'block',
                    width: `${item.percent}%`,
                  }}
                />
              </span>
              <span className="barValue">{item.value}</span>
            </div>
          ))}
        </Bars>
      )
    case 'lineChart':
      return (
        <ChartCard>
          <div className="header">
            <span className="title">{block.title}</span>
            <span className="ranges">
              {block.ranges.map((range) => (
                <span
                  className="range"
                  key={range}
                >
                  {range}
                </span>
              ))}
            </span>
          </div>
          <LineChart />
          <div className="caption">{block.caption}</div>
        </ChartCard>
      )
    case 'areaChart':
      return (
        <ChartCard style={{ padding: '14px 14px 10px' }}>
          <div
            className="title"
            style={{ marginBottom: 12 }}
          >
            {block.title}
          </div>
          <AreaChart labels={block.labels} />
        </ChartCard>
      )
    case 'logs':
      return (
        <Logs>
          <div className="header">
            <LogsIcon size={10} />
            {block.title}
          </div>
          <div className="subtitle">
            {block.subtitle}
            <CaretDownIcon size={8} />
          </div>
          <div className="lines">
            {block.lines.map((line) => (
              <div
                className={`line ${line.marker ?? ''}`}
                key={line.text}
              >
                {line.text}
              </div>
            ))}
          </div>
        </Logs>
      )
  }
}

export function SkeletonBlock() {
  return (
    <Skeleton aria-hidden="true">
      <i />
      <i />
      <i />
    </Skeleton>
  )
}

const Skeleton = styled(Panel)(({ theme }) => ({
  display: 'grid',
  gap: 9,
  padding: 18,
  i: {
    background: tk(theme).skeleton,
    borderRadius: 3,
    display: 'block',
    height: 12,
  },
  'i:first-child': { width: '45%' },
  'i:last-child': { width: '70%' },
}))
