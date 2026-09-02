import { GitHubLogoIcon } from '@pluralsh/design-system'

import styled from 'styled-components'
import useSWR from 'swr'

import { ButtonFillTwo } from './PageHeaderButtons'

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

const GithubLink = styled(ButtonFillTwo)<{ $loading: boolean }>(
  ({ theme, $loading }) => ({
    height: theme.spacing.xlarge,
    borderRadius: theme.borderRadiuses.medium,
    width: 'auto',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    '.left, .right': {
      ...theme.partials.text.buttonSmall,
      color: theme.colors.text,
      textDecoration: 'none',
      fontWeight: '600',
      height: theme.spacing.xlarge - theme.borderWidths.default * 2,
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'row',
      paddingLeft: theme.spacing.small,
      paddingRight: theme.spacing.small,
      gap: theme.spacing.small,
    },
    '.right': {
      backgroundColor: theme.colors['fill-one'],
      '&:hover ': {
        backgroundColor: theme.colors['fill-one-hover'],
      },
    },
    '.left': {
      backgroundColor: theme.colors['fill-two'],
      '&:hover': {
        backgroundColor: theme.colors['fill-two-hover'],
      },
      ...(!$loading
        ? {
            borderRight: theme.borders['fill-two'],
          }
        : {}),
    },
  })
)

export default function GithubStars({ account = 'pluralsh', repo = 'plural' }) {
  const { data, error } = useSWR(
    `https://api.github.com/repos/${account}/${repo}`,
    fetcher
  )

  const loading = error || !isGithubRepoData(data)

  return (
    <GithubLink
      $loading={loading}
      as="div"
    >
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
