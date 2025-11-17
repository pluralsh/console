import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.5 13V1.7C0.5 1 1 0.5 1.6 0.5H10"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M10 11.9V14.3C10 14.9 9.5 15.4 8.9 15.4H0"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5 9V7.6C5 6.7 5.7 6 6.6 6H15"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M11.3999 2.40002L14.9999 6.00002L11.3999 9.60002"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
