import { create } from 'storybook/theming'

export default create({
  base: 'dark',

  // HTML title instead of brandImage, which stretches to the sidebar width
  brandTitle:
    '<img src="/logos/plural-full-logo-white.svg" alt="Plural" width="80" />',
  brandUrl: 'https://plural.sh',
  brandTarget: '_self',

  colorPrimary: '#293EFF',
  colorSecondary: '#293EFF',

  // UI
  appBg: '#1E2229',
  appContentBg: '#2A2E37',
  appBorderColor: '#2A2E37',
  appBorderRadius: 3,

  // Typography
  fontBase: 'Inter, "Open Sans", sans-serif',
  fontCode: 'monospace',

  // Text colors
  textColor: 'white',
  textInverseColor: 'white',
  textMutedColor: 'grey',

  // Toolbar default and active colors
  barTextColor: '#73828C',
  barSelectedColor: '#73828C',
  barBg: '#1E2229',

  // Form colors
  inputBg: '#1E2229',
  inputBorder: '#2A2E37',
  inputTextColor: 'white',
  inputBorderRadius: 3,
})
