import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_19456_11811)">
      <path
        d="M22 25C23.1046 25 24 24.1046 24 23C24 21.8954 23.1046 21 22 21C20.8954 21 20 21.8954 20 23C20 24.1046 20.8954 25 22 25Z"
        fill={color}
      />
      <path
        d="M29.7769 22.4785C28.5138 19.2612 25.4548 17.1062 22 17C18.5452 17.1062 15.4862 19.2612 14.2231 22.4785L14 23L14.2231 23.5215C15.4862 26.7388 18.5452 28.8938 22 29C25.4548 28.8938 28.5138 26.7388 29.7769 23.5215L30 23L29.7769 22.4785ZM22 27C19.7909 27 18 25.2091 18 23C18 20.7909 19.7909 19 22 19C24.2091 19 26 20.7909 26 23C25.9975 25.2081 24.2081 26.9975 22 27Z"
        fill={color}
      />
      <path
        d="M12 28H6C4.8972 28 4 27.1028 4 26V6C4 4.8972 4.8972 4 6 4H26C27.1028 4 28 4.8972 28 6V16H26V6H6V26H12V28Z"
        fill={color}
      />
    </g>
    <defs>
      <clipPath id="clip0_19456_11811">
        <rect
          width="32"
          height="32"
          fill="white"
        />
      </clipPath>
    </defs>
  </svg>
))
