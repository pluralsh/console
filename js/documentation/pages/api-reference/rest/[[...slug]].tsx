/**
 * REST API Reference — catch-all route.
 *
 * URL structure:
 *   /api-reference/rest                → Authentication page
 *   /api-reference/rest/authentication → Authentication page
 *   /api-reference/rest/{operationId}  → Endpoint detail page
 *
 * Data is loaded at runtime via getServerSideProps and cached per-pod.
 */

import type { GetServerSideProps } from 'next'

import { RestApiReference, slugToId } from '@src/components/RestApiReference'
import { AUTH_PAGE_ID } from '@src/components/RestApiReference/SidebarNav'

import type { ApiSection, EndpointDetail } from '@src/lib/openapi-rest'

type RestPageProps = {
  apiSections: ApiSection[]
  endpointDetail: EndpointDetail | null
  selectedId: string
}

export function RestPage({
  apiSections = [],
  endpointDetail = null,
  selectedId,
}: RestPageProps) {
  return (
    <RestApiReference
      apiSections={apiSections}
      endpointDetail={endpointDetail}
      selectedId={selectedId}
    />
  )
}

RestPage.customLayout = true

export const getServerSideProps: GetServerSideProps<RestPageProps> = async ({
  params,
}) => {
  const { fetchRestApiData } = await import('@src/lib/openapi-rest')
  const { apiSections, endpointDetails } = await fetchRestApiData()

  const slugId = slugToId(params?.slug)
  const endpointDetail = endpointDetails[slugId] ?? null

  if (!(endpointDetail || slugId === AUTH_PAGE_ID)) return { notFound: true }

  return {
    props: {
      displayTitle: 'REST API Reference',
      apiSections,
      endpointDetail,
      selectedId: slugId,
    },
  }
}

export default RestPage
