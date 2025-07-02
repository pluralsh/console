import { useTheme } from 'styled-components'

export const EmptyHeatmapSvg = ({ label }: { label: string }) => {
  const { colors } = useTheme()
  return (
    <svg
      width="100%"
      height="232"
      viewBox="0 0 588 248"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_12944_269057)">
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
      </g>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="14px"
        fontStyle="normal"
        fontWeight="600"
        letterSpacing="0.5px"
        fill={colors['text-xlight']}
      >
        {label}
      </text>
      <path
        d="M6 0.691406H582C584.932 0.691406 587.309 3.06834 587.309 6V242C587.309 244.932 584.932 247.309 582 247.309H6C3.06834 247.309 0.691406 244.932 0.691406 242V6C0.691406 3.06834 3.06834 0.691406 6 0.691406Z"
        stroke={colors['border']}
        strokeWidth="1.38353"
      />
      <defs>
        <clipPath id="clip0_12944_269057">
          <path d="M0 5.99999C0 2.68629 2.68629 0 6 0H582C585.314 0 588 2.68629 588 6V242C588 245.314 585.314 248 582 248H6C2.68629 248 0 245.314 0 242V5.99999Z" />
        </clipPath>
      </defs>
    </svg>
  )
}
