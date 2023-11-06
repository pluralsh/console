import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 17"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15 7.66604C15 11.7024 12.0133 15.4769 8 16.3933C3.98667 15.4769 1 11.7024 1 7.66604V3.3024L8 0.393311L15 3.3024V7.66604ZM8 14.9388C10.9167 14.2115 13.4444 10.9679 13.4444 7.82604V4.24786L8 1.97877L2.55556 4.24786V7.82604C2.55556 10.9679 5.08333 14.2115 8 14.9388Z" />
  </svg>
))
