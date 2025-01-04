import {
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'
import styled from 'styled-components'

type SidebarLayout = 'vertical' | 'horizontal'
type SidebarVariant = 'app' | 'console'

type SidebarBaseProps = {
  layout?: SidebarLayout
  variant: SidebarVariant
  isExpanded?: boolean
  setIsExpanded?: Dispatch<SetStateAction<boolean>>
}
type SidebarProps = SidebarBaseProps & Partial<ComponentProps<typeof SidebarSC>>

export const SIDEBAR_WIDTH = 64
const SIDEBAR_HEIGHT = 56

const SidebarContext = createContext<SidebarBaseProps | null>(null)
const useSidebar = () => {
  const ctx = useContext(SidebarContext)

  if (!ctx) {
    throw new Error('useSidebar() must be used within a <Sidebar> component')
  }

  return ctx
}

const SidebarSC = styled.div<{
  $isHorizontal: boolean
  $variant: SidebarVariant
}>(({ theme, $variant, $isHorizontal }) => ({
  display: 'flex',
  flexDirection: $isHorizontal ? 'row' : 'column',
  flexGrow: 1,
  justifyContent: 'flex-start',
  height: $isHorizontal ? SIDEBAR_HEIGHT : '100%',
  width: $isHorizontal ? '100%' : SIDEBAR_WIDTH,
  maxWidth: $isHorizontal ? '100%' : SIDEBAR_WIDTH,
  minWidth: $isHorizontal ? '100%' : SIDEBAR_WIDTH,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-one']
      : $variant === 'console'
      ? theme.colors.grey[950]
      : theme.colors['fill-one'],
  borderBottom: $isHorizontal ? theme.borders.default : 'none',
  overflow: 'visible',
}))

function Sidebar({
  layout = 'vertical',
  variant = 'app',
  ...props
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  const contextVal = useMemo(
    () => ({
      layout,
      variant,
      isExpanded,
      setIsExpanded,
    }),
    [layout, variant, isExpanded, setIsExpanded]
  )

  return (
    <SidebarContext.Provider value={contextVal}>
      <SidebarSC
        $isHorizontal={layout === 'horizontal'}
        $variant={variant}
        {...props}
      />
    </SidebarContext.Provider>
  )
}

export default Sidebar
export { useSidebar }
export type { SidebarLayout, SidebarVariant }
