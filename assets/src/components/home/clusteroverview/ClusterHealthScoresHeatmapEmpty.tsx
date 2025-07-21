import styled, { useTheme } from 'styled-components'

const PATTERN_HEIGHT = 204

export function EmptyHeatmapSvg({ label }: { label: string }) {
  const { colors } = useTheme()

  return (
    <PatternBackgroundSC>
      <PatternSvgSC
        width="100%"
        height={PATTERN_HEIGHT}
        viewBox={`0 0 588 ${PATTERN_HEIGHT}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="none"
      >
        <g opacity="0.7">
          <rect
            x="17.7775"
            y="-82.9108"
            width="137.333"
            height="137.333"
            transform="rotate(90 17.7775 -82.9108)"
            fill={colors['fill-zero-selected']}
          />
          <rect
            x="17.7775"
            y="55.1336"
            width="137.333"
            height="137.333"
            transform="rotate(90 17.7775 55.1336)"
            fill={colors['fill-zero-hover']}
          />
          <rect
            x="17.7775"
            y="193.178"
            width="137.333"
            height="137.333"
            transform="rotate(90 17.7775 193.178)"
            fill={colors['fill-zero-selected']}
          />
          <rect
            x="155.822"
            y="-82.9108"
            width="137.333"
            height="137.333"
            transform="rotate(90 155.822 -82.9108)"
            fill={colors['fill-one-selected']}
          />
          <rect
            x="155.822"
            y="55.1336"
            width="137.333"
            height="137.333"
            transform="rotate(90 155.822 55.1336)"
            fill={colors['fill-zero-selected']}
          />
          <rect
            x="155.822"
            y="193.178"
            width="137.333"
            height="137.333"
            transform="rotate(90 155.822 193.178)"
            fill={colors['fill-zero-hover']}
          />
          <rect
            x="293.867"
            y="-82.9108"
            width="137.333"
            height="137.333"
            transform="rotate(90 293.867 -82.9108)"
            fill={colors['fill-zero-selected']}
          />
          <rect
            x="293.867"
            y="55.1336"
            width="137.333"
            height="137.333"
            transform="rotate(90 293.867 55.1336)"
            fill={colors['fill-one-selected']}
          />
          <rect
            x="293.867"
            y="193.178"
            width="137.333"
            height="137.333"
            transform="rotate(90 293.867 193.178)"
            fill={colors['fill-zero-selected']}
          />
          <rect
            x="294.578"
            y="330.511"
            width="137.333"
            height="137.333"
            transform="rotate(-90 294.578 330.511)"
            fill={colors['fill-zero']}
          />
          <rect
            x="294.578"
            y="192.466"
            width="137.333"
            height="137.333"
            transform="rotate(-90 294.578 192.466)"
            fill={colors['fill-zero-selected']}
          />
          <rect
            x="294.578"
            y="54.4218"
            width="137.333"
            height="137.333"
            transform="rotate(-90 294.578 54.4218)"
            fill={colors['fill-zero-hover']}
          />
          <rect
            x="432.623"
            y="330.511"
            width="137.333"
            height="137.333"
            transform="rotate(-90 432.623 330.511)"
            fill={colors['fill-zero-selected']}
          />
          <rect
            x="432.623"
            y="192.466"
            width="137.333"
            height="137.333"
            transform="rotate(-90 432.623 192.466)"
            fill={colors['fill-zero-hover']}
          />
          <rect
            x="432.623"
            y="54.4217"
            width="137.333"
            height="137.333"
            transform="rotate(-90 432.623 54.4217)"
            fill={colors['fill-zero-hover']}
          />
          <rect
            x="708"
            y="-82.9108"
            width="137.333"
            height="137.333"
            transform="rotate(90 708 -82.9108)"
            fill={colors['fill-zero-selected']}
          />
          <rect
            x="708"
            y="55.1335"
            width="137.333"
            height="137.333"
            transform="rotate(90 708 55.1335)"
            fill={colors['fill-zero-hover']}
          />
          <rect
            x="708"
            y="193.178"
            width="137.333"
            height="137.333"
            transform="rotate(90 708 193.178)"
            fill={colors['fill-one-selected']}
          />
        </g>
      </PatternSvgSC>
      <CenteredTextSC $textColor={colors['text-xlight']}>
        {label}
      </CenteredTextSC>
    </PatternBackgroundSC>
  )
}

const PatternBackgroundSC = styled.div(({ theme }) => ({
  height: PATTERN_HEIGHT,
  position: 'relative',
  display: 'flex',
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
}))

const PatternSvgSC = styled.svg({
  position: 'absolute',
  zIndex: 0,
  pointerEvents: 'none',
})

const CenteredTextSC = styled.div<{ $textColor: string }>(({ $textColor }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1,
  fontWeight: 600,
  letterSpacing: '0.5px',
  color: $textColor,
  pointerEvents: 'none',
  userSelect: 'none',
}))
