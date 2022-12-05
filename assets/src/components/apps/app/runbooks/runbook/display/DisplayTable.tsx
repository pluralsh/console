import { HeaderItem } from 'components/kubernetes/Pod'
import { query } from 'components/runbooks/utils'
import { TRUNCATE } from 'components/utils/truncate'
import { Box } from 'grommet'
import { Div } from 'honorable'
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
        <Div
          color="text-light"
          key={header}
          width={width}
          {...TRUNCATE}
        >
          {query(data, path)}
        </Div>
      ))}
    </Box>
  )
}

// TODO: Update styling.
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
