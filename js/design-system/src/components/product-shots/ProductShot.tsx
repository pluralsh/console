import { useEffect, useState } from 'react'
import styled, { ThemeProvider } from 'styled-components'

import { styledThemeDark, styledThemeLight } from '../../theme'
import {
  type ProductShotBlock,
  type ProductShotFidelity,
  type ProductShotScenarioId,
  type ProductShotTheme,
  productShotScenarios,
} from './scenarios'

export type ProductShotProps = {
  scenario: ProductShotScenarioId
  step?: number
  fidelity?: ProductShotFidelity
  theme?: ProductShotTheme
  animate?: boolean
  interval?: number
  className?: string
}

const Shell = styled.div(({ theme }) => ({
  boxSizing: 'border-box',
  color: theme.colors.text,
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 18,
  boxShadow: theme.mode === 'dark'
    ? '0 28px 80px rgb(0 0 0 / 0.42)'
    : '0 28px 80px rgb(24 32 56 / 0.16)',
  display: 'grid',
  gridTemplateColumns: '72px minmax(0, 1fr)',
  fontFamily: theme.fontFamilies.sans,
  height: 560,
  maxWidth: '100%',
  overflow: 'hidden',
  position: 'relative',
  width: 840,
  '*': { boxSizing: 'border-box' },
}))

const Rail = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['fill-one'],
  borderRight: `1px solid ${theme.colors.border}`,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  padding: '20px 0',
}))

const Mark = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['action-primary'],
  borderRadius: 10,
  color: theme.colors['text-on-filled-bg'],
  display: 'flex',
  fontSize: 17,
  fontWeight: 700,
  height: 36,
  justifyContent: 'center',
  marginBottom: 10,
  width: 36,
}))

const RailItem = styled.div<{ $active?: boolean }>(({ theme, $active }) => ({
  background: $active ? theme.colors['fill-two'] : 'transparent',
  borderRadius: 9,
  color: $active ? theme.colors['text'] : theme.colors['text-light'],
  fontSize: 15,
  padding: 9,
}))

const Main = styled.div({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
})

const Topbar = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderBottom: `1px solid ${theme.colors.border}`,
  display: 'flex',
  height: 64,
  justifyContent: 'space-between',
  padding: '0 24px',
}))

const Breadcrumb = styled.div(({ theme }) => ({
  color: theme.colors['text-light'],
  fontSize: 13,
  span: { color: theme.colors.text, fontWeight: 600 },
}))

const Avatar = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['fill-two'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: '50%',
  display: 'flex',
  fontSize: 11,
  fontWeight: 700,
  height: 30,
  justifyContent: 'center',
  width: 30,
}))

const Canvas = styled.div(({ theme }) => ({
  background: theme.mode === 'dark'
    ? 'radial-gradient(circle at 70% 0%, rgb(74 81 242 / 0.11), transparent 42%)'
    : 'radial-gradient(circle at 70% 0%, rgb(74 81 242 / 0.08), transparent 42%)',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  padding: '34px 38px',
}))

const Eyebrow = styled.div(({ theme }) => ({
  color: theme.colors['text-light'],
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  marginBottom: 8,
  textTransform: 'uppercase',
}))

const Title = styled.div({
  fontSize: 25,
  fontWeight: 650,
  letterSpacing: '-0.025em',
  marginBottom: 26,
})

const Panel = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 13,
  boxShadow: theme.mode === 'dark' ? '0 12px 36px rgb(0 0 0 / 0.2)' : '0 12px 36px rgb(30 40 70 / 0.08)',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
  padding: 22,
}))

const Button = styled.div(({ theme }) => ({
  alignItems: 'center',
  alignSelf: 'flex-start',
  background: theme.colors['action-primary'],
  borderRadius: 7,
  color: theme.colors['text-on-filled-bg'],
  display: 'inline-flex',
  fontSize: 12,
  fontWeight: 600,
  minHeight: 36,
  padding: '0 14px',
}))

const Muted = styled.div(({ theme }) => ({
  color: theme.colors['text-light'],
  fontSize: 12,
  lineHeight: 1.55,
}))

