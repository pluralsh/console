import { describe, expect, it } from 'vitest'
import {
  getKubeUpdateDiffValues,
  isServerSideApplyKubeRequest,
} from './workbenchJobKubeActionUtils'

const CURRENT_CONFIG_MAP = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: 'app-config',
    namespace: 'default',
    labels: { app: 'api' },
    resourceVersion: '123',
  },
  data: {
    changed: 'old',
    unchanged: 'keep me',
  },
  status: { phase: 'Active' },
}

describe('getKubeUpdateDiffValues', () => {
  it('keeps full-object replacement diffs for PUT updates', () => {
    const { oldValue, newValue } = getKubeUpdateDiffValues({
      method: 'put',
      contentType: 'application/json',
      current: CURRENT_CONFIG_MAP,
      body: JSON.stringify({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'app-config', namespace: 'default' },
        data: { changed: 'new' },
      }),
    })

    expect(oldValue).toContain('unchanged: keep me')
    expect(newValue).not.toContain('unchanged: keep me')
  })

  it('filters server-side apply diffs to fields present in the apply object', () => {
    const { oldValue, newValue } = getKubeUpdateDiffValues({
      method: 'patch',
      contentType: 'application/apply-patch+yaml',
      current: CURRENT_CONFIG_MAP,
      body: JSON.stringify({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'app-config' },
        data: { changed: 'new' },
      }),
    })

    expect(oldValue).toContain('changed: old')
    expect(oldValue).not.toContain('unchanged: keep me')
    expect(oldValue).not.toContain('labels:')
    expect(oldValue).not.toContain('resourceVersion')
    expect(oldValue).not.toContain('status:')
    expect(newValue).toContain('changed: new')
  })
})

describe('isServerSideApplyKubeRequest', () => {
  it('detects apply patch content types with parameters', () => {
    expect(
      isServerSideApplyKubeRequest({
        method: 'PATCH',
        contentType: 'application/apply-patch+yaml; charset=utf-8',
      })
    ).toBe(true)
    expect(
      isServerSideApplyKubeRequest({
        method: 'patch',
        contentType: 'application/merge-patch+json',
      })
    ).toBe(false)
  })
})
