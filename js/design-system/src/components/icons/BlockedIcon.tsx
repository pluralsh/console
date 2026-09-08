import createIcon from './createIcon'

export default createIcon(({ size, color, secondaryColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m6.25 3v6 1 2.5h3.5v-2.5-1-6z"
      fill={secondaryColor || 'transparent'}
    />
    <path
      d="m11.313721 0h-6.627441l-4.68628 4.686279v6.627441l4.686279 4.686279h6.627441l4.686279-4.686279v-6.627441zm-2.563721 11.5h-1.5v-1.500061h1.5zm0-6.75v4.25h-1.5v-5h1.5z"
      fill={color}
    />
  </svg>
))
