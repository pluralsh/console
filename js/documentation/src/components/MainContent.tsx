import {
  type ReactNode,
  Suspense,
  useContext,
  useEffect,
  useState,
} from 'react'

import { GitHubLogoIcon } from '@pluralsh/design-system'

import styled from 'styled-components'

import { brand, docsText } from '@src/theme/docsTheme'
import ArticlesInSection from './ArticlesInSection'
import Breadcrumbs from './Breadcrumbs'
import { PagePropsContext } from './PagePropsContext'
import PrevNext from './PrevNext'

const ContentWrapper = styled.div((_) => ({
  minWidth: 0,
}))

const BreadcrumbsWrapper = styled.div((_) => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minWidth: 0,
  marginBottom: 20,
  '& > *': {
    minWidth: 0,
    width: '100%',
  },
}))

const Title = styled.h1((_) => ({
  ...docsText.pageTitle,
  margin: 0,
}))

const Description = styled.p((_) => ({
  ...docsText.lead,
  margin: 0,
}))

const TitleBlock = styled.header((_) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  paddingBottom: 18,
  borderBottom: `1px solid ${brand.line}`,
}))

export const EditOnGithub = styled.div(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing.large,
  marginBottom: theme.spacing.xxlarge,
}))

const EditOnGithubLink = styled.a(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  '&, &:any-link': {
    ...docsText.eyebrow,
    textDecoration: 'none',
    transition: 'color 0.2s ease-out',
  },
  '&:any-link:hover': {
    color: brand['accent-ink'],
  },
}))

export const PageDivider = styled.div(({ theme }) => ({
  marginTop: theme.spacing.xxlarge,
  marginBottom: theme.spacing.large,
  borderTop: `1px solid ${brand.line}`,
}))

function ContentHeaderUnstyled({
  title,
  description,
  className,
  pageHasContent = true,
}: {
  title?: ReactNode
  description?: ReactNode
  className?: string
  pageHasContent?: boolean
}) {
  return (
    <div className={className}>
      <TitleBlock>
        {title && <Title>{title}</Title>}
        {description && <Description>{description}</Description>}
      </TitleBlock>
      <ArticlesInSection
        title="Articles in this section"
        hasContent={pageHasContent}
      />
    </div>
  )
}

export const ContentHeader = styled(ContentHeaderUnstyled)(({ theme }) => ({
  marginBottom: theme.spacing.xlarge,
}))

export default function MainContent({
  Component,
  title,
  description,
}: {
  Component: React.ComponentType<any>
  title?: ReactNode
  description?: ReactNode
}) {
  const pageProps = useContext(PagePropsContext)
  const { markdoc } = pageProps || {}
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <>
      <BreadcrumbsWrapper>
        <Breadcrumbs />
      </BreadcrumbsWrapper>
      <ContentWrapper>
        <article className="primary-content">
          {(title || description) && (
            <ContentHeader
              title={title}
              description={description}
              pageHasContent={(markdoc?.content as any)?.children?.length > 0}
            />
          )}
          {isClient ? (
            <Suspense fallback={<div>Loading content...</div>}>
              <Component {...pageProps} />
            </Suspense>
          ) : (
            <Component {...pageProps} />
          )}
        </article>
        <PageDivider />
        <PrevNext />
        {markdoc?.file?.path && (
          <EditOnGithub>
            <EditOnGithubLink
              target="_blank"
              rel="noopener noreferrer"
              href={`https://github.com/pluralsh/documentation/blob/main/pages${markdoc.file.path}`}
            >
              <GitHubLogoIcon
                size={14}
                display="block"
              />
              Edit on GitHub
            </EditOnGithubLink>
          </EditOnGithub>
        )}
      </ContentWrapper>
    </>
  )
}

MainContent.defaultProps = {
  title: undefined,
  description: undefined,
}
