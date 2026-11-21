import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import {
  FeatureFlagContext,
  FeatureFlagGate,
  FeatureFlags,
} from './FeatureFlagContext'

function renderGated(featureFlags: FeatureFlags) {
  render(
    <FeatureFlagContext value={{ featureFlags, setFeatureFlag: () => {} }}>
      <MemoryRouter initialEntries={['/workbenches/wb/devboxes/boxes/box']}>
        <Routes>
          <Route
            path="/workbenches/:workbenchId"
            element={<Outlet />}
          >
            <Route
              index
              element={<span>workbench</span>}
            />
            <Route
              path="devboxes/boxes/:devboxId"
              element={
                <FeatureFlagGate flag="Devboxes">
                  <span>devboxes</span>
                </FeatureFlagGate>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </FeatureFlagContext>
  )
}

describe('FeatureFlagGate', () => {
  it('renders the page when the flag is on', () => {
    renderGated({ Edge: false, Devboxes: true })
    expect(screen.getByText('devboxes')).toBeTruthy()
  })

  it('redirects to the parent route when the flag is off', () => {
    renderGated({ Edge: false, Devboxes: false })
    expect(screen.queryByText('devboxes')).toBeNull()
    expect(screen.getByText('workbench')).toBeTruthy()
  })
})
