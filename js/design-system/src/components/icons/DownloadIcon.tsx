import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.3996 5.6001L7.99961 10.0001L3.59961 5.6001"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8 0.800049V10"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M3 14.7H14C14.8 14.7 15.5 14 15.5 13.2V10"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.5 10V15.2"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
