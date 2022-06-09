import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.5 13.5V5.30002C0.5 4.50002 1.1 3.90002 1.9 3.90002H13.2"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.5 3.40015V11.6C15.5 12.4 14.9 13 14.1 13H2.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M11.6 7.20007L8.8 9.20007C8.3 9.50007 7.6 9.50007 7.2 9.20007L3.5 6.70007"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
