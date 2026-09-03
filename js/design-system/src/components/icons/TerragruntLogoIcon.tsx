import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 128 129"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M64.2167 0.878418L119.797 32.8784V96.8784L64.2167 128.878L8.63672 96.8784V32.8784L64.2167 0.878418ZM113.797 36.3329L64.2167 7.78738L14.6367 36.3329V93.4239L64.2167 121.969L113.797 93.4239V36.3329Z"
      fill={fullColor ? '#160C56' : color}
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M64.2167 121.97V93.4241V64.8786L39.4267 50.6059L14.6367 36.3331V64.8786V93.4241L64.2167 121.97Z"
      fill={fullColor ? '#FFFFFF' : color}
    />
    <path
      d="M89.0067 107.697L113.797 93.4241L89.0067 79.1514L64.2167 93.4241V121.97L89.0067 107.697Z"
      fill={fullColor ? '#87E0E1' : color}
    />
    <path
      d="M64.2167 64.8786V93.4241L89.0067 79.1514L64.2167 64.8786Z"
      fill={fullColor ? '#1B46DD' : color}
    />
    <path
      d="M89.0067 50.6059L64.2167 64.8786L89.0067 79.1514L113.797 64.8786L89.0067 50.6059Z"
      fill={fullColor ? '#B068E9' : color}
    />
    <path
      d="M89.0067 22.0604L64.2167 7.7876L39.4267 22.0604L14.6367 36.3331L39.4267 50.6059L64.2167 36.3331L89.0067 50.6059L113.797 36.3331L89.0067 22.0604Z"
      fill={fullColor ? '#F9DB4E' : color}
    />
    <path
      d="M64.2167 64.8786L89.0067 50.6059L64.2167 36.3331L39.4267 50.6059L64.2167 64.8786Z"
      fill={fullColor ? '#E94A5D' : color}
    />
  </svg>
))
