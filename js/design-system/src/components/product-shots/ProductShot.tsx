import { type ComponentType, useEffect, useState } from 'react'
import styled, { keyframes, ThemeProvider } from 'styled-components'

import {
  ArrowRightLeftIcon,
  CostManagementIcon,
  HomeIcon,
  MegaphoneIcon,
  PluralLogoIcon,
  StackIcon,
  TicketIcon,
  WorkbenchIcon,
} from '../../icons'
import { styledThemeDark, styledThemeLight } from '../../theme'
import { ShotBlock, shotTokens, SkeletonBlock } from './blocks'
import { CONTOUR_GROUP, CONTOUR_PATHS } from './contours'
import {
  type ProductShotFidelity,
  type ProductShotNav,
  type ProductShotScenario,
  type ProductShotScenarioId,
  type ProductShotTheme,
  productShotScenarios,
} from './scenarios'

export const PRODUCT_SHOT_WIDTH = 800
export const PRODUCT_SHOT_HEIGHT = 608

export type ProductShotProps = {
  scenario: ProductShotScenarioId
  step?: number
  fidelity?: ProductShotFidelity
  theme?: ProductShotTheme
  animate?: boolean
  interval?: number
  // Rendered width in px; the shot is laid out at 800×608 and scaled to fit.
  width?: number
  className?: string
}

const navIcons: Record<ProductShotNav, ComponentType<{ size?: number }>> = {
  workbench: WorkbenchIcon,
  ticket: TicketIcon,
  cost: CostManagementIcon,
  alerts: MegaphoneIcon,
}

const enter = keyframes({
  from: { opacity: 0, transform: 'translateY(10px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
})

const Frame = styled.div<{ $scale: number }>(({ $scale }) => ({
  height: PRODUCT_SHOT_HEIGHT * $scale,
  overflow: 'hidden',
  position: 'relative',
  width: PRODUCT_SHOT_WIDTH * $scale,
}))

const Stage = styled.div<{ $scale: number }>(({ theme, $scale }) => ({
  background: shotTokens(theme).stage,
  borderRadius: 16,
  boxSizing: 'border-box',
  color: shotTokens(theme).text,
  fontFamily: theme.fontFamilies.sans,
  height: PRODUCT_SHOT_HEIGHT,
  left: 0,
  overflow: 'hidden',
  position: 'absolute',
  top: 0,
  transform: `scale(${$scale})`,
  transformOrigin: 'top left',
  width: PRODUCT_SHOT_WIDTH,
  '*': { boxSizing: 'border-box' },
}))

const Window = styled.div(({ theme }) => ({
  background: shotTokens(theme).window,
  border: `1px solid ${shotTokens(theme).windowBorder}`,
  borderRadius: '14px 0 0 0',
  bottom: -20,
  display: 'grid',
  gridTemplateColumns: '87px 1fr',
  gridTemplateRows: '87px 1fr',
  left: 66,
  position: 'absolute',
  right: -20,
  top: 65,
  '.topbar': {
    alignItems: 'center',
    borderBottom: `1px solid ${shotTokens(theme).windowBorder}`,
    color: shotTokens(theme).rail,
    display: 'flex',
    gridColumn: '1 / 3',
    paddingLeft: 31,
  },
  '.rail': {
    alignItems: 'center',
    borderRight: `1px solid ${shotTokens(theme).windowBorder}`,
    color: shotTokens(theme).rail,
    display: 'flex',
    flexDirection: 'column',
    gap: 50,
    paddingTop: 42,
  },
  '.active': { color: shotTokens(theme).text },
  '.canvas': {
    backgroundImage: `radial-gradient(circle, ${shotTokens(theme).dots} 1px, transparent 1.3px)`,
    backgroundPosition: '6px 6px',
    backgroundSize: '12px 12px',
  },
}))

const Card = styled.div<{
  $plain?: boolean
  $animate: boolean
  $index: number
}>(({ theme, $plain, $animate, $index }) => ({
  animation: $animate
    ? `${enter} 420ms ${120 + $index * 90}ms ease-out both`
    : 'none',
  background: $plain ? 'transparent' : shotTokens(theme).outer,
  border: $plain ? 0 : `1px solid ${shotTokens(theme).outerBorder}`,
  borderRadius: 10,
  boxShadow: $plain ? '0 16px 40px rgb(0 0 0 / 0.18)' : shotTokens(theme).glow,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: $plain ? 0 : 28,
  position: 'absolute',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
}))

const Cursor = styled.svg<{ $animate: boolean }>(({ $animate }) => ({
  animation: $animate ? `${enter} 360ms 520ms ease-out both` : 'none',
  filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))',
  position: 'absolute',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
}))

