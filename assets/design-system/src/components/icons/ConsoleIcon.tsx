import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 56 82"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M43.2454 0V12.5951H2.59959C1.17179 12.5951 0 13.7665 0 15.2095V81.6664H12.7646V69.0713H53.4133C54.8411 69.0713 56 67.8999 56 66.4569V0H43.2454ZM43.137 40.8332C43.137 49.3151 36.2612 56.1909 27.7795 56.1909C19.2977 56.1909 12.4219 49.3151 12.4219 40.8332C12.4219 32.3514 19.2977 25.4755 27.7795 25.4755C36.2612 25.4755 43.137 32.3514 43.137 40.8332Z"
      fill={color}
    />
  </svg>
))
