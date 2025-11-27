import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 10.1429L2 5.57143L10 1L18 5.57143L10 10.1429Z"
      stroke={color}
    />
    <path
      d="M2 10.1428L9.90077 14.6575C9.96226 14.6927 10.0377 14.6927 10.0992 14.6575L18 10.1428"
      stroke={color}
      strokeLinecap="round"
    />
    <path
      d="M2 14.7144L9.90077 19.2291C9.96226 19.2642 10.0377 19.2642 10.0992 19.2291L18 14.7144"
      stroke={color}
      strokeLinecap="round"
    />
  </svg>
))
