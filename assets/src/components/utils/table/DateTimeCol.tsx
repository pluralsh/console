import moment from 'moment'
import { useTheme } from 'styled-components'

export function DateTimeCol({
  dateString,
}: {
  dateString: string | null | undefined
}) {
  const theme = useTheme()

  if (!dateString) {
    return null
  }
  const date = moment(dateString)
  const formattedDate = date.format('MM/DD/YY')
  const formattedTime = date.format('h:mma')

  return (
    <div css={{ display: 'flex', flexDirection: 'column' }}>
      <p css={{ ...theme.partials.text.body2 }}>{formattedDate}</p>
      <p
        css={{
          ...theme.partials.text.caption,
          color: theme.colors['text-xlight'],
        }}
      >
        {formattedTime}
      </p>
    </div>
  )
}
