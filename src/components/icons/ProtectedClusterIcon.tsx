import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 17"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="m7.320127 5.972455h3.706763"
        strokeWidth=".85"
      />
      <path
        d="m6.797961 9.131525-1.853382-3.210151"
        strokeWidth=".85"
      />
      <path
        d="m9.711701 8.252366-1.853382 3.210151"
        strokeWidth=".85"
      />
    </g>
    <circle
      cx="4.947311"
      cy="5.965047"
      fill={color}
      r="1.357322"
    />
    <circle
      cx="11.052689"
      cy="5.965047"
      fill={color}
      r="1.357322"
    />
    <circle
      cx="8.032134"
      cy="11.234953"
      fill={color}
      r="1.357322"
    />
    <path
      d="m1.75629384 3.47604593c2.58064516-.74486312 4.62365591-1.92765882 6.24370616-2.97604592 1.62005025 1.0483871 3.65591398 2.2311827 6.23655914 2.97604582v3.51808153c0 6.40587265-6.23655914 8.50587265-6.23655914 8.50587265s-.87802153-.29531259-1.97554833-1.00226315c-1.82921088-1.17825063-4.26815832-3.49993947-4.26815832-7.5036095v-1.38163291"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
))
