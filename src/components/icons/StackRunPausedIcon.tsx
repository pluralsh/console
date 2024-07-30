import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_5968_142)">
      <path
        d="M7.29903 1.69507H5.91846V8.09155H7.29903V1.69507Z"
        fill={color}
      />
      <path
        d="M10.0815 1.69507H8.70093V8.09155H10.0815V1.69507Z"
        fill={color}
      />
    </g>
    <path
      d="M2 8.39331L7.89923 11.8345C7.9615 11.8709 8.0385 11.8709 8.10077 11.8345L14 8.39331"
      stroke={color}
      strokeLinecap="round"
    />
    <path
      d="M2 11.8933L7.89923 15.3345C7.9615 15.3709 8.0385 15.3709 8.10077 15.3345L14 11.8933"
      stroke={color}
      strokeLinecap="round"
    />
    <defs>
      <clipPath id="clip0_5968_142">
        <rect
          width="7"
          height="7"
          fill={color}
          transform="translate(4.5 1.39331)"
        />
      </clipPath>
    </defs>
  </svg>
))
