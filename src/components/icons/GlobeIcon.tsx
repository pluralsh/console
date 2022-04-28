import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M8 15.5C12.1421 15.5 15.5 12.1421 15.5 8C15.5 3.85786 12.1421 0.5 8 0.5C3.85786 0.5 0.5 3.85786 0.5 8C0.5 12.1421 3.85786 15.5 8 15.5Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8.0002 15.5C10.0989 15.5 11.8002 12.1421 11.8002 8C11.8002 3.85786 10.0989 0.5 8.0002 0.5C5.90151 0.5 4.2002 3.85786 4.2002 8C4.2002 12.1421 5.90151 15.5 8.0002 15.5Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.5 8H15.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M1.5 4.19995H14.3"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M1.5 11.8H14.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8 0.5V15.5"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