const Code = styled.div(({ theme }) => ({
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 8,
  color: theme.colors.text,
  fontFamily: theme.fontFamilies.mono,
  fontSize: 12,
  lineHeight: 1.7,
  margin: '12px 0 18px',
  overflow: 'hidden',
  padding: '14px 16px',
}))

const renderBlock = (block: ProductShotBlock) => {
  switch (block.type) {
    case 'prompt':
      return <><Eyebrow>Agent task</Eyebrow><div style={{ fontSize: 18, lineHeight: 1.45, maxWidth: 540, marginBottom: 26 }}>{block.text}</div><Button>{block.action} →</Button></>
    case 'progress':
      return <><Eyebrow>{block.label}</Eyebrow><div style={{ marginTop: 14 }}>{block.items.map((item, index) => <ProgressRow key={item}><Pulse $done={index < 2}>{index < 2 ? '✓' : '•'}</Pulse><span>{item}</span><Muted>{index < 2 ? 'Complete' : 'Running'}</Muted></ProgressRow>)}</div></>
    case 'issues':
      return <><Eyebrow>Recommended work</Eyebrow>{block.items.map((item) => <IssueRow key={item.label}><span>{item.label}</span><Badge>{item.severity}</Badge></IssueRow>)}</>
    case 'diff':
      return <><Filebar>{block.file}</Filebar><Code><DiffLine $removed>− {block.removed}</DiffLine><DiffLine>+ {block.added}</DiffLine></Code><Button>{block.action} →</Button></>
    case 'ticket':
      return <><Eyebrow>{block.source} · {block.id}</Eyebrow><div style={{ fontSize: 20, lineHeight: 1.4, margin: '10px 0 24px' }}>{block.title}</div><Button>Start background agent →</Button></>
    case 'code':
      return <><Filebar>{block.file}</Filebar><Code>{block.lines.map((line, i) => <div key={`${i}-${line}`}><span style={{ opacity: 0.45, paddingRight: 18 }}>{i + 1}</span>{line}</div>)}</Code><Muted>Drafted from repository and runtime context</Muted></>
    case 'sql':
      return <><Eyebrow>Queryable cost data</Eyebrow><Code>{block.query}</Code>{block.rows.map((row) => <DataRow key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></DataRow>)}</>
    case 'chart':
      return <><Eyebrow>{block.label}</Eyebrow><div style={{ fontSize: 32, fontWeight: 650, margin: '4px 0' }}>{block.value}</div><Muted>{block.detail}</Muted><Chart aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></Chart></>
    case 'alert':
      return <Alert><span>!</span><div><b>{block.title}</b><Muted>{block.detail}</Muted></div></Alert>
    case 'connections':
      return <Connections><Center>{block.center}</Center>{block.nodes.map((node) => <Node key={node}>{node}</Node>)}</Connections>
  }
}

