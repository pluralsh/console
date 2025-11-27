import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13.0841 15.5866H2.90976C2.54323 15.5866 2.25253 15.2896 2.25253 14.9294V1.08338C2.25253 0.716845 2.54955 0.426147 2.90976 0.426147H9.74745C9.93703 0.426147 10.114 0.5083 10.2404 0.647329L13.5771 4.41375C13.6845 4.53382 13.7414 4.6918 13.7414 4.84979V14.9294C13.7414 15.2959 13.4443 15.5866 13.0841 15.5866V15.5866Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5 12H11"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.99707 6H7.99707M10.9971 6H7.99707M7.99707 6V3M7.99707 6V9"
      stroke={color}
    />
  </svg>
))
