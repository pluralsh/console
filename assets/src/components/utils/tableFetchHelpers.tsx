import { PageInfoFragment } from 'generated/graphql'
import { Connection, PaginatedResult, extendConnection } from 'utils/graphql'
import { ApolloQueryResult } from '@apollo/client'

type FetchMoreT<
  TData extends Partial<
    Record<K, (Connection<any> & PaginatedResult<any>) | null>
  >,
  K extends string,
  TVariables extends { after: string | null | undefined } = {
    after: string | null | undefined
  },
> = (
  fetchMoreOptions: { variables: TVariables } & {
    updateQuery?: (
      previousQueryResult: TData,
      options: {
        fetchMoreResult: TData
      }
    ) => TData
  }
) => Promise<ApolloQueryResult<TData>>

export function fetchMoreAndExtend<
  TData extends Partial<
    Record<K, (Connection<any> & PaginatedResult<any>) | null>
  >,
  K extends string,
>({
  fetchMore,
  pageInfo,
  key,
}: {
  pageInfo: PageInfoFragment | null | undefined
  fetchMore: FetchMoreT<TData, K>
  key: K
}) {
  if (!pageInfo?.endCursor) {
    return
  }
  fetchMore({
    variables: { after: pageInfo.endCursor },
    updateQuery: (prev, { fetchMoreResult }) => {
      const ret = extendConnection(prev, fetchMoreResult[key], key)

      return ret
    },
  })
}
