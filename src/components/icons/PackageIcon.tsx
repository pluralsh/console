import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M0.5 16V8.7C0.5 8.3 0.8 8 1.2 8H4.7"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M4.2002 6.29998V1.29998C4.2002 0.899976 4.5002 0.599976 4.9002 0.599976H12.3002"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8 2V4.3"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M4.2002 9.5V11.8"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M11.7002 9.5V11.8"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M11.9002 2.5V7.2C11.9002 7.6 11.6002 7.9 11.2002 7.9H6.7002"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8 10V14.7C8 15.1 7.7 15.4 7.3 15.4H2.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M13.9 8H15.5V14.7C15.5 15.1 15.2 15.4 14.8 15.4H10"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
