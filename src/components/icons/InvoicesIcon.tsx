import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.2996 3V12.1C11.2996 12.5 10.9996 12.9 10.4996 12.9H1.59961"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M13.7996 5.5V14.6C13.7996 15 13.4996 15.4 12.9996 15.4H4.09961"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M2.09961 10.4V1.3C2.09961 0.9 2.39961 0.5 2.89961 0.5H11.7996"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M4.09961 7.40002H9.29961"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M4.09961 9.90002H9.29961"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5.19961 4.89995C5.80712 4.89995 6.29961 4.40746 6.29961 3.79995C6.29961 3.19244 5.80712 2.69995 5.19961 2.69995C4.5921 2.69995 4.09961 3.19244 4.09961 3.79995C4.09961 4.40746 4.5921 4.89995 5.19961 4.89995Z"
      fill={color}
    />
  </svg>
))
