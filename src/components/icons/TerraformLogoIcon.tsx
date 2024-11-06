import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.7065 10.784L15.0799 8.26134V3.20801L10.7065 5.73601V10.784Z"
      fill={fullColor ? '#4040B2' : color}
    />
    <path
      d="M5.85333 3.20832L10.2267 5.73632V10.7843L5.85333 8.25898M1 5.44032L5.37333 7.96565V2.91498L1 0.389648M5.85333 13.8643L10.2267 16.3896V11.339L5.85333 8.81365"
      fill={fullColor ? '#5C4EE5' : color}
    />
  </svg>
))
