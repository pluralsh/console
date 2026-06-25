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
      d="M7 9V14H6V10.707L1.70703 15L1 14.291L5.29297 10H2V9H7ZM15 1.70801L10.707 6H14V7H9V2H10V5.29297L14.2959 1L15 1.70801Z"
      fill={color}
    />
  </svg>
))
