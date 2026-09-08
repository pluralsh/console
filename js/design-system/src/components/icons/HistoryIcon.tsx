import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.9 12C5.1 13.5 6.9 14.5 9 14.5C12.6 14.5 15.5 11.6 15.5 8C15.5 4.4 12.6 1.5 9 1.5C5.4 1.5 2.5 4.4 2.5 8"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5.0999 6.49998L2.4999 8.59998L0.399902 6.09998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M11.3 9.29995L9 7.99995L10.7 4.19995"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
