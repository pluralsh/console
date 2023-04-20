import { type ComponentPropsWithRef } from 'react'

export type LogomarkProps = ComponentPropsWithRef<'svg'> & {
  color?: string
}

export default function PluralLogomarkBottomLeft({
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
        <path d="M80.24,98.93V83.68H18.89c-1.75,0-3.17-1.42-3.17-3.17V19.52H0v73.1c0,6.31,6.72,6.31,6.72,6.31S80.24,98.93,80.24,98.93z" />
      </g>
    </svg>
  )
}
