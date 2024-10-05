import { render } from '@testing-library/react'

import App from './App'
import { expect } from 'vitest'

describe('App', () => {
  it('should render', () => {
    const container = render(<App />)

    expect(container).not.toBeNull()
  })
})
