import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.25 10.1924L7.27875 9.22115L6.75 9.74994L8.25 11.2499L11.25 8.24994L10.7212 7.72119L8.25 10.1924Z"
      fill={color}
    />
    <path
      d="M6 6.375H3.375V7.125H6V6.375Z"
      fill={color}
    />
    <path
      d="M7.875 4.5H3.375V5.25H7.875V4.5Z"
      fill={color}
    />
    <path
      d="M7.875 2.625H3.375V3.375H7.875V2.625Z"
      fill={color}
    />
    <path
      d="M6 11.25H2.25C1.83637 11.25 1.5 10.9136 1.5 10.5V1.5C1.5 1.08645 1.83637 0.75 2.25 0.75H9C9.41363 0.75 9.75 1.08645 9.75 1.5V7.125H9V1.5H2.25V10.5H6V11.25Z"
      fill={color}
    />
  </svg>
))
