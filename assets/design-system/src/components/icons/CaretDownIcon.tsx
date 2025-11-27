import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m8 11-.35355.3536.35355.3535.35355-.3535zm5.6464-6.35355-5.99995 5.99995.7071.7072 6.00005-6.00005zm-5.29285 5.99995-6-5.99995-.7071.7071 6 6.00005z"
      fill={color}
    />
  </svg>
))
