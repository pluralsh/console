import {
  type ReactNode,
  Suspense,
  useContext,
  useEffect,
  useState,
} from 'react'

import { GitHubLogoIcon } from '@pluralsh/design-system'

import styled from 'styled-components'

import ArticlesInSection from './ArticlesInSection'
import Breadcrumbs from './Breadcrumbs'
import { FooterLink } from './PageFooter'
import { PagePropsContext } from './PagePropsContext'

const ContentWrapper = styled.div(({ theme }) => ({
  marginTop: theme.spacing.xlarge,
}))

const BreadcrumbsWrapper = styled.div(({ theme }) => ({
  marginTop: theme.spacing.xlarge,
}))

const Title = styled.h1(({ theme }) => ({
  ...theme.partials.marketingText.hero2,
  margin: 0,
  marginBottom: theme.spacing.small,
}))

const Description = styled.p(({ theme }) => ({
  ...theme.partials.marketingText.body1,
  color: theme.colors['text-light'],
  marginTop: 0,
  marginBottom: theme.spacing.small,
}))

export const EditOnGithub = styled.div(({ theme }) => ({
  marginBottom: theme.spacing.xxxlarge,
}))

const EditOnGithubLink = styled(FooterLink)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing.small,
}))

export const PageDivider = styled.div(({ theme }) => ({
  marginTop: theme.spacing.xxxlarge,
  marginBottom: theme.spacing.xxxlarge,
  borderTop: theme.borders.default,
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
      {title && <Title>{title}</Title>}
      {description && <Description>{description}</Description>}
      <ArticlesInSection
        title="Articles in this section"
        hasContent={pageHasContent}
      />
    </div>
  )
}

export const ContentHeader = styled(ContentHeaderUnstyled)(({ theme }) => ({
  marginBottom: theme.spacing.xxlarge,
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
        {markdoc?.file?.path && (
          <EditOnGithub>
            <EditOnGithubLink
              target="_blank"
              rel="noopener noreferrer"
              href={`https://github.com/pluralsh/documentation/blob/main/pages${markdoc.file.path}`}
            >
              <GitHubLogoIcon
                size={20}
                display="block"
              />
              <div>Edit on Github</div>
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
