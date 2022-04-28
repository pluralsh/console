import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <g clipPath="url(#clip0_519_189)">
      <path
        d="M9.09961 13.5V1.4C9.09961 0.9 9.49961 0.5 9.99961 0.5H15.9996"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M15.4996 2.5V14.6C15.4996 15.1 15.0996 15.5 14.5996 15.5H8.59961"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M12.4004 4.5C12.9527 4.5 13.4004 4.05228 13.4004 3.5C13.4004 2.94772 12.9527 2.5 12.4004 2.5C11.8481 2.5 11.4004 2.94772 11.4004 3.5C11.4004 4.05228 11.8481 4.5 12.4004 4.5Z"
        fill={color}
      />
      <path
        d="M4.99961 9.8C6.04895 9.8 6.89961 8.94934 6.89961 7.9C6.89961 6.85066 6.04895 6 4.99961 6C3.95027 6 3.09961 6.85066 3.09961 7.9C3.09961 8.94934 3.95027 9.8 4.99961 9.8Z"
        fill={color}
      />
      <path
        d="M-1.40039 7.90002H1.59961"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M-2.09961 0.599976L2.30039 5.19998"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M2.30039 10.6L-2.09961 15.2"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_189">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
