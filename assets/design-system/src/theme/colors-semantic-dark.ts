import { type CSSProperties } from 'styled-components'

import { blue, green, grey, purple, red, yellow } from './colors-base'
import { colorsCloudShellDark } from './colors-cloudshell-dark'
import { colorsCodeBlockDark } from './colors-codeblock-dark'

export const semanticColorsDark = {
  // Fill
  //
  // fill-zero
  'fill-zero': grey[900],
  'fill-zero-hover': grey[850],
  'fill-zero-selected': grey[875],
  // fill-one
  'fill-one': grey[850],
  'fill-one-hover': grey[800],
  'fill-one-selected': grey[825],
  // fill-two
  'fill-two': grey[800],
  'fill-two-hover': grey[750],
  'fill-two-selected': grey[775],
  // fill-three
  'fill-three': grey[750],
  'fill-three-hover': grey[700],
  'fill-three-selected': grey[725],
  // primary
  'fill-primary': purple[400],
  'fill-primary-hover': purple[350],
  // accent- used sparingly
  'fill-accent': grey[950],

  // Action
  //
  // primary
  'action-primary': purple[400],
  'action-primary-hover': purple[350],
  'action-primary-disabled': grey[825],
  // link
  'action-link-inactive': grey[200],
  'action-link-inactive-hover': grey[100],
  'action-link-inactive-disabled': grey[700],
  'action-link-active': grey[50],
  'action-link-active-hover': grey[50],
  'action-link-active-disabled': grey[675],
  // link-inline
  'action-link-inline': blue[200],
  'action-link-inline-hover': blue[100],
  'action-link-inline-visited': purple[300],
  'action-link-inline-visited-hover': purple[200],
  // input
  'action-input-hover': '#E9ECF00A',
  // always-white
  'action-always-white': grey[50],
  'action-on-filled-bg': grey[25],

  // Border
  //
  border: grey[800],
  'border-fill-one': grey[775],
  'border-fill-two': grey[725],
  'border-fill-three': grey[700],
  'border-selected': grey[100],
  'border-input': grey[700],
  'border-disabled': grey[700],
  'border-primary': purple[300],
  'border-secondary': blue[400],
  'border-info': blue[300],
  'border-success': green[300],
  'border-warning': yellow[200],
  'border-danger': red[300],
  'border-danger-light': red[200],
  'border-outline-focused': blue[300],

  // Text
  //
  text: grey[50],
  'text-light': grey[200],
  'text-xlight': grey[400],
  'text-long-form': grey[300],
  'text-disabled': grey[700],
  'text-input-disabled': grey[500],
  'text-primary-accent': blue[200],
  'text-primary-disabled': grey[500],
  'text-success': green[500],
  'text-success-light': green[200],
  'text-warning': yellow[400],
  'text-warning-light': yellow[100],
  'text-danger': red[400],
  'text-danger-light': red[200],
  'text-always-white': grey[50],
  'text-on-filled-bg': grey[50],

  // Icon
  //
  'icon-default': grey[100],
  'icon-light': grey[200],
  'icon-xlight': grey[400],
  'icon-disabled': grey[700],
  'icon-primary': purple[300],
  'icon-secondary': blue[400],
  'icon-info': blue[200],
  'icon-success': green[200],
  'icon-warning': yellow[100],
  'icon-danger': red[200],
  'icon-danger-critical': red[400],
  'icon-always-white': grey[100],

  // Graph
  //
  'graph-blue': blue[200],
  'graph-lilac': '#D596F4',
  'graph-green': green[200],
  'graph-purple': purple[200],
  'graph-red': red[200],

  // Marketing
  //
  'marketing-white': '#FFFFFF',
  'marketing-black': '#000000',

  // Shadows
  //
  'shadow-default': grey[950],
  // Shouldn't actually be used in dark mode
  'shadow-purple': purple[400],

  // Code blocks
  //
  ...colorsCodeBlockDark,

  // Cloud shell
  //
  ...colorsCloudShellDark,

  // Semantic
  semanticDefault: '#EBEFF0',
  semanticBlue: '#99DAFF',
  semanticGreen: '#99F5D5',
  semanticYellow: '#FFF9C2',
  semanticRedLight: '#F599A8',
  semanticRedDark: '#E95374',
} as const satisfies Record<string, CSSProperties['color']>
