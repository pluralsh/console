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
      d="M8.10039 10.6L4.90039 7.39998L9.00039 3.19998C9.30039 2.89998 9.80039 2.89998 10.1004 3.19998L13.3004 6.39998L9.20039 10.5C8.90039 10.9 8.40039 10.9 8.10039 10.6Z"
      fill={color}
    />
    <path
      d="M10.1006 0.400024L15.6006 5.90002"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M1.5 6.80005L9.2 14.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M3.90039 12.1L0.400391 15.6"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

