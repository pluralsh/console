import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 0.999756V2.99976M8.09998 3.89971L9.54998 2.44971M9 5.99976H11M8.09998 8.09973L9.54998 9.54973M6 8.99976V10.9998M2.44995 9.54973L3.89995 8.09973M1 5.99976H3M2.44995 2.44971L3.89995 3.89971"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
))
