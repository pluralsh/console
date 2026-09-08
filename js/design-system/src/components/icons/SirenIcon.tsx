import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.59961 15.5H13.3996"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M2.09961 1.3999L4.19961 4.2999"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M13.8998 1.3999L11.7998 4.2999"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8 0.199951V3.89995"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M10.1994 6.29993H5.79941C4.69941 6.29993 3.89941 7.19993 3.89941 8.19993V12.9999H12.1994V8.19993C12.1994 7.19993 11.2994 6.29993 10.1994 6.29993ZM7.99941 11.4999C7.09941 11.4999 6.39941 10.7999 6.39941 9.89993C6.39941 8.99993 7.09941 8.29993 7.99941 8.29993C8.89941 8.29993 9.59941 9.09993 9.59941 9.99993C9.59941 10.7999 8.89941 11.4999 7.99941 11.4999Z"
      fill={color}
    />
  </svg>
))
