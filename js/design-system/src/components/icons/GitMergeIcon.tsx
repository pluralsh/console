import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      fill="none"
      stroke={color}
      strokeMiterlimit="10"
    >
      <circle
        cx="3.5686"
        cy="2.9344"
        r="2.301"
      />
      <path d="m3.5685 15.367c1.271 0 2.301-1.03 2.301-2.301s-1.03-2.302-2.301-2.302-2.301 1.031-2.301 2.302 1.03 2.301 2.301 2.301z" />
      <path d="m5.8697 2.9342h2.798l2.921 5.066-2.798 5.066h-2.921" />
      <path d="m11.589 8h2.676" />
      <path d="m12.9697 6.1103 1.614 1.945-1.516 1.835" />
    </g>
  </svg>
))
