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
      d="M11.5417 1H2.20833C1.47195 1 0.875 1.59695 0.875 2.33333V11.6667C0.875 12.403 1.47195 13 2.20833 13H11.5417C12.278 13 12.875 12.403 12.875 11.6667V2.33333C12.875 1.59695 12.278 1 11.5417 1Z"
      stroke={color}
      strokeWidth="0.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.87492 4.33325H4.87492C4.50673 4.33325 4.20825 4.63173 4.20825 4.99992V8.99992C4.20825 9.36811 4.50673 9.66659 4.87492 9.66659H8.87492C9.24311 9.66659 9.54159 9.36811 9.54159 8.99992V4.99992C9.54159 4.63173 9.24311 4.33325 8.87492 4.33325Z"
      fill={color}
    />
  </svg>
))
