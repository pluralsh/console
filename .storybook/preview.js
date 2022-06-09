import ThemeDecorator from '../src/ThemeDecorator'

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
