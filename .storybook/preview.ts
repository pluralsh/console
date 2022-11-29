import * as jest from 'jest-mock'

import ThemeDecorator from '../src/ThemeDecorator'

// @ts-expect-error
window.jest = jest

export const parameters = {
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
}

export const decorators = [ThemeDecorator]
