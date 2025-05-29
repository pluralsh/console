import { ArrowTopRightIcon, Button, Flex } from '@pluralsh/design-system'
import { Body1P } from 'components/utils/typography/Text'
import { use, useLayoutEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CloudWelcomeCtx, CloudWelcomeStep } from '../CloudConsoleWelcomeModal'

const DOCS_URL = 'https://docs.plural.sh/getting-started/how-to-use'

export function LearnStep() {
  const navigate = useNavigate()
  const { setModalActions, setStep, setOpen } = use(CloudWelcomeCtx)

  useLayoutEffect(() => {
    setModalActions(
      <Flex gap="medium">
        <Button
          secondary
          onClick={() => setStep(CloudWelcomeStep.Authenticate)}
        >
          Back
        </Button>
        <Button
          floating
          onClick={() => {
            setOpen(false)
            navigate('/')
          }}
        >{`I'm all done!`}</Button>
      </Flex>
    )
  }, [navigate, setModalActions, setOpen, setStep])

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Body1P css={{ textWrap: 'pretty' }}>
        {`Your Console is all set and ready to use! Before proceeding it may be
        helpful to review the "How to use Plural" section of our documentation.`}
      </Body1P>
      <Button
        as={Link}
        rel="noreferrer"
        target="_blank"
        to={DOCS_URL}
        endIcon={<ArrowTopRightIcon />}
      >
        Go to Docs
      </Button>
    </Flex>
  )
}
