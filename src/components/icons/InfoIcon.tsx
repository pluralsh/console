import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill={color}
      d="m8 16c4.4 0 8-3.6 8-8s-3.6-7.99999962-8-8-7.99999962 3.6-8 8 3.6 8 8 8zm-.8-3.2h1.3v-6.3h-1.3zm1.6-8.9c0-.5-.4-.9-.9-.9s-.9.5-.9 1 .4.9.9.9.9-.5.9-1z"
    />
  </svg>
))
