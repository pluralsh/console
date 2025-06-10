import { type CSSProperties } from 'styled-components'

import { blue, green, grey, purple, red, yellow } from './colors-base'
import { colorsCloudShellLight } from './colors-cloudshell-light'
import { colorsCodeBlockLight } from './colors-codeblock-light'
import { semanticColorsDark } from './colors-semantic-dark'

export const semanticColorsLight = {
  // Fill
  //
  // fill-zero
  'fill-zero': '#FFFFFF',
  'fill-zero-hover': grey[50],
  'fill-zero-selected': grey[25],
  // fill-one
  'fill-one': grey[25],
  'fill-one-hover': grey[75],
  'fill-one-selected': grey[50],
  // fill-two
  'fill-two': grey[50],
  'fill-two-hover': grey[100],
  'fill-two-selected': grey[75],
  // fill-three
  'fill-three': grey[75],
  'fill-three-hover': grey[125],
  'fill-three-selected': grey[100],
  // primary
  'fill-primary': purple[400],
  'fill-primary-hover': purple[350],

  // Action
  //
  // primary
  'action-primary': purple[350],
  'action-primary-hover': purple[300],
  'action-primary-disabled': grey[100],
  // link
  'action-link-inactive': grey[300],
  'action-link-inactive-hover': grey[350],
  'action-link-inactive-disabled': grey[100],
  'action-link-active': grey[50],
  'action-link-active-hover': grey[50],
  'action-link-active-disabled': grey[200],
  // link-inline
  'action-link-inline': blue[700],
  'action-link-inline-hover': blue[600],
  'action-link-inline-visited': purple[500],
  'action-link-inline-visited-hover': purple[350],
  // input
  'action-input-hover': '#C3C3C419',
  // always white
  'action-always-white': semanticColorsDark['action-always-white'],
  'action-on-filled-bg': grey[25],

  // Border
  //
  border: grey[75],
  'border-fill-two': grey[100],
  'border-fill-three': grey[125],
  'border-selected': grey[800],
  'border-input': grey[100],
  'border-disabled': grey[75],
  'border-primary': purple[500],
  'border-secondary': blue[700],
  'border-info': blue[600],
  'border-success': green[700],
  'border-warning': yellow[700],
  'border-danger': red[600],
  'border-danger-light': red[600],
  'border-outline-focused': blue[500],

  // Text
  //
  text: grey[800],
  'text-light': grey[600],
  'text-xlight': grey[500],
  'text-long-form': grey[700],
  'text-disabled': grey[200],
  'text-input-disabled': grey[400],
  'text-primary-accent': blue[600],
  'text-primary-disabled': grey[500],
  'text-success': green[800],
  'text-success-light': green[700],
  'text-warning': yellow[800],
  'text-warning-light': yellow[700],
  'text-danger': red[700],
  'text-danger-light': red[600],
  'text-always-white': semanticColorsDark['text-always-white'],
  'text-on-filled-bg': grey[950],

  // Icon
  //
  'icon-default': grey[900],
  'icon-light': grey[700],
  'icon-xlight': grey[400],
  'icon-disabled': grey[100],
  'icon-primary': purple[300],
  'icon-secondary': blue[400],
  'icon-info': blue[350],
  'icon-success': green[700],
  'icon-warning': yellow[600],
  'icon-danger': red[300],
  'icon-danger-critical': '#ED4578',
  'icon-always-white': semanticColorsDark['icon-always-white'],

  // Graph
  //
  'graph-blue': blue[500],
  'graph-lilac': '#BE5EEB',
  'graph-green': green[500],
  'graph-purple': purple[350],
  'graph-red': red[400],

  // Marketing
  //
  'marketing-white': '#000000',
  'marketing-black': '#FFFFFF',

  // Shadows
  //
  'shadow-default': grey[950],
  'shadow-purple': purple[400],

  // Code-blocks
  //
  ...colorsCodeBlockLight,

  // Cloud shell
  //
  ...colorsCloudShellLight,

  // Semantic
  semanticDefault: '#0E1015',
  semanticBlue: '#539AC3',
  semanticGreen: '#0F996A',
  semanticYellow: '#C3B853',
  semanticRedLight: '#F599A8',
  semanticRedDark: '#E95374',
} as const satisfies Record<
  keyof typeof semanticColorsDark,
  CSSProperties['color']
>
