/**
 * REST API Reference - main composition.
 * Composes SidebarNav, ParameterTable, ResponsePanel, MethodBadge.
 * Data passed as props; no fetching.
 */

import { useMemo, useState } from 'react'

import { CheckIcon, CopyIcon, Tab } from '@pluralsh/design-system'
import { useRouter } from 'next/router'

import Breadcrumbs from '@src/components/Breadcrumbs'
import { PageDivider } from '@src/components/MainContent'
import {
  ContentContainer,
  MainColumn,
  PageGrid,
  SideNavContainer,
} from '@src/components/PageGrid'
import { useCopyText } from '@src/hooks/useCopyText'

import { AuthPageContent } from './AuthPageContent'
import { MethodBadge } from './MethodBadge'
import { ParameterTable } from './ParameterTable'
import { ResponsePanel } from './ResponsePanel'
import { ResponseSchemaView } from './ResponseSchemaView'
import {
  BreadcrumbsWrapper,
  ContentGrid,
  CopyIconButton,
  CopyIconWrapper,
  EndpointName,
  EndpointPath,
  EndpointTitleRow,
  PageDescription,
  PathGroup,
  RestContentWrapper,
  TabBar,
} from './RestApiReference.styles'
import { AUTH_PAGE_ID, SidebarNav } from './SidebarNav'

import type {
  ApiSection,
  EndpointDetail,
  Parameter,
} from '@src/lib/openapi-rest'

type TabId = 'query' | 'responses'

export type RestApiReferenceProps = {
  apiSections: ApiSection[]
  endpointDetail?: EndpointDetail | null
  selectedId: string
}

export function slugToId(slug: string | string[] | undefined) {
  const s = Array.isArray(slug) ? slug[0] : slug

  if (!s || s === 'authentication') return AUTH_PAGE_ID

  return s
}

export function RestApiReference({
  apiSections = [],
  endpointDetail = null,
  selectedId: initialSelectedId,
}: RestApiReferenceProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('query')

  const selectedId = router.query.slug
    ? slugToId(router.query.slug)
    : initialSelectedId

  const isAuthPage = selectedId === AUTH_PAGE_ID
  const detail =
    !isAuthPage && endpointDetail?.id === selectedId ? endpointDetail : null
  const { copied: pathCopied, handleCopy: handleCopyPath } = useCopyText(
    detail?.path ?? ''
  )

  const currentLabel = isAuthPage
    ? 'Authentication'
    : (detail?.operationName ?? selectedId)

  const breadcrumbs = useMemo(
    () => [
      { label: 'Docs', url: '/' },
      { label: 'API Reference', url: '/api-reference' },
      { label: 'REST API Reference', url: '/api-reference/rest' },
      { label: currentLabel },
    ],
    [currentLabel]
  )

  return (
    <PageGrid>
      <SideNavContainer>
        <SidebarNav
          sections={apiSections}
          selectedId={selectedId}
        />
      </SideNavContainer>
      <MainColumn>
        <ContentContainer $wide>
          <RestContentWrapper>
            <BreadcrumbsWrapper>
              <Breadcrumbs breadcrumbs={breadcrumbs} />
            </BreadcrumbsWrapper>

            {isAuthPage && <AuthPageContent />}

            {!isAuthPage && detail && (
              <ContentGrid>
                <div>
                  <EndpointTitleRow>
                    <EndpointName>{detail.operationName}</EndpointName>
                    <PathGroup>
                      <MethodBadge method={detail.method} />
                      <EndpointPath>{detail.path}</EndpointPath>
                      <CopyIconButton
                        onClick={() => handleCopyPath()}
                        type="button"
                        title={pathCopied ? 'Copied' : 'Copy path'}
                      >
                        <CopyIconWrapper $visible={!pathCopied}>
                          <CopyIcon size={16} />
                        </CopyIconWrapper>
                        <CopyIconWrapper $visible={pathCopied}>
                          <CheckIcon size={16} />
                        </CopyIconWrapper>
                      </CopyIconButton>
                    </PathGroup>
                  </EndpointTitleRow>

                  {detail.description && (
                    <PageDescription>{detail.description}</PageDescription>
                  )}

                  <TabBar>
                    <Tab
                      active={activeTab === 'query'}
                      onClick={() => setActiveTab('query')}
                    >
                      {getParameterTabLabel(detail.parameters ?? [])}
                    </Tab>
                    <Tab
                      active={activeTab === 'responses'}
                      onClick={() => setActiveTab('responses')}
                    >
                      Responses
                    </Tab>
                  </TabBar>

                  {activeTab === 'query' && (
                    <ParameterTable parameters={detail.parameters} />
                  )}

                  {activeTab === 'responses' && (
                    <ResponseSchemaView
                      key={detail.id}
                      schemas={detail.responseSchemas ?? []}
                    />
                  )}
                </div>
                <ResponsePanel
                  key={detail.id}
                  detail={detail}
                />
              </ContentGrid>
            )}
          </RestContentWrapper>
          <PageDivider />
        </ContentContainer>
      </MainColumn>
    </PageGrid>
  )
}

function getParameterTabLabel(parameters: Parameter[]): string {
  const kinds = new Set(
    parameters
      .map((parameter) => parameter.kind)
      .filter((kind): kind is NonNullable<Parameter['kind']> => !!kind)
  )

  if (kinds.size !== 1) return 'Parameters'
  if (kinds.has('body')) return 'Body parameters'
  if (kinds.has('path')) return 'Path parameters'

  return 'Query parameters'
}
