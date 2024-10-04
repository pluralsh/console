import createIcon from './createIcon'

export default createIcon(({ size, color = '#E0E3E5', fullColor = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 13 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.7581 7.45972L7.27211 4.8787L10.0523 0L13.0015 0.0133023L8.7581 7.45972ZM6.75997 3.23767L8.22322 0.643344H2.7149C1.38345 0.643344 0.545501 2.07798 1.19959 3.23767H6.75997ZM5.61211 4.52158L2.66285 4.53488L6.90629 11.9813L8.39229 9.40028L5.61211 4.52158Z"
      fill={fullColor ? '#F27405' : color}
    />
  </svg>
))
