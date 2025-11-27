import createIcon from './createIcon'
export default createIcon(({ size, color, fullColor }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 365 365"
    >
      <g
        fill={fullColor ? '#0078D7' : color}
        fillRule="evenodd"
      >
        <path d="M273.32 82.016 35.859 125.735v116.408L0 237.278V133.574l35.858-47.19 124.868-48.986L160.26 0zm0 0v193.776l-237.463-32.1 100.325 117.462v-43.595l137.137 43.595 90.033-74.456V65.16z"></path>
      </g>
    </svg>
  )
})
