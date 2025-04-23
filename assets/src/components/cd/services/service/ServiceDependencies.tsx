import { EmptyState, Table } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { columns } from '../ServiceDependenciesColumns'

import { useServiceContext } from './ServiceDetails'

export default function ServiceDependencies() {
  const { service } = useServiceContext()

  return (
    <ScrollablePage
      scrollable={false}
      heading="Dependencies"
    >
      {isEmpty(service.dependencies) ? (
        <EmptyState message="No dependencies" />
      ) : (
        <Table
          fullHeightWrap
          data={service?.dependencies || []}
          columns={columns}
        />
      )}
    </ScrollablePage>
  )
}
