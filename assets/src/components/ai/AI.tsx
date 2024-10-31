import { Button, Flex, GearTrainIcon } from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { useNavigate } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from '../../routes/settingsRoutesConst.tsx'
import { AIPinTable } from './AIPinTable.tsx'
import { AIThreadsTable } from './AIThreadsTable.tsx'

export default function AI() {
  return (
    <Flex
      direction="column"
      gap="medium"
      padding="large"
      marginBottom={30}
      height="100%"
      overflow="hidden"
    >
      <Header />
      <Flex
        direction="column"
        gap="xlarge"
        height="100%"
      >
        <PinnedSection />
        <AllThreadsSection />
      </Flex>
    </Flex>
  )
}

function Header() {
  const navigate = useNavigate()
  return (
    <Flex
      justify="space-between"
      align="center"
    >
      <StackedText
        first="Plural AI"
        second="View ongoing threads and saved insights at a glance."
        firstPartialType="subtitle1"
        secondPartialType="body2"
      />
      <Button
        secondary
        startIcon={<GearTrainIcon />}
        onClick={() => navigate(`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`)}
      >
        Settings
      </Button>
    </Flex>
  )
}

function PinnedSection() {
  return (
    <Flex
      direction="column"
      gap="medium"
      maxHeight="40%"
    >
      <StackedText
        first="Pinned"
        second="Pin important threads and insights"
        firstPartialType="subtitle2"
        secondPartialType="body2"
      />
      <AIPinTable />
    </Flex>
  )
}

function AllThreadsSection() {
  return (
    <Flex
      direction="column"
      gap="medium"
      flex={1}
      overflow="hidden"
      paddingBottom={36} // this is a magic number to make the table fit
    >
      <StackedText
        first="All threads"
        firstPartialType="subtitle2"
      />
      <AIThreadsTable />
    </Flex>
  )
}
