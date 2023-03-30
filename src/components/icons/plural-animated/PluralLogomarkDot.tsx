import { LogomarkProps } from './PluralLogomarkBottomLeft'

export default function PluralLogomarkDot({
  color = 'black',
}: LogomarkProps): JSX.Element {
  return (
    <svg
      width={100}
      height={100}
      x={0}
      y={0}
      viewBox="0 0 100 100"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <circle
          cx="50"
          cy="49.47"
          r="18.61"
        />
      </g>
    </svg>
  )
}
