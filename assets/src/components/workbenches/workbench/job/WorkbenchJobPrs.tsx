import {
  Accordion,
  AccordionItem,
  ArrowTopRightIcon,
  Flex,
  IconFrame,
  prettifyRepoUrl,
  PrOpenIcon,
} from '@pluralsh/design-system'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2BoldP } from 'components/utils/typography/Text'
import { PullRequestBasicFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'

import { Link } from 'react-router-dom'

export function WorkbenchJobPrs({ prs }: { prs: PullRequestBasicFragment[] }) {
  if (isEmpty(prs)) return null
  return (
    <Accordion
      type="single"
      defaultValue="prs"
      css={{ background: 'none' }}
    >
      <AccordionItem
        value="prs"
        trigger={
          <StackedText
            icon={
              <IconFrame
                circle
                type="secondary"
                icon={<PrOpenIcon />}
              />
            }
            first={<Body2BoldP>Generated pull requests</Body2BoldP>}
          />
        }
      >
        <Flex
          direction="column"
          gap="medium"
        >
          {prs.map((pr) => (
            <StretchedFlex
              key={pr.id}
              gap="large"
            >
              <StackedText
                truncate
                first={prettifyRepoUrl(pr.url, true)}
                firstPartialType="body2"
                firstColor="text"
                second={pr.title}
              />
              <IconFrame
                clickable
                as={Link}
                to={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                icon={<ArrowTopRightIcon color="icon-light" />}
              />
            </StretchedFlex>
          ))}
        </Flex>
      </AccordionItem>
    </Accordion>
  )
}
