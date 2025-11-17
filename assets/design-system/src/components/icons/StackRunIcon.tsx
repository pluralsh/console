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
      d="M14 4.89331L8 8.39331V1.39331L14 4.89331Z"
      fill={color}
      stroke={color}
      strokeLinejoin="round"
    />
    <path
      d="M2 7.78662L7.89923 11.2278C7.9615 11.2642 8.0385 11.2642 8.10077 11.2278L14 7.78662"
      stroke={color}
      strokeLinecap="round"
    />
    <path
      d="M2 11.2866L7.89923 14.7278C7.9615 14.7642 8.0385 14.7642 8.10077 14.7278L14 11.2866"
      stroke={color}
      strokeLinecap="round"
    />
  </svg>
))
