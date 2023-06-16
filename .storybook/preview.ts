import * as jest from 'jest-mock'

import { type Preview } from '@storybook/react'

import themeDecorator from '../src/ThemeDecorator'
import { COLOR_MODES, DEFAULT_COLOR_MODE } from '../src/theme'

// @ts-expect-error
window.jest = jest

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    options: {
      storySort: {
        order: ['Semantic System', '*'],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: DEFAULT_COLOR_MODE,
      toolbar: {
        // The label to show for this toolbar item
        title: 'Theme',
        icon: 'circlehollow',
        // Array of plain string values or MenuItem shape (see below)
        items: COLOR_MODES,
        // Change title based on selected value
        dynamicTitle: true,
      },
    },
  },
  decorators: [themeDecorator],
}

export default preview
