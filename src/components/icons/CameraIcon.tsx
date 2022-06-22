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
      d="M0.5 15.6445V5.42226C0.5 4.88892 1 4.35559 1.7 4.35559H13.5"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M15.5 3.91113V14.1334C15.5 14.6667 15 15.2 14.3 15.2H2.5"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M10 9.5C10 10.6046 9.10457 11.5 8 11.5C6.89543 11.5 6 10.6046 6 9.5C6 8.39543 6.89543 7.5 8 7.5C9.10457 7.5 10 8.39543 10 9.5Z"
      stroke={color}
    />
    <path
      d="M4.5 1.21262C4.5 1.05547 4.52632 0.949092 4.55209 0.888889H11.4479C11.4737 0.949092 11.5 1.05547 11.5 1.21262V3.20988H12.5V1.21262C12.5 0.939444 12.4487 0.670625 12.3224 0.452427C12.1952 0.232489 11.944 0 11.5556 0H4.44444C4.05596 0 3.80483 0.232489 3.67758 0.452427C3.55133 0.670625 3.5 0.939444 3.5 1.21262V3.20988H4.5V1.21262Z"
      fill={color}
    />
  </svg>

))
