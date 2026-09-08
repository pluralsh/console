import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m2.3 14.5695c-1.4 0-2.2-1.4-1.5-2.6l5.7-9.7c.7-1.1 2.4-1.1 3 0l5.7 9.7c.7 1.1-.2 2.6-1.5 2.6z"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <g fill={color}>
      <path d="m7.3 4.569h1.4v5.3h-1.4z" />
      <path d="m8 10.9695c.552 0 1 .448 1 1s-.448 1-1 1-1-.448-1-1 .448-1 1-1" />
    </g>
  </svg>
))
