import { useTheme } from 'styled-components'

export default function ChatbotPanelExamplePrompts() {
  const theme = useTheme()

  return (
    <div
      css={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflowY: 'auto',
      }}
    >
      <div
        css={{
          backdropFilter: 'blur(12px)',
          padding: theme.spacing.medium,
        }}
      >
        overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
        <br /> overlay
      </div>
    </div>
  )
}
