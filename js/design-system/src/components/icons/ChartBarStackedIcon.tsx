import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1 13V11.5H12V7.5H1V5.5H8V1.5H1V0H0V13C0 13.2652 0.105357 13.5196 0.292893 13.7071C0.48043 13.8946 0.734784 14 1 14H14V13H1ZM11 10.5H6V8.5H11V10.5ZM7 4.5H4V2.5H7V4.5Z"
      fill={color}
    />
  </svg>
))
