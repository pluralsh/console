import { type LogomarkProps } from './PluralLogomarkBottomLeft'

export default function PluralLogomarkTopRight({
  color = 'currentColor',
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
        <path d="M19.97,0v15.26h61.14c1.75,0,3.17,1.42,3.17,3.17v61.4H100V6.31C100,0,93.28,0,93.28,0H19.97z" />
      </g>
    </svg>
  )
}
