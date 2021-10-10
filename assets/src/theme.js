import { css } from 'styled-components'
import { alpha, shadeColor } from './utils/color';

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
  'blue': '#0022b2',
  'blue-light': '#3351f2',
  'blue-light-2': '#e1ebff',
  'blue-dark': '#001b8c',
  'blue-dark-2': '#002068',
  'alt-dark': '#006e96',
  'alt-light': '#0090c4',
  'plrl-red': '#dd2c39',
  'red-dark': '#b52d31',
  'red-dark-2': '#7f0009',
  'red-light': '#ff2756',
  'red-light-2': '#ffd9df',
  'status-warning': 'orange',
  'green': '#008e47',
  'green-dark': '#23422b',
  'green-dark-2': '#004422',
  'green-light': '#00ed76',
  'green-light-2': '#ccffe5',
  'teal': '#00e5a3',
  'teal-dark': '#00b57d',
  'teal-dark-2': '#009362',
  'teal-light': '#00ffb0',
  'teal-light-2': '#ccffee',
  'orange': '#ef9300',
  'orange-dark': '#e88900',
  'orange-dark-2': '#b76800',
  'orange-light': '#ff9d00',
  'orange-light-2': '#ffeacc',
  'purple': '#960ea5',
  'purple-dark': '#830096',
  'purple-dark-2': '#650077',
  'purple-light': '#df00ff',
  'purple-light-2': '#f7ccff'
}

export const DEFAULT_COLOR_THEME = {
  brand: 'key-light',
  // action: '#007a5a',
  cost: 'green-light',
  action: 'key-light',
  card: '#222732',
  cardHover: shadeColor('#222732', -5),
  actionDark: 'key-dark',
  sidebar: 'backgroundDark',
  sidebarHover: 'tone-dark-3',
  sidebarActive: 'tone-dark-3',
  backgroundColor: 'sidebarBackground',
  sidebarBorder: alpha('#363840', .4),
  sidebarBackground: '#0d1215',
  focus: '#3B1D98',
  tagMedium: 'key-light',
  tagLight: '#624aad',
  progress: '#007bff',
  error: 'red',
  success: 'green',
  border: 'card',
  console: '#222222',
  cardDark: '#20222b',
  cardDarkLight: '#363840',
  cardDetail: '#252833',
  cardDetailLight: '#363a4a',
  backgroundDark: 'plural-blk',
  backgroundLight: 'cardDarkLight',
  presence: '#39E500',
  link: '#3366BB',
  good: '#00ac46',
  low: 'orange-light',
  medium: 'orange',
  high: 'red',
  critical: 'red-dark',
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
    weight: 450,
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
      family: 'Monument',
      size: '14px',
      height: '20px',
    },
  },
}