import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.5 6L10 2.5L13.5 6"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.5 13.5H7.5C8.88071 13.5 10 12.3807 10 11V2.5"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
))
