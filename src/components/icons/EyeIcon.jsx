import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M7.9002 10.1C9.11522 10.1 10.1002 9.11498 10.1002 7.89995C10.1002 6.68492 9.11522 5.69995 7.9002 5.69995C6.68517 5.69995 5.7002 6.68492 5.7002 7.89995C5.7002 9.11498 6.68517 10.1 7.9002 10.1Z"
      fill={color}
    />
    <path
      d="M15.6 7.90002L11.3 11.2C9.3 12.7 6.6 12.7 4.7 11.2L2.5 9.60002"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.399902 8.10005L4.6999 4.80005C6.6999 3.30005 9.3999 3.30005 11.2999 4.80005L13.4999 6.50005"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

