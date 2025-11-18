import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
  >
    <path
      d="M2 10.0695C2 10.0695 4.13186 6 9.13186 6C15.6832 6 16.4877 11.7106 23.0725 11.7106C29.0725 11.7106 30 8.06947 30 8.06947"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M2 18.0695C2 18.0695 4.13186 14 9.13186 14C15.6832 14 16.4877 19.7107 23.0725 19.7107C29.0725 19.7107 30 16.0695 30 16.0695"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M2 26.0695C2 26.0695 4.13186 22 9.13186 22C15.6832 22 16.4877 27.7107 23.0725 27.7107C29.0725 27.7107 30 24.0695 30 24.0695"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
))
