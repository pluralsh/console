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
      d="M2 7.09998V9.29998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M14 7.09998V9.29998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.5 12.7V10C0.5 9.60005 0.8 9.30005 1.2 9.30005H16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.5 12V14.7C15.5 15.1 15.2 15.4 14.8 15.4H0"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M2.1 5.3C0.9 5.3 0 4.4 0 3.2V1C0 0.7 0.2 0.5 0.5 0.5H4.1V3.2C4.1 4.4 3.2 5.3 2.1 5.3Z"
      fill={color}
    />
    <path
      d="M13.8998 5.3C12.7998 5.3 11.7998 4.4 11.7998 3.2V1C11.7998 0.7 11.9998 0.5 12.2998 0.5H15.9998V3.2C15.9998 4.4 15.0998 5.3 13.8998 5.3Z"
      fill={color}
    />
    <path
      d="M8.00039 5.3C6.90039 5.3 5.90039 4.4 5.90039 3.2V1C5.90039 0.7 6.10039 0.5 6.40039 0.5H10.0004V3.2C10.1004 4.4 9.10039 5.3 8.00039 5.3Z"
      fill={color}
    />
  </svg>
))

