import { Flex, IconFrame } from '@pluralsh/design-system'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { useWorkbenchToolQuery, WorkbenchToolType } from 'generated/graphql'
import { capitalize } from 'lodash'
import { useLayoutEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { WORKBENCHES_TOOLS_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { FormCardSC } from '../workbench/create-edit/WorkbenchCreateOrEdit'
import { isWorkbenchTool, WorkbenchToolIcon } from './WorkbenchTool'

export const WORKBENCHES_TOOLS_TYPE_PARAM = 'type'

export function WorkbenchToolCreateOrEdit({
  mode,
}: {
  mode: 'create' | 'edit'
}) {
  const id = useParams()[WORKBENCHES_TOOLS_PARAM_ID]
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    data: _d,
    loading: _l,
    error: _e,
  } = useWorkbenchToolQuery({
    variables: { id },
    skip: mode === 'create' || !id,
    fetchPolicy: 'network-only',
  })

  useLayoutEffect(() => {
    if (!isWorkbenchTool(searchParams.get(WORKBENCHES_TOOLS_TYPE_PARAM)))
      setSearchParams({
        [WORKBENCHES_TOOLS_TYPE_PARAM]: WorkbenchToolType.Http,
      })
  }, [searchParams, setSearchParams])

  const type = (searchParams.get(WORKBENCHES_TOOLS_TYPE_PARAM) ??
    '') as WorkbenchToolType // the effect above ensures this type is valid

  return (
    <WrapperSC>
      <StretchedFlex>
        <StackedText
          first={mode === 'create' ? 'New tool' : 'Edit tool'}
          firstPartialType="subtitle1"
          firstColor="text"
          second="Integrate external observability provider tools with your workbenches"
          secondPartialType="body1"
          gap="xsmall"
        />
        <Flex
          gap="xsmall"
          align="center"
        >
          <IconFrame
            circle
            type="secondary"
            icon={<WorkbenchToolIcon type={type} />}
            textValue={capitalize(type)}
          />
          <Subtitle1H1 as="h3">
            {capitalize(type === WorkbenchToolType.Http ? 'Custom' : type)}
          </Subtitle1H1>
        </Flex>
      </StretchedFlex>
      <FormCardSC></FormCardSC>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: theme.spacing.large,
  height: '100%',
  width: '100%',
  maxWidth: 800,
}))
