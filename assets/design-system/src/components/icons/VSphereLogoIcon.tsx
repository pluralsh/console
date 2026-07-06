import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => {
  const frame = fullColor ? '#78BE20' : color
  const block = fullColor ? '#FDBD2C' : color
  const cutout = fullColor ? '#FFFFFF' : 'transparent'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="7"
        width="13"
        height="13"
        rx="2.6"
        fill={frame}
      />
      <rect
        x="5.4"
        y="10.4"
        width="9.6"
        height="9.6"
        rx="2"
        fill={cutout}
        stroke={fullColor ? 'none' : color}
        strokeWidth="1.8"
      />
      <rect
        x="9"
        y="3"
        width="13"
        height="13"
        rx="2.6"
        fill={frame}
      />
      <rect
        x="12.4"
        y="6.4"
        width="9.6"
        height="9.6"
        rx="2"
        fill={cutout}
        stroke={fullColor ? 'none' : color}
        strokeWidth="1.8"
      />
      <rect
        x="6.7"
        y="12.7"
        width="5.5"
        height="5.5"
        rx="1.3"
        fill={block}
      />
      <rect
        x="13.8"
        y="7.8"
        width="5.5"
        height="5.5"
        rx="1.3"
        fill={block}
      />
    </svg>
  )
})
