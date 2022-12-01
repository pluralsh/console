import { HeaderItem } from 'components/kubernetes/Pod'
import { query } from 'components/runbooks/utils'
import { Box } from 'grommet'
import { useContext } from 'react'

import { DisplayContext } from '../RunbookDisplay'

function TableRow({ data, columns }) {
  return (
    <Box
      direction="row"
      align="center"
      pad="small"
      gap="xsmall"
      border={{ side: 'bottom', color: 'cardDarkLight' }}
    >
      {columns.map(({ attributes: { header, width, path } }) => (
        <HeaderItem
          key={header}
          text={query(data, path)}
          width={width}
          nobold
          truncate
        />
      ))}
    </Box>
  )
}

export function DisplayTable({
  attributes: {
    datasource, width, height, path,
  }, children,
}) {
  const { datasources } = useContext<any>(DisplayContext)
  const entries = path ? query(datasources[datasource], path) : datasources[datasource]

  return (
    <Box
      width={width}
      height={height}
    >
      <Box
        direction="row"
        align="center"
        border={{ side: 'bottom', color: 'cardDarkLight' }}
        pad="small"
        gap="xsmall"
      >
        {children.map(({ attributes: { header, width } }) => (
          <HeaderItem
            key={header}
            text={header}
            width={width}
            nobold={undefined}
            truncate={undefined}
          />
        ))}
      </Box>
      {entries.map((data, ind) => (
        <TableRow
          key={`${ind}`}
          data={data}
          columns={children}
        />
      ))}
    </Box>
  )
}
