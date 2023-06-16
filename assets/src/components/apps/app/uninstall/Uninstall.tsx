import { Button, Card, Input } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { BuildType, useCreateBuildMutation } from 'generated/graphql'
import { Flex, P } from 'honorable'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function Uninstall() {
  const navigate = useNavigate()
  const { appName } = useParams()
  const [confirm, setConfirm] = useState('')
  const [mutation, { error }] = useCreateBuildMutation({
    variables: {
      attributes: {
        repository: appName!,
        type: BuildType.Destroy,
      },
    },
    onCompleted: ({ createBuild }) =>
      createBuild && navigate(`/builds/${createBuild.id}`),
  })

  return (
    <ScrollablePage
      scrollable={false}
      heading="Uninstall"
    >
      <Card
        padding="large"
        overflowY="auto"
        maxHeight="100%"
      >
        <Flex
          direction="column"
          gap="small"
        >
          {error && (
            <GqlError
              header="Failed to create build"
              error={error}
            />
          )}
          <P
            body1
            fontWeight={600}
          >
            Uninstall {appName}
          </P>
          <P
            body2
            color="text-light"
          >
            To uninstall the application, type the application’s name {appName}{' '}
            to confirm. This is action is <b>destructive</b> and can result in
            underlying data from the application being deleted.
          </P>
          <Flex
            direction="row"
            alignItems="center"
            gap="small"
          >
            <Input
              value={confirm}
              onChange={({ target: { value } }) => setConfirm(value)}
              width="100%"
              placeholder={appName}
              maxWidth={400}
            />
            <Button
              destructive
              disabled={confirm !== appName}
              onClick={() => mutation()}
            >
              Uninstall
            </Button>
          </Flex>
        </Flex>
      </Card>
    </ScrollablePage>
  )
}
