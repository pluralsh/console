import { ReactNode, useLayoutEffect } from 'react'
import { ApolloQueryResult } from '@apollo/client'
import {
  ServiceDeploymentDetailsFragment,
  ServiceDeploymentQuery,
} from 'generated/graphql'
import { useOutletContext } from 'react-router-dom'

export type ServiceDetailsContextType = {
  service: Nullable<ServiceDeploymentDetailsFragment>
  refetch: () => Promise<ApolloQueryResult<ServiceDeploymentQuery>>
  isRefetching: boolean
  isLoading: boolean
  setSidenavContent: (content: ReactNode | null) => void
}

export const useServiceContext = () =>
  useOutletContext<ServiceDetailsContextType>()

export const useSetSidenavContent = (sidenavContent?: ReactNode) => {
  const ctx = useOutletContext<ServiceDetailsContextType | null>()

  if (!ctx) {
    console.warn('useSetSidenavContent() must be used within ServiceDetails')
  }

  const { setSidenavContent } = ctx || {}

  useLayoutEffect(() => {
    setSidenavContent?.(sidenavContent ?? null)

    return () => {
      setSidenavContent?.(null)
    }
  }, [setSidenavContent, sidenavContent])
}
