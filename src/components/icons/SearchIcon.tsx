import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
  >
    <g>
      <path
        stroke={color}
        d="M11.4,5.9c0-2.9-2.4-5.3-5.3-5.3c-2.9,0-5.3,2.4-5.3,5.3
                c0,2.9,2.4,5.3,5.3,5.3C9,11.2,11.4,8.8,11.4,5.9"
      />
      <path
        fill={color}
        d="M15.9,14.2L14.1,16l-3.4-3.4c-0.2-0.2-0.2-0.5,0-0.6l1.8-1.8l3.4,3.4C16,13.8,16,14,15.9,14.2z"
      />
    </g>
  </svg>
))
