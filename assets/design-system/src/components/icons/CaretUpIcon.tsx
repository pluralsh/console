import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 5L8.35355 4.64645L8 4.29289L7.64645 4.64645L8 5ZM2.35355 11.3536L8.35355 5.35355L7.64645 4.64645L1.64645 10.6464L2.35355 11.3536ZM7.64645 5.35355L13.6464 11.3536L14.3536 10.6464L8.35355 4.64645L7.64645 5.35355Z"
      fill={color}
    />
  </svg>
))
