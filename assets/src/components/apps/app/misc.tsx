import {
  Card,
  CardProps,
  CaretRightIcon,
  IconFrame,
} from '@pluralsh/design-system'
import styled from 'styled-components'

import { ListItemBorder } from '../misc'

const LeftContainer = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
}))

const TitleContainer = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexGrow: 1,
  gap: theme.spacing.small,
}))

const Title = styled.div(({ theme }) => ({
  ...theme.partials.text.body1,
  fontWeight: 600,
}))

const Description = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
}))

const RightContainer = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  justifyContent: 'end',
  padding: theme.spacing.large,
}))

export function ListItem({
  title, description, icon, borderColor, chips, onClick, ...props
}: CardProps & {title: string, description?: string, icon?: any, borderColor?: string, chips?: any, onClick?: () => any},) {
  return (
    <Card
      clickable
      display="flex"
      flexGrow={1}
      marginBottom="small"
      minWidth={240}
      onClick={onClick}
      {...props}
    >
      <ListItemBorder color={borderColor} />
      <LeftContainer>
        {icon && (
          <IconFrame
            icon={icon}
            minWidth={40}
            size="large"
            textValue={title}
            type="floating"
          />
        )}
        <div>
          <TitleContainer>
            <Title>{title}</Title>
            {chips}
          </TitleContainer>
          <Description>{description}</Description>
        </div>
      </LeftContainer>
      <RightContainer><CaretRightIcon /></RightContainer>
    </Card>
  )
}
