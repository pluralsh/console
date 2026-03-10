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
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { WorkbenchToolForm } from './WorkbenchToolForm'

export const WORKBENCHES_TOOLS_TYPE_PARAM = 'type'

export function WorkbenchToolCreateOrEdit({
  mode,
}: {
  mode: 'create' | 'edit'
}) {
  const id = useParams()[WORKBENCHES_TOOLS_PARAM_ID]
  const [searchParams, setSearchParams] = useSearchParams()

  const { data, loading, error } = useWorkbenchToolQuery({
    variables: { id },
    skip: mode === 'create' || !id,
    fetchPolicy: 'network-only',
  })

  const tool = data?.workbenchTool
  const isLoading = !tool && loading

  useLayoutEffect(() => {
    if (isLoading) return
    const typeParam = searchParams.get(WORKBENCHES_TOOLS_TYPE_PARAM)
    if ((id && typeParam !== tool?.tool) || !isWorkbenchTool(typeParam))
      setSearchParams({
        [WORKBENCHES_TOOLS_TYPE_PARAM]: tool?.tool ?? WorkbenchToolType.Http,
      })
  }, [id, searchParams, setSearchParams, tool, isLoading])

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
        {!isLoading && (
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
        )}
      </StretchedFlex>
      {error && <GqlError error={error} />}
      {isLoading ? (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      ) : (
        <FormCardSC>
          <WorkbenchToolForm
            type={type}
            tool={tool}
          />
        </FormCardSC>
      )}
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
