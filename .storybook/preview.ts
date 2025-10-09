import { type Preview } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { themes } from 'storybook/theming'

import { DEFAULT_COLOR_MODE } from '../src/theme'
import themeDecorator from '../src/ThemeDecorator'

// Copied from https://github.com/storybookjs/storybook/blob/v8.2.5/code/core/src/theming/utils.ts
const { window: globalWindow } = global

export const getPreferredColorScheme = () => {
  if (!globalWindow || !globalWindow.matchMedia) return 'light'

  const isDarkThemePreferred = globalWindow.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches

  if (isDarkThemePreferred) return 'dark'

  return 'light'
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    actions: { onClick: fn },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      theme: themes.dark,
    },
    options: {
      storySort: {
        order: ['Semantic System', '*'],
      },
    },
  },

  globalTypes: {
    theme: {
      name: 'Toggle theme',
      description: 'Global theme for components',
      toolbar: {
        // The label to show for this toolbar item
        title: 'Theme',
        icon: 'circlehollow',
        // Array of plain string values or MenuItem shape (see below)
        items: [
          { value: 'light', icon: 'circlehollow', title: 'Light' },
          { value: 'dark', icon: 'circle', title: 'Dark' },
        ],
        // Change title based on selected value
        dynamicTitle: true,
        showName: true,
      },
    },
  },

  initialGlobals: {
    theme: DEFAULT_COLOR_MODE,
  },

  decorators: [themeDecorator],

  // TODO: Enable if we need autodocs
  // tags: ['autodocs'],
}

export default preview
