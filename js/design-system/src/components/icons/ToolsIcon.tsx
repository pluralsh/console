import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m12 6.6h-1.7c-.1 0-.2.1-.2.2v7.8c0 .1.1.2.2.2h1.7c.1 0 .2-.1.2-.2v-7.8c.1-.1 0-.2-.2-.2z"
      fill="none"
      stroke={color}
      strokeMiterlimit="10"
      strokeWidth="1.02"
    />
    <path
      d="m11.5.7-.1-.1h-.3s-.1 0-.1.1l-.4 1 .3 1v3.9q0 .1.1.1h.6q.1 0 .1-.1v-3.9l.3-1z"
      fill={color}
    />
    <path
      d="m5.1 1.3v2.2h1.8v-2.2s1.3.4 1.3 2.2c0 0-.1 1.2-1.4 1.8v5.5s1.4.6 1.5 2.1c0 0 .1 1.3-1.2 2v-2.2h-2v2.2s-1.2-.4-1.3-1.9 1.5-2.1 1.5-2.1v-5.6s-1.4-.5-1.5-2c-.1-1.4 1.3-2 1.3-2z"
      fill="none"
      stroke={color}
      strokeMiterlimit="15"
      strokeWidth="1.02"
    />
  </svg>
))
