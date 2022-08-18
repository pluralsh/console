import { PluralLogoProps } from './PluralLogoFull'

export default function PluralLogoMark({ width, height, color = 'currentColor' }: PluralLogoProps): JSX.Element {
  if (!width && !height) {
    width = 64
    height = 65
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 65"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M31.8223 44.6551C38.469 44.6551 43.8573 39.2668 43.8573 32.62C43.8573 25.9732 38.469 20.5849 31.8223 20.5849C25.1755 20.5849 19.7873 25.9732 19.7873 32.62C19.7873 39.2668 25.1755 44.6551 31.8223 44.6551Z"
      />
      <path
        d="M20.0558 64.6189V54.7488H51.9101C53.0289 54.7488 53.9372 53.8308 53.9372 52.7V0.621094H64.0001V60.5385C64.0001 64.6211 59.6971 64.6211 59.6971 64.6211H20.0558V64.6189Z"
      />
      <path
        d="M43.9422 0.621094V10.4912H12.09C10.9712 10.4912 10.0629 11.4092 10.0629 12.5401V64.6189H0V4.70373C0 0.621093 4.30297 0.621094 4.30297 0.621094H43.9422Z"
      />
    </svg>
  )
}
