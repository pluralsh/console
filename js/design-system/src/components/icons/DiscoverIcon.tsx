import createIcon from './createIcon'

export default createIcon(({ size, color }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 8.5H3V9.5H7V8.5Z"
        fill={color}
      />
      <path
        d="M1.5 9.5C1.77614 9.5 2 9.27614 2 9C2 8.72386 1.77614 8.5 1.5 8.5C1.22386 8.5 1 8.72386 1 9C1 9.27614 1.22386 9.5 1.5 9.5Z"
        fill={color}
      />
      <path
        d="M6.5 7.5C6.77614 7.5 7 7.27614 7 7C7 6.72386 6.77614 6.5 6.5 6.5C6.22386 6.5 6 6.72386 6 7C6 7.27614 6.22386 7.5 6.5 7.5Z"
        fill={color}
      />
      <path
        d="M5 6.5H1V7.5H5V6.5Z"
        fill={color}
      />
      <path
        d="M7 4.5H3V5.5H7V4.5Z"
        fill={color}
      />
      <path
        d="M1.5 5.5C1.77614 5.5 2 5.27614 2 5C2 4.72386 1.77614 4.5 1.5 4.5C1.22386 4.5 1 4.72386 1 5C1 5.27614 1.22386 5.5 1.5 5.5Z"
        fill={color}
      />
      <path
        d="M15 14.3L11.3 10.6C12.05 9.6 12.5 8.35 12.5 7C12.5 3.7 9.8 1 6.5 1C4.85 1 3.3 1.65 2.15 2.9L2.9 3.6C3.8 2.55 5.1 2 6.5 2C9.25 2 11.5 4.25 11.5 7C11.5 9.75 9.25 12 6.5 12C5 12 3.6 11.35 2.65 10.2L1.9 10.85C3 12.2 4.7 13 6.5 13C8.1 13 9.55 12.35 10.65 11.35L14.3 15L15 14.3Z"
        fill={color}
      />
    </svg>
  )
})
