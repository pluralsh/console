import {
  type ComponentProps,
  type ComponentType,
  Suspense,
  forwardRef,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  FillLevelProvider,
  MarkdocContextProvider,
  NavigationContextProvider,
  type NavigationContextValue,
  GlobalStyle as PluralGlobalStyle,
  theme as honorableTheme,
  styledTheme,
} from '@pluralsh/design-system'
import { CssBaseline, ThemeProvider } from 'honorable'
import type { AppProps } from 'next/app'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

import { until } from '@open-draft/until'
import { SSRProvider } from '@react-aria/ssr'
import '@src/highlight'
import '@src/styles/globals.css'
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components'
import { SWRConfig } from 'swr'

import { BreakpointProvider } from '@src/components/Breakpoints'
import ExternalScripts from '@src/components/ExternalScripts'
import { FullNav } from '@src/components/FullNav'
import {
  GITHUB_DATA_URL,
  getGithubDataServer,
  isGithubRepoData,
} from '@src/components/GithubStars'
import GlobalStyles from '@src/components/GlobalStyles'
import HtmlHead from '@src/components/HtmlHead'
import MainContent from '@src/components/MainContent'
import PageFooter from '@src/components/PageFooter'
import {
  ContentContainer,
  PageGrid,
  SideCarContainer,
  SideNavContainer,
} from '@src/components/PageGrid'
import { PageHeader } from '@src/components/PageHeader'
import { PagePropsContext } from '@src/components/PagePropsContext'
import { TableOfContents } from '@src/components/TableOfContents'
import {
  META_DESCRIPTION,
  PAGE_TITLE_PREFIX,
  PAGE_TITLE_SUFFIX,
  ROOT_TITLE,
} from '@src/consts'
import { NavDataProvider } from '@src/contexts/NavDataContext'
import { collectHeadings } from '@src/markdoc/utils/parseHeadings'
import { getNavData } from '@src/NavData'

import type { MarkdocNextJsPageProps } from '@markdoc/next.js'

/** Page component type; some pages opt into a full-width custom layout (e.g. REST API reference). */
type PageComponentWithLayout = ComponentType<MyPageProps> & {
  customLayout?: boolean
}

export type MyPageProps = MarkdocNextJsPageProps & {
  displayTitle?: string
  metaTitle?: string
  displayDescription?: string
  metaDescription?: string
  tableOfContents?: any
}

type MyAppProps = AppProps<MyPageProps | undefined> & {
  errors: Error[]
  swrConfig: ComponentProps<typeof SWRConfig>['value']
}

export type MarkdocHeading = {
  id?: string
  level?: number
  title?: string
}

const docsStyledTheme = { ...styledTheme, ...{ docs: { topNavHeight: 72 } } }

const Page = styled.div(() => ({}))

const useNavigate = () => {
  const router = useRouter()

  return (url) => {
    router.push(url)
  }
}

const usePathname = () => {
  const router = useRouter()

  return router.basePath + (router.asPath.split(/[?#]/)[0] || router.pathname)
}

const Link = forwardRef<HTMLAnchorElement, ComponentProps<'a'>>(
  ({ href, ...props }, ref) => (
    <NextLink
      ref={ref}
      href={href ?? ''}
      {...props}
    />
  )
)

function App({ Component, pageProps = {}, swrConfig }: MyAppProps) {
  const router = useRouter()
  const markdoc = pageProps?.markdoc
  const [isClient, setIsClient] = useState(false)
  const [navData, setNavData] = useState(() => getNavData())

  useEffect(() => {
    setIsClient(true)
    setNavData(getNavData())
  }, [])

  const { metaTitle, metaDescription } = pageProps

  const displayTitle = pageProps?.displayTitle || markdoc?.frontmatter?.title
  const displayDescription =
    pageProps?.displayDescription || markdoc?.frontmatter?.description

  const headProps = {
    title:
      metaTitle || displayTitle
        ? `${PAGE_TITLE_PREFIX}${displayTitle}${PAGE_TITLE_SUFFIX}`
        : ROOT_TITLE,
    description:
      metaDescription ||
      (router.pathname === '/'
        ? META_DESCRIPTION
        : markdoc?.frontmatter?.description || META_DESCRIPTION),
  }

  const toc = pageProps.tableOfContents
    ? pageProps.tableOfContents
    : pageProps?.markdoc?.content
      ? collectHeadings(pageProps?.markdoc.content)
      : []

  const app = (
    <>
      <CssBaseline />
      <PluralGlobalStyle />
      <GlobalStyles />
      <PagePropsContext.Provider value={pageProps}>
        <HtmlHead {...headProps} />
        <PageHeader />
        <Page>
          {(Component as PageComponentWithLayout).customLayout ? (
            <Component {...pageProps} />
          ) : (
            <PageGrid>
              <SideNavContainer>
                {isClient ? (
                  <Suspense fallback={<div>Loading navigation...</div>}>
                    <FullNav desktop />
                  </Suspense>
                ) : (
                  <FullNav desktop />
                )}
              </SideNavContainer>
              <ContentContainer>
                <MainContent
                  Component={Component}
                  title={displayTitle}
                  description={displayDescription}
                />
                <PageFooter />
              </ContentContainer>
              <SideCarContainer>
                {isClient ? (
                  <Suspense fallback={<div>Loading table of contents...</div>}>
                    <TableOfContents
                      key={router.asPath}
                      toc={toc}
                    />
                  </Suspense>
                ) : (
                  <TableOfContents
                    key={router.asPath}
                    toc={toc}
                  />
                )}
              </SideCarContainer>
            </PageGrid>
          )}
        </Page>
        <ExternalScripts />
      </PagePropsContext.Provider>
    </>
  )

  const navContextVal = useMemo<NavigationContextValue>(
    () => ({ useNavigate, usePathname, Link }),
    []
  )

  return (
    <SSRProvider>
      <MarkdocContextProvider value={{ variant: 'docs' }}>
        <NavigationContextProvider value={navContextVal}>
          <SWRConfig value={swrConfig}>
            <NavDataProvider value={navData}>
              <BreakpointProvider>
                <ThemeProvider theme={honorableTheme}>
                  <StyledThemeProvider theme={docsStyledTheme}>
                    <FillLevelProvider value={0}>{app}</FillLevelProvider>
                  </StyledThemeProvider>
                </ThemeProvider>
              </BreakpointProvider>
            </NavDataProvider>
          </SWRConfig>
        </NavigationContextProvider>
      </MarkdocContextProvider>
    </SSRProvider>
  )
}

App.getInitialProps = async () => {
  const { data: githubData, error: githubError } = await until(() =>
    getGithubDataServer()
  )
  const swrFallback = {}

  if (isGithubRepoData(githubData)) {
    swrFallback[GITHUB_DATA_URL] = githubData
  }

  return {
    swrConfig: {
      fallback: swrFallback,
    },
    errors: [...(githubError ? [githubError] : [])],
  }
}

export default App
