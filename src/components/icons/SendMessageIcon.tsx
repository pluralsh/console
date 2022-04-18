import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_519_586)">
      <path
        d="M14.7002 8.00001H3.10018C2.50018 8.00001 2.00018 8.40001 1.80018 9.00001L0.600182 12.7C0.500182 13 0.800182 13.3 1.10018 13.2L15.3002 8.30001C15.6002 8.20001 15.6002 7.80001 15.3002 7.80001L1.10018 2.80001C0.800182 2.70001 0.500182 3.00001 0.600182 3.30001L1.50018 6.00001"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_586">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))

