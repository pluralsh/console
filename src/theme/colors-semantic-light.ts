import chroma from 'chroma-js'
import { type CSSProperties } from 'styled-components'

import { blue, green, grey, purple, red, yellow } from './colors-base'
import { colorsCloudShellLight } from './colors-cloudshell-light'
import { colorsCodeBlockLight } from './colors-codeblock-light'
import { type semanticColorsDark } from './colors-semantic-dark'

export const semanticColorsLight = {
  // Fill
  //
  // fill-zero
  'fill-zero': '#F9FAFB',
  'fill-zero-hover': grey[50],
  'fill-zero-selected': grey[100],
  // fill-one
  'fill-one': '#FFFFFF',
  'fill-one-hover': grey[100],
  'fill-one-selected': grey[200],
  // fill-two
  'fill-two': '#F0F4F5',
  'fill-two-hover': grey[200],
  'fill-two-selected': '#A9AFBC',
  // fill-three
  'fill-three': grey[100],
  'fill-three-hover': grey[400],
  'fill-three-selected': grey[300],
  // primary
  'fill-primary': purple[400],
  'fill-primary-hover': purple[350],

  // Action
  //
  // primary
  'action-primary': purple[400],
  'action-primary-hover': purple[350],
  'action-primary-disabled': grey[100],
  // link
  'action-link-inactive': '#A9AFBC',
  'action-link-active': blue[600],
  'action-link-inline': blue[700],
  // link-inline

  // Check with design team that this is correct
  'action-link-inline-hover': blue[600],

  'action-link-inline-visited': purple[300],
  'action-link-inline-visited-hover': purple[200],
  // input
  'action-input-hover': `${chroma(grey[950]).alpha(0.04)}`, // text color w/ alpha

  // Border
  //
  border: grey[100],
  'border-input': grey[300],
  'border-fill-two': grey[200],
  'border-fill-three': grey[400],
  'border-disabled': grey[200],
  'border-outline-focused': blue[400],
  'border-primary': purple[400],
  'border-secondary': blue[400],
  'border-success': green[500],
  'border-warning': '#FFF175',
  'border-danger': '#ED4578',
  'border-selected': grey[100],
  'border-info': blue[300],

  // Text
  //
  text: grey[950],
  'text-light': '#5D626F',
  'text-xlight': '#A9AFBC',
  'text-long-form': grey[300],
  'text-disabled': grey[200],
  'text-input-disabled': grey[200],
  'text-primary-accent': '#38B6FF',
  'text-primary-disabled': grey[500],
  'text-success': green[700],
  'text-success-light': green[600],
  'text-warning': yellow[500],
  'text-warning-light': '#FFE500',
  'text-danger': '#ED4578',
  'text-danger-light': red[300],

  // Icon
  //
  'icon-default': grey[600],
  'icon-light': grey[500],
  'icon-xlight': grey[400],
  'icon-disabled': grey[100],
  'icon-primary': purple[300],
  'icon-secondary': blue[400],
  'icon-info': blue[200],
  'icon-success': green[700],
  'icon-warning': '#FF9900',
  'icon-danger': red[300],
  'icon-danger-critical': '#ED4578',

  // Marketing
  //
  'marketing-white': '#000000',
  'marketing-black': '#FFFFFF',

  // Shadows
  //
  'shadow-default': grey[950],

  // Code-blocks
  //
  ...colorsCodeBlockLight,

  // Cloud shell
  //
  ...colorsCloudShellLight,

  // Deprecated (Remove after all 'error' colors converted to 'danger' in app)
  //
  'border-error': red[300],
  'text-error': 'blue',
  'text-error-light': 'blue',
  'icon-error': 'blue',
} as const satisfies Record<
  keyof typeof semanticColorsDark,
  CSSProperties['color']
>
