import { Accordion, AccordionItem, Checkbox } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { Dispatch, SetStateAction } from 'react'
import { produce } from 'immer'

export type CatalogsFilter = {
  key: string
  items: number
}

export function CatalogsFilters({
  authors,
  authorFilters,
  setAuthorFilters,
  categories,
  categoryFilters,
  setCategoryFilters,
}: {
  authors: CatalogsFilter[]
  authorFilters: string[]
  setAuthorFilters: Dispatch<SetStateAction<string[]>>
  categories: CatalogsFilter[]
  categoryFilters: string[]
  setCategoryFilters: Dispatch<SetStateAction<string[]>>
}) {
  const theme = useTheme()

  return (
    <Accordion
      type="multiple"
      width={220}
    >
      <AccordionItem
        trigger={`Authors (${authors.length})`}
        css={{ borderBottom: theme.borders['fill-two'] }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            rowGap: theme.spacing.xxsmall,
          }}
        >
          {authors.map(({ key }) => (
            <Checkbox
              small
              checked={authorFilters.includes(key)}
              onChange={() => {
                const i = authorFilters.indexOf(key)

                if (i > -1) {
                  setAuthorFilters((f) =>
                    produce(f, (draft) => {
                      draft.splice(i, 1)
                    })
                  )
                } else {
                  setAuthorFilters([...authorFilters, key])
                }
              }}
            >
              {key}
            </Checkbox>
          ))}
        </div>
      </AccordionItem>
      <AccordionItem trigger={`Categories (${categories.length})`}>
        {categories.map(({ key, items }) => (
          <div>
            {key} ({items})
          </div>
        ))}
      </AccordionItem>
    </Accordion>
  )
}
