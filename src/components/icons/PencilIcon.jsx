import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M15.5996 4.09995L12.4996 0.999951C12.0996 0.599951 11.4996 0.599951 11.0996 0.999951L0.899609 11.4L0.599609 15.2L4.39961 14.9L12.9996 6.29995"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M9.09961 3.09998L10.8996 4.99998"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
  </svg>
))

