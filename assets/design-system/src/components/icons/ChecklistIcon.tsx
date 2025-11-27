import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.2998 2.09998H15.9998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6.2998 8H15.9998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6.2998 13.9H15.9998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.5 0C0.2 0 0 0.2 0 0.5V4.3H3.8C4.1 4.3 4.3 4.1 4.3 3.8V0H0.5ZM2.1 3.3C1.5 3.3 1 2.8 1 2.1C1 1.5 1.5 1 2.1 1C2.7 1 3.3 1.5 3.3 2.2C3.3 2.8 2.8 3.3 2.1 3.3Z"
      fill={color}
    />
    <path
      d="M0.5 5.90002C0.2 5.90002 0 6.10002 0 6.40002V10.2H3.8C4.1 10.2 4.3 10 4.3 9.70002V5.90002H0.5ZM2.1 9.20002C1.5 9.20002 1 8.60002 1 8.00002C1 7.40002 1.5 6.80002 2.2 6.80002C2.8 6.80002 3.4 7.30002 3.4 8.00002C3.3 8.60002 2.8 9.20002 2.1 9.20002Z"
      fill={color}
    />
    <path
      d="M0.5 11.7C0.2 11.7 0 11.9 0 12.2V16H3.8C4.1 16 4.3 15.8 4.3 15.5V11.7H0.5ZM2.1 15C1.5 15 1 14.5 1 13.9C1 13.3 1.5 12.7 2.2 12.7C2.8 12.7 3.4 13.2 3.4 13.9C3.3 14.5 2.8 15 2.1 15Z"
      fill={color}
    />
  </svg>
))
