import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.2998 15.6V11.4C2.2998 10.6 2.8998 10 3.6998 10H11.6998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M14.2994 9.59998V13.8C14.2994 14.6 13.6994 15.2 12.8994 15.2H4.89941"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8.29941 7.20002C10.1772 7.20002 11.6994 5.67779 11.6994 3.80002C11.6994 1.92226 10.1772 0.400024 8.29941 0.400024C6.42165 0.400024 4.89941 1.92226 4.89941 3.80002C4.89941 5.67779 6.42165 7.20002 8.29941 7.20002Z"
      fill={color}
    />
  </svg>
))

