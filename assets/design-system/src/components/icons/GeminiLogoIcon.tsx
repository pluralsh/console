import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
  >
    <path
      d="M12 6.012C10.4431 6.10754 8.97496 6.76909 7.87203 7.87203C6.76909 8.97496 6.10754 10.4431 6.012 12H5.988C5.89262 10.4431 5.23112 8.97481 4.12815 7.87185C3.02519 6.76888 1.55691 6.10738 0 6.012L0 5.988C1.55691 5.89262 3.02519 5.23112 4.12815 4.12815C5.23112 3.02519 5.89262 1.55691 5.988 0L6.012 0C6.10754 1.55686 6.76909 3.02504 7.87203 4.12797C8.97496 5.23091 10.4431 5.89246 12 5.988V6.012Z"
      fill={fullColor ? 'url(#gemini-full-color-gradient)' : color}
    />
    <defs>
      <radialGradient
        id="gemini-full-color-gradient"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(12.704 52.024) rotate(18.6832) scale(136.24 1091.37)"
      >
        <stop
          offset="0.067"
          stopColor="#9168C0"
        />
        <stop
          offset="0.343"
          stopColor="#5684D1"
        />
        <stop
          offset="0.672"
          stopColor="#1BA1E3"
        />
      </radialGradient>
    </defs>
  </svg>
))
