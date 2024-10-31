import { Card } from '@pluralsh/design-system'

export function AIPinTable() {
  return <Card css={{ padding: 16 }}>AIPinTable placeholder</Card>
  // should look like this
  // <FullHeightTableWrap>
  //   <Table
  //     virtualizeRows
  //     padCells={false}
  //     data={threads}
  //     columns={tableColumn}
  //     hideHeader
  //     hasNextPage={pageInfo?.hasNextPage}
  //     fetchNextPage={fetchNextPage}
  //     isFetchingNextPage={loading}
  //     onVirtualSliceChange={setVirtualSlice}
  //     reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
  //     css={{
  //       height: '100%',
  //       border: theme.borders['fill-one'],
  //       '& div': { border: 'none' },
  //     }}
  //     emptyStateProps={{
  //       message: 'No chat threads found.',
  //     }}
  //   />
  // </FullHeightTableWrap>
}
