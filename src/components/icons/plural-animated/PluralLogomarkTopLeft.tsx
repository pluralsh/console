import { LogomarkProps } from './PluralLogomarkBottomLeft'

export default function PluralLogomarkTopLeft({ color = 'currentColor' }: LogomarkProps): JSX.Element {
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
        <path
          d="M80.24,0v15.26H18.89c-1.75,0-3.17,1.42-3.17,3.17v61.4H0V6.31C0,0,6.72,0,6.72,0H80.24z"
        />
      </g>
    </svg>
  )
}
