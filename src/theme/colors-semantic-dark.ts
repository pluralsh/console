import chroma from 'chroma-js'
import { type CSSProperties } from 'styled-components'

import { blue, green, grey, purple, red, yellow } from './colors-base'
import { colorsCloudShellDark } from './colors-cloudshell-dark'
import { colorsCodeBlockDark } from './colors-codeblock-dark'

export const semanticColorsDark = {
  // Fill
  //
  // fill-zero
  'fill-zero': grey[900],
  'fill-zero-hover': grey[875],
  'fill-zero-selected': grey[825],
  // fill-one
  'fill-one': grey[850],
  'fill-one-hover': grey[825],
  'fill-one-selected': grey[775],
  // fill-two
  'fill-two': grey[800],
  'fill-two-hover': grey[775],
  'fill-two-selected': grey[725],
  // fill-three
  'fill-three': grey[750],
  'fill-three-hover': grey[725],
  'fill-three-selected': grey[675],
  'fill-primary': purple[400],
  'fill-primary-hover': purple[350],

  // Action
  //
  // primary
  'action-primary': purple[400],
  'action-primary-hover': purple[350],
  'action-primary-disabled': grey[825],
  // link
  'action-link-inactive': grey[200],
  'action-link-active': grey[50],
  // link-inline
  'action-link-inline': blue[200],
  'action-link-inline-hover': blue[100],
  'action-link-inline-visited': purple[300],
  'action-link-inline-visited-hover': purple[200],
  'action-input-hover': `${chroma('#E9ECF0').alpha(0.04)}`,

  // Border
  //
  border: grey[800],
  'border-input': grey[700],
  'border-fill-two': grey[750],
  'border-fill-three': grey[700],
  'border-disabled': grey[700],
  'border-outline-focused': blue[300],
  'border-primary': purple[300],
  'border-secondary': blue[400],
  'border-success': green[300],
  'border-warning': yellow[200],
  'border-danger': red[300],
  'border-selected': grey[100],
  'border-info': blue[300],

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

  // Marketing
  //
  'marketing-white': '#FFFFFF',
  'marketing-black': '#000000',

  // Shadows
  //
  'shadow-default': grey[950],

  // Code blocks
  //
  ...colorsCodeBlockDark,

  // Cloud shell
  //
  ...colorsCloudShellDark,

  // Deprecated (Remove after all 'error' colors converted to 'danger' in app)
  //
  'border-error': red[300],
  'text-error': red[400],
  'text-error-light': red[200],
  'icon-error': red[200],
} as const satisfies Record<string, CSSProperties['color']>
