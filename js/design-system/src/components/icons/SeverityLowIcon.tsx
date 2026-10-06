import createIcon from './createIcon'

// 1 of 3 bars filled with `color`, the rest with `secondaryColor`.
export default createIcon(({ size, color, secondaryColor = '#383D47' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2 9.5C2 9.22386 2.22386 9 2.5 9H4.5C4.77614 9 5 9.22386 5 9.5V13.5C5 13.7761 4.77614 14 4.5 14H2.5C2.22386 14 2 13.7761 2 13.5V9.5Z"
      fill={color}
    />
    <path
      d="M6.5 6.5C6.5 6.22386 6.72386 6 7 6H9C9.27614 6 9.5 6.22386 9.5 6.5V13.5C9.5 13.7761 9.27614 14 9 14H7C6.72386 14 6.5 13.7761 6.5 13.5V6.5Z"
      fill={secondaryColor}
    />
    <path
      d="M11 3.5C11 3.22386 11.2239 3 11.5 3H13.5C13.7761 3 14 3.22386 14 3.5V13.5C14 13.7761 13.7761 14 13.5 14H11.5C11.2239 14 11 13.7761 11 13.5V3.5Z"
      fill={secondaryColor}
    />
  </svg>
))
