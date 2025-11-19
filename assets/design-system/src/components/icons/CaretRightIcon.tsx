import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11 8L11.3536 8.35355L11.7071 8L11.3536 7.64645L11 8ZM4.64645 2.35355L10.6464 8.35355L11.3536 7.64645L5.35355 1.64645L4.64645 2.35355ZM10.6464 7.64645L4.64645 13.6464L5.35355 14.3536L11.3536 8.35355L10.6464 7.64645Z"
      fill={color}
    />
  </svg>
))
