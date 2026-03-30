import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        id="loki-logo-gradient"
        x1="11.6469"
        y1="66.8772"
        x2="1.23198"
        y2="-0.802501"
        gradientUnits="userSpaceOnUse"
      >
        <stop
          stopColor={fullColor ? '#FAED1E' : color}
          offset="0"
        />
        <stop
          stopColor={fullColor ? '#F15B2B' : color}
          offset="1"
        />
      </linearGradient>
    </defs>
    <path
      d="M12.0478 54.9248L11.3838 50.4663L6.92529 51.1304L7.68418 55.5889L12.0478 54.9248Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M46.957 42.4032L46.1981 38.0396L26.7515 41.0751L27.3206 45.4388L46.957 42.4032Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M20.395 46.5772L24.8535 45.8183L24.1895 41.4546L19.731 42.1186L20.395 46.5772Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M19.0674 53.7865L18.3085 49.4229L13.9448 50.0869L14.514 54.5454L19.0674 53.7865Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M5.88135 44.2055L6.54539 48.6641L11.0039 48L10.3399 43.5415L5.88135 44.2055Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M27.6997 47.9051L28.4586 52.4585L48.0001 49.4229L47.3361 44.9644L27.6997 47.9051Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M21.5333 53.407L25.8969 52.8378L25.2329 48.2844L20.7744 49.0433L21.5333 53.407Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M12.8062 43.1621L13.565 47.6205L17.9287 46.9566L17.2646 42.498L12.8062 43.1621Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M7.39921 41.4546L1.99207 5.97632L0 6.26089L5.50197 41.7392L7.39921 41.4546Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M9.96032 41.0751L4.07888 2.94067L2.18164 3.32014L8.06308 41.3597L9.96032 41.0751Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M14.3245 40.4111L8.15847 0L6.26123 0.379412L12.4272 40.6008L14.3245 40.4111Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M16.8852 40.0315L11.1935 3.2251L9.39111 3.50967L15.0828 40.2212L16.8852 40.0315Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M21.2491 39.2728L16.2215 6.64038L14.3242 6.92495L19.3519 39.6523L21.2491 39.2728Z"
      fill="url(#loki-logo-gradient)"
    />
    <path
      d="M23.8104 38.8935L18.593 5.02783L16.6958 5.31241L22.0081 39.1781L23.8104 38.8935Z"
      fill="url(#loki-logo-gradient)"
    />
  </svg>
))
