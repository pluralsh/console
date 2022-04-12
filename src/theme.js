import { normalizeColor } from 'grommet/utils'
import { css } from 'styled-components'

const theme = {
  name: 'Pluralsh',
  rounding: 4,
  spacing: 24,
  defaultMode: 'dark',
  global: {
    colors: {
      brand: {
        light: '#0639FF',
        dark: '#0639FF',
      },
      'brand-light': {
        light: '#3A62FF',
        dark: '#3A62FF',
      },
      background: {
        light: '#FFFFFF',
        dark: '#111525',
      },
      'background-back': {
        dark: '#111525',
        light: '#EEEEEE',
      },
      'background-front': {
        dark: '#181B29',
        light: '#FFFFFF',
      },
      'background-contrast': {
        dark: '#222534',
        light: '#11111111',
      },
      text: {
        dark: '#EEEEEE',
        light: '#333333',
      },
      'text-strong': {
        dark: '#FFFFFF',
        light: '#000000',
      },
      'text-weak': {
        dark: '#CCCCCC',
        light: '#444444',
      },
      'text-xweak': {
        dark: '#999999',
        light: '#666666',
      },
      border: {
        dark: '#303340',
        light: '#CCCCCC',
      },
      control: 'brand',
      'active-background': {
        light: 'background-contrast',
        dark: 'background-contrast',
      },
      'active-text': {
        light: 'text-strong',
        dark: 'text-strong',
      },
      'selected-background': {
        light: 'brand',
        dark: 'brand',
      },
      'selected-text': {
        light: 'text-strong',
        dark: 'text-strong',
      },
      'status-critical': {
        light: '#E03E43',
        dark: '#E03E43',
      },
      'status-critical-dark': {
        light: '#E03E4366',
        dark: '#E03E4366',
      },
      'status-warning': {
        light: '#EF931D',
        dark: '#EF931D',
      },
      'status-warning-dark': {
        light: '#EF931D66',
        dark: '#EF931D66',
      },
      'status-ok': {
        light: '#07E5A7',
        dark: '#07E5A7',
      },
      'status-ok-dark': {
        light: '#07E5A766',
        dark: '#07E5A766',
      },
      'status-unknown': {
        light: '#CCCCCC',
        dark: '#CCCCCC',
      },
      'status-disabled': {
        light: '#CCCCCC',
        dark: '#CCCCCC',
      },
      'background-light': {
        dark: '#373A48',
        light: '#ffffff',
      },
      'background-light!': '',
      focus: {
        light: 'brand',
        dark: 'brand',
      },
      'graph-0': {
        light: 'accent-blue',
        dark: 'accent-blue',
      },
      'accent-blue': {
        dark: '#0190C2',
        light: '#0190C2',
      },
      'accent-blue!': '',
      'accent-purple': {
        dark: '#9510A1',
        light: '#9510A1',
      },
      'accent-purple!': '',
      'accent-green': {
        dark: '#058E4B',
        light: '#058E4B',
      },
      'accent-green!': '',
      'graph-1': {
        dark: 'accent-purple',
        light: 'accent-purple',
      },
      'graph-2': {
        dark: 'accent-green',
        light: 'accent-green',
      },
    },
    font: {
      family: '"Inter"',
      size: '16px',
      height: '22px',
      maxWidth: '432px',
      face: "/* cyrillic-ext */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;\n}\n/* cyrillic */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZthjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;\n}\n/* greek-ext */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZNhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+1F00-1FFF;\n}\n/* greek */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZxhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0370-03FF;\n}\n/* vietnamese */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZBhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;\n}\n/* latin-ext */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZFhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;\n}\n/* latin */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff) format('woff');\n  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n}\n\n/* cyrillic-ext */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;\n}\n/* cyrillic */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZthjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;\n}\n/* greek-ext */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZNhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+1F00-1FFF;\n}\n/* greek */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZxhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0370-03FF;\n}\n/* vietnamese */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZBhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;\n}\n/* latin-ext */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZFhjp-Ek-_EeAmM.woff) format('woff');\n  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;\n}\n/* latin */\n@font-face {\n  font-family: 'Inter';\n  font-style: normal;\n  font-weight: 400;\n  src: url(https://fonts.gstatic.com/s/inter/v8/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff) format('woff');\n  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\n}\n",
    },
    active: {
      background: 'active-background',
      color: 'active-text',
    },
    hover: {
      background: 'active-background',
      color: 'active-text',
    },
    selected: {
      background: 'selected-background',
      color: 'selected-text',
    },
    focus: {
      shadow: null,
      border: {
        color: 'border',
      },
    },
    borderSize: {
      xsmall: '1px',
      small: '2px',
      medium: '4px',
      large: '12px',
      xlarge: '24px',
    },
    breakpoints: {
      small: {
        value: 768,
        borderSize: {
          xsmall: '1px',
          small: '2px',
          medium: '4px',
          large: '6px',
          xlarge: '12px',
        },
        edgeSize: {
          none: '0px',
          hair: '1px',
          xxsmall: '2px',
          xsmall: '3px',
          small: '6px',
          medium: '12px',
          large: '24px',
          xlarge: '48px',
        },
        size: {
          xxsmall: '24px',
          xsmall: '48px',
          small: '96px',
          medium: '192px',
          large: '384px',
          xlarge: '768px',
          full: '100%',
        },
      },
      medium: {
        value: 1536,
      },
      large: {},
    },
    edgeSize: {
      none: '0px',
      hair: '1px',
      xxsmall: '3px',
      xsmall: '6px',
      small: '12px',
      medium: '24px',
      large: '48px',
      xlarge: '96px',
      responsiveBreakpoint: 'small',
    },
    input: {
      padding: '12px',
      weight: 600,
      extend: css`
        color: ${({ theme }) => normalizeColor(theme.global.colors['text-weak'], theme)};
        &:focus {
          color: ${({ theme }) => normalizeColor(theme.global.colors['text-strong'], theme)};
        }
      `,
    },
    spacing: '24px',
    // spacing: {
    //   xxsmall: '8px',
    //   xsmall: '12px',
    //   small: '16px',
    //   medium: '24px',
    //   large: '32px',
    //   xlarge: '48px',
    //   xxlarge: '64px',
    // },
    size: {
      xxsmall: '48px',
      xsmall: '96px',
      small: '192px',
      medium: '384px',
      large: '768px',
      xlarge: '1152px',
      xxlarge: '1536px',
      full: '100%',
    },
    control: {
      border: {
        radius: '4px',
      },
    },
    drop: {
      border: {
        radius: '4px',
      },
    },
  },
  chart: {},
  diagram: {
    line: {},
  },
  meter: {},
  tip: {
    content: {
      background: {
        color: 'background',
      },
      elevation: 'none',
      round: false,
    },
  },
  button: {
    padding: {
      vertical: '4px',
      horizontal: '22px',
    },
    default: {
      color: 'text-strong',
      font: {
        weight: 'bold',
      },
      padding: {
        vertical: '8px',
        horizontal: '24px',
      },
      border: {
        width: '0px',
        radius: '4px',
        color: 'transparent',
      },
    },
    primary: {
      background: 'brand',
      color: 'text-strong',
      font: {
        weight: 'bold',
      },
      padding: {
        vertical: '8px',
        horizontal: '24px',
      },
      border: {
        width: '0px',
        radius: '4px',
        color: 'transparent',
      },
    },
    secondary: {
      color: 'text-strong',
      font: {
        weight: 'bold',
      },
      padding: {
        vertical: '8px',
        horizontal: '24px',
      },
      border: {
        width: '2px',
        radius: '4px',
        color: 'border',
      },
    },
    hover: {
      primary: {
        background: 'brand-light',
      },
      secondary: {
        background: 'background-contrast',
      },
    },
  },
  calendar: {
    small: {
      fontSize: '14px',
      lineHeight: 1.375,
      daySize: '27.43px',
    },
    medium: {
      fontSize: '18px',
      lineHeight: 1.45,
      daySize: '54.86px',
    },
    large: {
      fontSize: '30px',
      lineHeight: 1.11,
      daySize: '109.71px',
    },
  },
  checkBox: {
    size: '20px',
    color: 'white',
    toggle: {
      radius: '4px',
      size: '48px',
    },
    check: {
      radius: '4px',
      thickness: '2px',
    },
    hover: {
      border: {
        color: 'brand',
      },
    },
    border: {
      width: '1px',
    },
  },
  clock: {
    analog: {
      hour: {
        width: '8px',
        size: '24px',
      },
      minute: {
        width: '4px',
        size: '12px',
      },
      second: {
        width: '3px',
        size: '9px',
      },
      size: {
        small: '72px',
        medium: '96px',
        large: '144px',
        xlarge: '216px',
        huge: '288px',
      },
    },
    digital: {
      text: {
        xsmall: {
          size: '10px',
          height: 1.5,
        },
        small: {
          size: '14px',
          height: 1.43,
        },
        medium: {
          size: '18px',
          height: 1.375,
        },
        large: {
          size: '22px',
          height: 1.167,
        },
        xlarge: {
          size: '26px',
          height: 1.1875,
        },
        xxlarge: {
          size: '34px',
          height: 1.125,
        },
      },
    },
  },
  heading: {
    level: {
      1: {
        small: {
          size: '34px',
          height: '40px',
          maxWidth: '816px',
        },
        medium: {
          size: '50px',
          height: '56px',
          maxWidth: '1200px',
        },
        large: {
          size: '82px',
          height: '88px',
          maxWidth: '1968px',
        },
        xlarge: {
          size: '114px',
          height: '120px',
          maxWidth: '2736px',
        },
      },
      2: {
        small: {
          size: '30px',
          height: '36px',
          maxWidth: '720px',
        },
        medium: {
          size: '42px',
          height: '48px',
          maxWidth: '1008px',
        },
        large: {
          size: '54px',
          height: '60px',
          maxWidth: '1296px',
        },
        xlarge: {
          size: '66px',
          height: '72px',
          maxWidth: '1584px',
        },
      },
      3: {
        small: {
          size: '26px',
          height: '32px',
          maxWidth: '624px',
        },
        medium: {
          size: '34px',
          height: '40px',
          maxWidth: '816px',
        },
        large: {
          size: '42px',
          height: '48px',
          maxWidth: '1008px',
        },
        xlarge: {
          size: '50px',
          height: '56px',
          maxWidth: '1200px',
        },
      },
      4: {
        small: {
          size: '22px',
          height: '28px',
          maxWidth: '528px',
        },
        medium: {
          size: '26px',
          height: '32px',
          maxWidth: '624px',
        },
        large: {
          size: '30px',
          height: '36px',
          maxWidth: '720px',
        },
        xlarge: {
          size: '34px',
          height: '40px',
          maxWidth: '816px',
        },
      },
      5: {
        small: {
          size: '16px',
          height: '22px',
          maxWidth: '384px',
        },
        medium: {
          size: '16px',
          height: '22px',
          maxWidth: '384px',
        },
        large: {
          size: '16px',
          height: '22px',
          maxWidth: '384px',
        },
        xlarge: {
          size: '16px',
          height: '22px',
          maxWidth: '384px',
        },
      },
      6: {
        small: {
          size: '14px',
          height: '20px',
          maxWidth: '336px',
        },
        medium: {
          size: '14px',
          height: '20px',
          maxWidth: '336px',
        },
        large: {
          size: '14px',
          height: '20px',
          maxWidth: '336px',
        },
        xlarge: {
          size: '14px',
          height: '20px',
          maxWidth: '336px',
        },
      },
    },
    font: {
      family: '"Inter"',
    },
  },
  paragraph: {
    small: {
      size: '14px',
      height: '20px',
      maxWidth: '384px',
    },
    medium: {
      size: '16px',
      height: '22px',
      maxWidth: '432px',
    },
    large: {
      size: '22px',
      height: '28px',
      maxWidth: '528px',
    },
    xlarge: {
      size: '26px',
      height: '32px',
      maxWidth: '624px',
    },
    xxlarge: {
      size: '34px',
      height: '40px',
      maxWidth: '816px',
    },
  },
  radioButton: {
    size: '20px',
    // check: {
    //   background: {
    //     color: '#fff',
    //   },
    // },
  },
  text: {
    xsmall: {
      size: '12px',
      height: '18px',
      maxWidth: '336px',
    },
    small: {
      size: '14px',
      height: '20px',
      maxWidth: '384px',
    },
    medium: {
      size: '16px',
      height: '22px',
      maxWidth: '432px',
    },
    large: {
      size: '22px',
      height: '28px',
      maxWidth: '528px',
    },
    xlarge: {
      size: '26px',
      height: '32px',
      maxWidth: '624px',
    },
    xxlarge: {
      size: '34px',
      height: '40px',
      maxWidth: '816px',
    },
  },
  scale: 1,
  formField: {
    border: null,
    content: {
      pad: 'small',
    },
    disabled: {
      background: {
        color: 'status-disabled',
        opacity: 'medium',
      },
    },
    error: {
      color: 'status-critical',
      margin: {
        vertical: 'xsmall',
        horizontal: 'small',
      },
      background: {},
      size: 'xsmall',
    },
    help: {
      color: 'dark-3',
      margin: {
        start: 'small',
      },
    },
    info: {
      color: 'text-xweak',
      margin: {
        vertical: 'xsmall',
        horizontal: 'small',
      },
    },
    label: {
      requiredIndicator: (
        <span
          title="required"
          aria-label="required"
          style={{ marginLeft: 4 }}
        >
          *
        </span>
      ),
      margin: {
        vertical: 'xsmall',
        horizontal: 'none',
      },
    },
    margin: {
      bottom: 'small',
    },
    round: '4px',
  },
}

export default theme