function Contours({ color }: { color: string }) {
  return (
    <svg
      aria-hidden="true"
      height={PRODUCT_SHOT_HEIGHT}
      style={{ left: 0, position: 'absolute', top: 0 }}
      viewBox={`0 0 ${PRODUCT_SHOT_WIDTH} ${PRODUCT_SHOT_HEIGHT}`}
      width={PRODUCT_SHOT_WIDTH}
    >
      <g
        fill="none"
        stroke={color}
        strokeWidth={CONTOUR_GROUP.strokeWidth}
        transform={`scale(${PRODUCT_SHOT_WIDTH / CONTOUR_GROUP.frameWidth}) translate(${CONTOUR_GROUP.x} ${CONTOUR_GROUP.y})`}
      >
        {CONTOUR_PATHS.map((d) => (
          <path
            d={d}
            key={d}
          />
        ))}
      </g>
    </svg>
  )
}

export function ProductShot({
  scenario: scenarioId,
  step = 0,
  fidelity,
  theme = 'dark',
  animate = false,
  interval = 4000,
  width = PRODUCT_SHOT_WIDTH,
  className,
}: ProductShotProps) {
  const scenario: ProductShotScenario = productShotScenarios[scenarioId]
  const [tick, setTick] = useState(0)
  const styledTheme = theme === 'dark' ? styledThemeDark : styledThemeLight
  const tokens = shotTokens(styledTheme)

  useEffect(() => {
    if (
      !animate ||
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
      return
    const timer = globalThis.setInterval(
      () => setTick((value) => value + 1),
      interval
    )

    return () => globalThis.clearInterval(timer)
  }, [animate, interval])

  const activeStep = (step + (animate ? tick : 0)) % scenario.steps.length
  const current = scenario.steps[activeStep]
  const displayFidelity = fidelity ?? current.fidelity
  const scale = width / PRODUCT_SHOT_WIDTH
  const ActiveNav = navIcons[scenario.nav]

  return (
    <ThemeProvider theme={styledTheme}>
      <Frame
        $scale={scale}
        className={className}
      >
        <Stage
          $scale={scale}
          data-fidelity={displayFidelity}
          data-product-shot={`${scenarioId}:${current.id}`}
          data-theme={theme}
        >
          <Contours color={tokens.contour} />
          {displayFidelity !== 'abstract' && (
            <Window aria-hidden="true">
              <div className="topbar">
                <PluralLogoIcon size={28} />
              </div>
              <div className="rail">
                <HomeIcon size={24} />
                <ArrowRightLeftIcon size={24} />
                <StackIcon size={24} />
                <span className="active">
                  <ActiveNav size={26} />
                </span>
              </div>
              <div className="canvas" />
            </Window>
          )}
          {current.cards.map((card, index) => (
            <Card
              $animate={animate}
              $index={index}
              $plain={card.variant === 'plain'}
              key={`${current.id}-${index}`}
              style={{ left: card.x, top: card.y, width: card.width }}
            >
              {card.blocks.map((block, blockIndex) =>
                displayFidelity === 'surface' ? (
                  <ShotBlock
                    block={block}
                    key={blockIndex}
                  />
                ) : (
                  <SkeletonBlock key={blockIndex} />
                )
              )}
            </Card>
          ))}
          {current.cursor && displayFidelity === 'surface' && (
            <Cursor
              $animate={animate}
              aria-hidden="true"
              height="30"
              key={`${current.id}-cursor`}
              style={{ left: current.cursor.x, top: current.cursor.y }}
              viewBox="0 0 20 30"
              width="20"
            >
              <path
                d="M2 2 L2 24 L8 18.5 L12 27.5 L15.5 26 L11.6 17.2 L19 17 Z"
                fill="#FFFFFF"
                stroke="#111216"
                strokeLinejoin="round"
                strokeWidth="1.4"
              />
            </Cursor>
          )}
        </Stage>
      </Frame>
    </ThemeProvider>
  )
}
