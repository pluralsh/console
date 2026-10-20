import { GitHubLogoIcon } from '@pluralsh/design-system'

import styled from 'styled-components'
import useSWR from 'swr'

import { brand } from '@src/theme/docsTheme'

type GithubRepoData = {
  stargazers_count: number
}

const CACHE_MAX_AGE_MINUTES = 1

export const GITHUB_DATA_URL = 'https://api.github.com/repos/pluralsh/plural'

const githubDataCache: { data?: GithubRepoData; minutes?: number } = {}

export const getGithubDataServer = async () => {
  const minutes = new Date().getUTCMinutes()

  if (
    githubDataCache.minutes &&
    minutes < githubDataCache.minutes + CACHE_MAX_AGE_MINUTES &&
    githubDataCache.data
  ) {
    return githubDataCache.data
  }

  const githubUrl = GITHUB_DATA_URL

  const githubResp = await fetch(githubUrl)
  const githubData = await githubResp?.json()

  if (isGithubRepoData(githubData)) {
    githubDataCache.data = githubData
    githubDataCache.minutes = minutes

    return githubData
  }

  return githubDataCache.data || undefined
}

async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init)

  return res.json()
}

export function isGithubRepoData(obj: unknown): obj is GithubRepoData {
  return !!(obj && typeof obj === 'object' && 'stargazers_count' in obj)
}

const GithubLink = styled.div<{ $loading: boolean }>(({ theme, $loading }) => ({
  height: 36,
  borderRadius: 4,
  border: `1px solid ${brand['line-strong']}`,
  background: brand.surface,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  '.left, .right': {
    fontFamily: theme.fontFamilies.sans,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1,
    color: brand.ink,
    textDecoration: 'none',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    paddingLeft: theme.spacing.small,
    paddingRight: theme.spacing.small,
    gap: theme.spacing.xsmall,
    transition: 'background-color 0.2s ease-out',
    '&:hover': {
      backgroundColor: brand['surface-hover'],
    },
  },
  '.right': {
    ...theme.partials.text.mono,
    fontSize: 12,
    fontWeight: 400,
    color: brand.muted,
  },
  ...(!$loading
    ? {
        '.left': {
          borderRight: `1px solid ${brand.line}`,
        },
      }
    : {}),
}))

export default function GithubStars({ account = 'pluralsh', repo = 'plural' }) {
  const { data, error } = useSWR(
    `https://api.github.com/repos/${account}/${repo}`,
    fetcher
  )

  const loading = error || !isGithubRepoData(data)

  return (
    <GithubLink $loading={loading}>
      <a
        className="left"
        target="_blank"
        rel="noreferrer noopener"
        href={`https://github.com/${account}/${repo}`}
      >
        <GitHubLogoIcon size={16} />
        <div>Star</div>
      </a>
      {!loading && (
        <a
          className="right"
          target="_blank"
          rel="noreferrer noopener"
          href={`https://github.com/${account}/${repo}/stargazers`}
        >
          {data?.stargazers_count}
        </a>
      )}
    </GithubLink>
  )

  return null
}
