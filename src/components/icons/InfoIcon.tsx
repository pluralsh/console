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
      d="m7.999995 16.000011c4.40001 0 8.00001-3.6 8.00001-8.0000204 0-4.4-3.6-8.00000085-8.00001-8.00000115-4.4-.0000004-8 3.60000115-8 8.00000115-.000001 4.4000204 3.6 8.0000204 8 8.0000204zm-.8-3.2h1.3v-6.3000204h-1.3zm1.6-8.9000204c0-.5-.4-.9-.9-.9s-.9.5-.9 1 .4.9.9.9.9-.5.9-1z"
    />
  </svg>
))
