import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_519_552)">
      <path
        d="M12.7002 9.09998C14.0809 9.09998 15.2002 7.98069 15.2002 6.59998C15.2002 5.21926 14.0809 4.09998 12.7002 4.09998C11.3195 4.09998 10.2002 5.21926 10.2002 6.59998C10.2002 7.98069 11.3195 9.09998 12.7002 9.09998Z"
        fill={color}
      />
      <path
        d="M8.7002 15.5V12.8C8.7002 12.2 9.2002 11.7 9.8002 11.7H16.0002"
        stroke={color}
        strokeMiterlimit="10"
      />
      <path
        d="M4.89941 5.5C6.28013 5.5 7.39941 4.38071 7.39941 3C7.39941 1.61929 6.28013 0.5 4.89941 0.5C3.5187 0.5 2.39941 1.61929 2.39941 3C2.39941 4.38071 3.5187 5.5 4.89941 5.5Z"
        fill={color}
      />
      <path
        d="M0.799805 11.9V9.19998C0.799805 8.59997 1.2998 8.09998 1.8998 8.09998H8.0998"
        stroke={color}
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <clipPath id="clip0_519_552">
        <rect
          width="16"
          height="16"
          fill={color}
        />
      </clipPath>
    </defs>
  </svg>
))
