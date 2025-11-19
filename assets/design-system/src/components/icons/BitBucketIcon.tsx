import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 17 16"
    version="1.1"
  >
    <defs>
      <linearGradient
        id="linear0"
        gradientUnits="userSpaceOnUse"
        x1="1.086334"
        y1="0.13818"
        x2="0.469266"
        y2="0.787761"
        gradientTransform="matrix(13.679688,0,0,10.578125,2.5625,5.351562)"
      >
        <stop
          offset="0.18"
          style={{ stopColor: 'black', stopOpacity: 0.25 }}
        />
        <stop
          offset="1"
          style={{
            stopColor: color,
            stopOpacity: 1,
          }}
        />
      </linearGradient>
    </defs>
    <g id="surface1">
      <path
        style={{
          stroke: 'none',
          fillRule: 'nonzero',
          fill: color,
          fillOpacity: 1,
        }}
        d="M 0.550781 0 C 0.390625 -0.00390625 0.238281 0.0703125 0.132812 0.195312 C 0.0273438 0.324219 -0.0195312 0.492188 0.0078125 0.660156 L 2.320312 15.300781 C 2.378906 15.667969 2.683594 15.941406 3.042969 15.945312 L 14.136719 15.945312 C 14.40625 15.949219 14.636719 15.746094 14.679688 15.46875 L 16.992188 0.660156 C 17.019531 0.496094 16.972656 0.328125 16.867188 0.199219 C 16.761719 0.0742188 16.609375 0 16.449219 0.00390625 Z M 10.289062 10.582031 L 6.746094 10.582031 L 5.789062 5.359375 L 11.144531 5.359375 Z M 10.289062 10.582031 "
      />
      <path
        style={{ stroke: 'none', fillRule: 'nonzero', fill: 'url(#linear0)' }}
        d="M 16.242188 5.351562 L 11.136719 5.351562 L 10.277344 10.570312 L 6.742188 10.570312 L 2.5625 15.742188 C 2.695312 15.859375 2.863281 15.925781 3.039062 15.929688 L 14.125 15.929688 C 14.394531 15.933594 14.628906 15.730469 14.671875 15.453125 Z M 16.242188 5.351562 "
      />
    </g>
  </svg>
))
