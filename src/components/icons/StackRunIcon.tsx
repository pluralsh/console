import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14 4.5L8 8V1L14 4.5Z"
      fill={color}
      stroke={color}
      strokeLinejoin="round"
    />
    <path
      d="M2 8L7.89923 11.4412C7.9615 11.4775 8.0385 11.4775 8.10077 11.4412L14 8"
      stroke={color}
      strokeLinecap="round"
    />
    <path
      d="M2 11.5L7.89923 14.9412C7.9615 14.9775 8.0385 14.9775 8.10077 14.9412L14 11.5"
      stroke={color}
      strokeLinecap="round"
    />
  </svg>
))
