import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 23 24"
    fill="none"
  >
    <path
      d="M0.500238 3.99963C0.500238 2.06683 2.06708 0.499994 3.99988 0.499994C5.93267 0.499994 7.49951 2.06683 7.49951 3.99963C7.49951 5.93243 5.93267 7.49927 3.99988 7.49927C2.06708 7.49927 0.500238 5.93243 0.500238 3.99963Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M0.500238 19.4073C0.500238 17.4745 2.06708 15.9077 3.99988 15.9077C5.93267 15.9077 7.49951 17.4745 7.49951 19.4073C7.49951 21.3401 5.93267 22.907 3.99988 22.907C2.06708 22.907 0.500238 21.3401 0.500238 19.4073Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M4 7.48969L4 15.9075"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M14.5364 19.4073C14.5364 17.4745 16.1032 15.9077 18.036 15.9077C19.9688 15.9077 21.5356 17.4745 21.5356 19.4073C21.5356 21.3401 19.9688 22.907 18.036 22.907C16.1032 22.907 14.5364 21.3401 14.5364 19.4073Z"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M18.0264 15.9075L18.0264 7.48969L12.5763 2.09558"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M17.271 2.31044L12.5768 2.09581L12.5768 6.30469"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
