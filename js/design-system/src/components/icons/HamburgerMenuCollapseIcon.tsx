import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 3.19995H9.48172e-06"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M10 12.8H-4.02882e-05"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M7 8L-1.19209e-07 8"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M11 8L10.6464 8.35355L10.2929 8L10.6464 7.64645L11 8ZM15.3536 4.35355L11.3536 8.35355L10.6464 7.64645L14.6464 3.64645L15.3536 4.35355ZM11.3536 7.64645L15.3536 11.6464L14.6464 12.3536L10.6464 8.35355L11.3536 7.64645Z"
      fill={color}
    />
  </svg>
))
