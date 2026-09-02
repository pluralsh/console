import createIcon from './createIcon'

const ALERTOPS_ORANGE = '#FF9900'
const ALERTOPS_WHITE = '#FFFFFF'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="278.8 14.1 67.5 61.3"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M330.2,14.1h-35.3c-8.9,0-16.1,7.2-16.1,16.1v29.1c0,8.9,7.2,16.1,16.1,16.1h35.3c8.9,0,16.1-7.2,16.1-16.1V30.2C346.3,21.3,339.1,14.1,330.2,14.1"
      fill={fullColor ? ALERTOPS_ORANGE : color}
    />
    <path
      d="M333.2,44.7L333.2,44.7c0-1.1,0.9-2,2-2h3.8c1.1,0,2,0.9,2,2v0c0,1.1-0.9,2-2,2h-3.8C334,46.7,333.2,45.8,333.2,44.7z"
      fill={fullColor ? ALERTOPS_WHITE : color}
    />
    <path
      d="M284.3,44.7L284.3,44.7c0-1.1,0.9-2,2-2h3.8c1.1,0,2,0.9,2,2v0c0,1.1-0.9,2-2,2h-3.8C285.2,46.7,284.3,45.8,284.3,44.7z"
      fill={fullColor ? ALERTOPS_WHITE : color}
    />
    <path
      d="M312.3,62.7L312.3,62.7c1.1,0,2,0.9,2,2v3.8c0,1.1-0.9,2-2,2l0,0c-1.1,0-2-0.9-2-2v-3.8C310.3,63.6,311.2,62.7,312.3,62.7z"
      fill={fullColor ? ALERTOPS_WHITE : color}
    />
    <path
      d="M312.3,26.8L312.3,26.8c-1.1,0-2-0.9-2-2V21c0-1.1,0.9-2,2-2l0,0c1.1,0,2,0.9,2,2v3.8C314.2,25.9,313.4,26.8,312.3,26.8z"
      fill={fullColor ? ALERTOPS_WHITE : color}
    />
    <path
      d="M328.2,35.1c0,0.6-0.2,1.1-0.6,1.6l-14.1,16.9c-0.4,0.5-1,0.8-1.5,0.9c-0.7,0.2-1.5,0-2.1-0.6l-10.4-10.4c-0.8-0.8-0.8-2.2,0-3.1L300,40c0.8-0.8,2.2-0.8,3.1,0l8.3,8.3l12.4-14.8c0.9-1.1,2.5-1.2,3.5-0.3C327.9,33.7,328.2,34.4,328.2,35.1z"
      fill={fullColor ? ALERTOPS_WHITE : color}
    />
  </svg>
))
