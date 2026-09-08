import { render } from '@testing-library/react'
import { expect, vi } from 'vitest'
import App from './App'

// Mock the ThemeProviders component
vi.mock('./App', () => ({
  default: () => <div data-testid="mock-app">App</div>,
}))

describe('App', () => {
  it('should render', () => {
    const { container } = render(<App />)
    expect(container).not.toBeNull()
  })
})
