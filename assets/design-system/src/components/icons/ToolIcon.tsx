import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m1.942 2.1026 1.673 2.166 1.803-1.397-1.673-2.166s1.593-.535 2.965 1.163c0 0 .8 1.243-.018 2.867l4.097 5.322s1.747-.486 2.996.935c0 0 1.04 1.231.314 2.812l-1.667-2.154-1.926 1.495 1.667 2.154s-1.489.517-2.707-.868c-1.218-1.384-.203-3.187-.203-3.187l-4.116-5.309s-1.796.547-2.916-.825c-1.12-1.371-.289-3.008-.289-3.008z"
      fill="none"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
