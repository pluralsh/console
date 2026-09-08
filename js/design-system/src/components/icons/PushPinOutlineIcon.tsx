import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.74684 3.55414L12.5933 6.40059L8.84684 10.147L8.82171 10.1722L8.80039 10.2006C8.7347 10.2882 8.66725 10.3111 8.6192 10.3141C8.5657 10.3174 8.50488 10.298 8.45394 10.247L5.60326 7.39635L9.35551 3.55258C9.46051 3.4494 9.64262 3.44992 9.74684 3.55414Z"
      stroke={color}
    />
    <path
      d="M10.1006 0.400391L15.6006 5.90039"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M1.5 6.80078L9.2 14.5008"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M3.90039 12.1006L0.400391 15.6006"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
