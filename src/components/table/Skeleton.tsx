import styled from 'styled-components'

function SkeletonUnstyled({ ...props }) {
  return (
    <div {...props}>
      <span />
    </div>
  )
}

export const Skeleton = styled(SkeletonUnstyled)(({ theme }) => ({
  '@keyframes moving-gradient': {
    '0%': { backgroundPosition: '-250px 0' },
    '100%': { backgroundPosition: '250px 0' },
  },
  width: '100%',
  span: {
    borderRadius: theme.borderRadiuses.medium,
    minWidth: '150px',
    display: 'block',
    height: '12px',
    background: `linear-gradient(to right, ${theme.colors.border} 20%, ${theme.colors['border-fill-two']} 50%, ${theme.colors.border} 80%)`,
    backgroundSize: '500px 100px',
    animation: 'moving-gradient 2s infinite linear forwards',
  },
}))