const ProgressRow = styled.div(({ theme }) => ({ alignItems: 'center', borderBottom: `1px solid ${theme.colors.border}`, display: 'grid', gap: 12, gridTemplateColumns: '26px 1fr auto', minHeight: 56 }))
const Pulse = styled.span<{ $done?: boolean }>(({ theme, $done }) => ({ alignItems: 'center', background: theme.colors['fill-two'], borderRadius: '50%', color: $done ? theme.colors['icon-success'] : theme.colors['action-primary'], display: 'flex', fontSize: 11, height: 24, justifyContent: 'center', width: 24 }))
const IssueRow = styled.div(({ theme }) => ({ alignItems: 'center', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', fontSize: 13, justifyContent: 'space-between', minHeight: 64 }))
const Badge = styled.span(({ theme }) => ({ background: theme.colors['fill-two'], borderRadius: 20, color: theme.colors['text-light'], fontSize: 10, padding: '6px 9px' }))
const Filebar = styled.div(({ theme }) => ({ borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors['text-light'], fontFamily: theme.fontFamilies.mono, fontSize: 11, margin: '-4px -4px 0', padding: '0 4px 12px' }))
const DiffLine = styled.div<{ $removed?: boolean }>(({ theme, $removed }) => ({ background: $removed ? theme.colors['fill-two'] : theme.colors['fill-accent'], color: $removed ? theme.colors['text-danger'] : theme.colors['text-success'], margin: '0 -16px', padding: '3px 16px' }))
const DataRow = styled.div(({ theme }) => ({ borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', fontFamily: theme.fontFamilies.mono, fontSize: 12, justifyContent: 'space-between', padding: '12px 4px' }))
const Chart = styled.div(({ theme }) => ({ alignItems: 'end', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', gap: 12, height: 150, marginTop: 18, padding: '0 12px', i: { background: theme.colors['action-primary'], borderRadius: '5px 5px 0 0', display: 'block', flex: 1 }, 'i:nth-child(1)': { height: '28%' }, 'i:nth-child(2)': { height: '42%' }, 'i:nth-child(3)': { height: '38%' }, 'i:nth-child(4)': { height: '64%' }, 'i:nth-child(5)': { height: '86%' }, 'i:nth-child(6)': { height: '55%' }, 'i:nth-child(7)': { height: '48%' } }))
const Alert = styled.div(({ theme }) => ({ alignItems: 'center', background: theme.colors['fill-two'], border: `1px solid ${theme.colors['border-danger']}`, borderRadius: 10, display: 'flex', gap: 16, padding: 18, span: { alignItems: 'center', background: theme.colors['fill-zero'], borderRadius: '50%', color: theme.colors['icon-danger'], display: 'flex', fontWeight: 700, height: 34, justifyContent: 'center', width: 34 }, b: { display: 'block', marginBottom: 4 } }))
const Connections = styled.div({ alignItems: 'center', display: 'flex', flex: 1, gap: 24, justifyContent: 'center' })
const Center = styled.div(({ theme }) => ({ background: theme.colors['action-primary'], borderRadius: 14, color: theme.colors['text-on-filled-bg'], fontWeight: 700, padding: 24 }))
const Node = styled.div(({ theme }) => ({ background: theme.colors['fill-two'], border: `1px solid ${theme.colors.border}`, borderRadius: 10, fontSize: 12, padding: 14 }))

export function ProductShot({
  scenario: scenarioId,
  step = 0,
  fidelity,
  theme = 'dark',
  animate = false,
  interval = 4000,
  className,
}: ProductShotProps) {
  const scenario = productShotScenarios[scenarioId]
  const [activeStep, setActiveStep] = useState(step)

  useEffect(() => {
    setActiveStep(step)
  }, [step])

  useEffect(() => {
    if (!animate || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = globalThis.setInterval(() => setActiveStep((value) => (value + 1) % scenario.steps.length), interval)
    return () => globalThis.clearInterval(timer)
  }, [animate, interval, scenario.steps.length])

  const current = scenario.steps[activeStep % scenario.steps.length]
  const displayFidelity = fidelity ?? current.fidelity
  const body = displayFidelity === 'abstract'
    ? <Connections><Center>Plural</Center><Node>Git</Node><Node>Cloud</Node><Node>Kubernetes</Node></Connections>
    : current.blocks.map((block, index) => <div key={index}>{renderBlock(block)}</div>)

  return (
    <ThemeProvider theme={theme === 'dark' ? styledThemeDark : styledThemeLight}>
      <Shell className={className} data-product-shot={`${scenarioId}:${current.id}`} data-theme={theme}>
        <Rail><Mark>P</Mark><RailItem>⌂</RailItem><RailItem>⌁</RailItem><RailItem $active>✦</RailItem><RailItem>⌘</RailItem></Rail>
        <Main>
          <Topbar><Breadcrumb>Workspace / <span>AI agents</span></Breadcrumb><Avatar>AN</Avatar></Topbar>
          <Canvas>
            <Eyebrow>{scenario.title} · {activeStep + 1} of {scenario.steps.length}</Eyebrow>
            <Title>{current.title}</Title>
            <Panel data-fidelity={displayFidelity}>{body}</Panel>
          </Canvas>
        </Main>
      </Shell>
    </ThemeProvider>
  )
}
