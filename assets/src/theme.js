import { css } from 'styled-components'

const boxStyle = css`
  outline: none;
`;

export const PLURAL_THEME = {
  'plural-blk': '#000b11',
  'tone-dark': '#01131a',
  'tone-dark-2': '#1a2b31',
  'tone-dark-3': '#2f3b41',
  'tone-medium':'#c9d1d3',
  'tone-light': '#edf1f2',
  'plrl-white': '#fff',
  'key-dark': '#001b8c',
  'key-light': '#0022b2',
  'alt-dark': '#006e96',
  'alt-light': '#0090c4',
  'red-dark': '#ba4348',
  'red-light': '#da4447',
  'green-dark': '#23422b',
  'green-light': '#35844d',
}

export const DEFAULT_COLOR_THEME = {
  brand: 'key-light',
  // action: '#007a5a',
  action: 'key-light',
  actionDark: 'key-dark',
  sidebar: 'backgroundDark',
  sidebarHover: 'tone-dark-3',
  sidebarActive: 'tone-dark-3',
  focus: '#3B1D98',
  tagMedium: 'key-light',
  tagLight: '#624aad',
  progress: '#007bff',
  error: 'red-light',
  success: 'green-light',
  console: '#222222',
  cardDark: '#20222b',
  cardDarkLight: '#363840',
  cardDetail: '#252833',
  cardDetailLight: '#363a4a',
  backgroundColor: '#20222b',
  backgroundDark: 'plural-blk',
  backgroundLight: 'cardDarkLight',
  presence: '#39E500',
  link: '#3366BB',
  good: '#00ac46',
  low: '#fdc500',
  medium: '#fd8c00',
  high: '#dc0000',
  critical: '#780000',
  label: 'light-2',
  'input-border': 'light-5',
  ...PLURAL_THEME
}

export const DEFAULT_THEME = {
  anchor: {
    color: {light: 'link', dark: 'white'},
    hover: {
      textDecoration: 'none',
      extend: 'font-weight: 600'
    },
    fontWeight: 400,
  },
  button: {
    padding: {
      horizontal: '6px',
      vertical: '2px'
    }
  },
  tab: {
    active: {color: 'focus'},
    border: {active: {color: 'focus'}, hover: {color: 'focus'}},
  },
  textArea: {
    extend: { fontWeight: 400 }
  },
  box: {
    extend: boxStyle
  },
  textInput: {
    extend: { fontWeight: 400 }
  },
  calendar: {
    day: {
      extend: {
        borderRadius: '5px',
        fontWeight: 'normal'
      }
    }
  },
  checkBox: {
    size: '20px',
    toggle: {radius: '20px', size: '40px'},
  },
  textField: {
    extend: {
      fontWeight: 400
    }
  },
  select: {
    icons: {color: 'brand'},
    options: {
      text: {size: 'small'}
    }
  },
  drop: {border: { radius: '4px' } },
  global: {
    colors: DEFAULT_COLOR_THEME,
    drop: { border: { radius: '4px' } },
    focus: {shadow: null, border: {color: 'brand'} },
    control: {border: {radius: '2px'}},
    font: {
      family: 'Roboto',
      size: '14px',
      height: '20px',
    },
  },
}