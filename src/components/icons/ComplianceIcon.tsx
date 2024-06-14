import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.56055 8.04125V3.35199C2.56055 2.71425 3.04823 2.22656 3.68597 2.22656"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.4396 6.73047V13.483C13.4396 14.1207 12.952 14.6084 12.3142 14.6084H3.68597C3.04823 14.6084 2.56055 14.1207 2.56055 13.483V10.3318"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.4395 2.22656H12.3152C12.9529 2.22656 13.4406 2.71425 13.4406 3.35199V4.32735"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.31196 2.97741H6.68597C6.04823 2.97741 5.56055 2.48973 5.56055 1.85199C5.56055 1.21425 6.04823 0.726562 6.68597 0.726562H9.31196C9.9497 0.726562 10.4374 1.21425 10.4374 1.85199C10.4374 2.48973 9.9497 2.97741 9.31196 2.97741Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5.56055 8.98117L7.06111 10.4817L10.4374 7.10547"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
))
