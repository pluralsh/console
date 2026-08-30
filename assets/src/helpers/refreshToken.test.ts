import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchRefreshToken: vi.fn(() => 'refresh-token-1'),
  query: vi.fn(),
  setRefreshToken: vi.fn(),
}))

vi.mock('./auth', () => ({
  fetchRefreshToken: mocks.fetchRefreshToken,
  setRefreshToken: mocks.setRefreshToken,
  setToken: vi.fn(),
  wipeRefreshToken: vi.fn(),
  wipeToken: vi.fn(),
}))
vi.mock('./client', () => ({
  authlessClient: { query: mocks.query },
}))
vi.mock('./impersonation', () => ({
  clearServiceAccountImpersonation: vi.fn(),
  isImpersonatingServiceAccount: vi.fn(),
  stopServiceAccountImpersonation: vi.fn(),
}))
vi.mock('generated/graphql', () => ({
  RefreshDocument: {},
}))

import { getRefreshedToken } from './refreshToken'

describe('getRefreshedToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shares one refresh request between concurrent callers', async () => {
    let resolveRefresh:
      | ((value: {
          data: {
            refresh: { jwt: string; refreshToken: { token: string } }
          }
        }) => void)
      | undefined
    const response = new Promise((resolve) => {
      resolveRefresh = resolve
    })

    mocks.query.mockReturnValue(response)

    const firstRefresh = getRefreshedToken()
    const secondRefresh = getRefreshedToken()

    expect(mocks.query).toHaveBeenCalledTimes(1)

    resolveRefresh?.({
      data: {
        refresh: {
          jwt: 'jwt-2',
          refreshToken: { token: 'refresh-token-2' },
        },
      },
    })

    await expect(Promise.all([firstRefresh, secondRefresh])).resolves.toEqual([
      'jwt-2',
      'jwt-2',
    ])
    expect(mocks.setRefreshToken).toHaveBeenCalledOnce()
    expect(mocks.setRefreshToken).toHaveBeenCalledWith('refresh-token-2')
  })

  it('starts a new request after the current refresh completes', async () => {
    mocks.query.mockResolvedValue({
      data: {
        refresh: {
          jwt: 'jwt',
          refreshToken: { token: 'refresh-token' },
        },
      },
    })

    await getRefreshedToken()
    await getRefreshedToken()

    expect(mocks.query).toHaveBeenCalledTimes(2)
  })
})
