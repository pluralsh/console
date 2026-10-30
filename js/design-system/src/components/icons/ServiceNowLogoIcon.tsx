import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.05 1.70001C7.4 1.70001 0.15 8.80001 0 17.6C0 22.25 1.95 26.4 5.05 29.4C6.2 30.45 7.9 30.55 9.2 29.65C11 28.2 13.35 27.45 16.05 27.45C18.75 27.45 21.1 28.35 22.9 29.65C24.2 30.55 25.9 30.55 27.05 29.4C30.15 26.4 31.95 22.4 31.95 17.75C31.8 8.80001 24.8 1.70001 16 1.70001M15.95 25.65C11.15 25.65 7.9 22 7.9 17.6C7.9 13.2 11.15 9.55001 15.95 9.55001C20.75 9.55001 24 13.2 24 17.6C24 22 20.75 25.65 15.95 25.65Z"
      fill={fullColor ? '#62D84E' : color}
    />
  </svg>
))
