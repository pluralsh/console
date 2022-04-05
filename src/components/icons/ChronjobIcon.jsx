import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_519_168)">
      <path
        d="M9.6 6.60005L8 5.70005L9.3 2.80005"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M7.9998 10.9C10.8717 10.9 13.1998 8.57188 13.1998 5.7C13.1998 2.82812 10.8717 0.5 7.9998 0.5C5.12792 0.5 2.7998 2.82812 2.7998 5.7C2.7998 8.57188 5.12792 10.9 7.9998 10.9Z"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M3.4 16C4.1732 16 4.8 15.3732 4.8 14.6C4.8 13.8268 4.1732 13.2 3.4 13.2C2.6268 13.2 2 13.8268 2 14.6C2 15.3732 2.6268 16 3.4 16Z"
        fill={color}
      />
      <path
        d="M7.99961 16C8.77281 16 9.39961 15.3732 9.39961 14.6C9.39961 13.8268 8.77281 13.2 7.99961 13.2C7.22641 13.2 6.59961 13.8268 6.59961 14.6C6.59961 15.3732 7.22641 16 7.99961 16Z"
        fill={color}
      />
      <path
        d="M12.6002 16C13.3734 16 14.0002 15.3732 14.0002 14.6C14.0002 13.8268 13.3734 13.2 12.6002 13.2C11.827 13.2 11.2002 13.8268 11.2002 14.6C11.2002 15.3732 11.827 16 12.6002 16Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_519_168">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))

