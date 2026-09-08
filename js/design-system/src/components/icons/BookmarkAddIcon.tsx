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
      d="M9 1V2H4V13.374L7.5498 11.5801L8 11.3525L8.45215 11.5811L12 13.376V8H13V15L8 12.4736L3 15V2C3 1.73478 3.10543 1.48051 3.29297 1.29297C3.48051 1.10543 3.73478 1 4 1H9ZM13 1V3H15V4H13V6H12V4H10V3H12V1H13Z"
      fill={color}
    />
  </svg>
))
