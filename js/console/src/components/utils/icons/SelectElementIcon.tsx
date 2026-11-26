// a dashed element outline with a pointer on it, for picking an element in a page;
// the design system has no such icon
export function SelectElementIcon({
  size = 16,
  color = 'currentColor',
}: {
  size?: number | string
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M6.5 13.5H2.5V2.5H13.5V6.5"
        stroke={color}
        strokeDasharray="2 1.5"
      />
      <path
        d="M8 8L14.5 10.2L11.6 11.6L10.2 14.5L8 8Z"
        fill={color}
        stroke={color}
        strokeLinejoin="round"
      />
    </svg>
  )
}
