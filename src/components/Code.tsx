import {
  type ComponentProps,
  type MutableRefObject,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button, Div, Flex } from 'honorable'
import styled, { useTheme } from 'styled-components'

import useResizeObserver from '../hooks/useResizeObserver'

import CopyIcon from './icons/CopyIcon'
import Card, { type CardProps } from './Card'
import CheckIcon from './icons/CheckIcon'
import Highlight from './Highlight'
import {
  type FillLevel,
  FillLevelProvider,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'
import FileIcon from './icons/FileIcon'
import { TabList, type TabListStateProps } from './TabList'
import { SubTab } from './SubTab'
import TabPanel from './TabPanel'
import { Select } from './Select'
import { ListBoxItem } from './ListBoxItem'
import DropdownArrowIcon from './icons/DropdownArrowIcon'

type CodeProps = Omit<CardProps, 'children'> & {
  children?: string
  language?: string
  showLineNumbers?: boolean
  showHeader?: boolean
  tabs?: CodeTabData[]
  title?: ReactNode
  onSelectedTabChange?: (key: string) => void
}

type TabInterfaceT = 'tabs' | 'dropdown'

type TabsContext = {
  tabInterface: TabInterfaceT
  setTabInterface: (arg: TabInterfaceT) => void
  tabStateRef?: MutableRefObject<any>
  selectedKey?: string
  onSelectionChange?: any
} & Pick<CodeProps, 'tabs'>

const TabsContext = createContext<TabsContext>({
  setTabInterface: () => {},
  tabInterface: 'tabs',
})

function CodeHeaderUnstyled({
  fillLevel,
  ...props
}: PropsWithChildren<ComponentProps<'div'>> & { fillLevel: FillLevel }) {
  return (
    <FillLevelProvider value={toFillLevel(fillLevel + 2)}>
      <div {...props} />
    </FillLevelProvider>
  )
}

const CodeHeader = styled(CodeHeaderUnstyled)<{ $visuallyHidden?: boolean }>(
  ({ $visuallyHidden = false, fillLevel, theme }) => ({
    minHeight: theme.spacing.xlarge + theme.spacing.xsmall * 2,
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    borderBottom:
      fillLevel >= 1 ? theme.borders['fill-three'] : theme.borders['fill-two'],
    backgroundColor:
      fillLevel >= 1 ? theme.colors['fill-three'] : theme.colors['fill-two'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.medium,
    borderTopLeftRadius: theme.borderRadiuses.medium + 2,
    borderTopRightRadius: theme.borderRadiuses.medium + 2,
    ...($visuallyHidden
      ? {
          pointerEvents: 'none',
          height: 0,
          opacity: 0,
          overflow: 'hidden',
          minHeight: 0,
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
        }
      : {}),
  })
)

function CopyButtonBase({
  copied,
  handleCopy,
  className,
}: {
  copied: boolean
  handleCopy: () => any
  className?: string
}) {
  return (
    <Button
      className={className}
      position="absolute"
      floating
      small
      startIcon={copied ? <CheckIcon /> : <CopyIcon />}
      onClick={handleCopy}
    >
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
const CopyButton = styled(CopyButtonBase)<{ verticallyCenter: boolean }>(
  ({ verticallyCenter, theme }) => ({
    position: 'absolute',
    right: theme.spacing.medium,
    top: verticallyCenter ? '50%' : theme.spacing.medium,
    transform: verticallyCenter ? 'translateY(-50%)' : 'none',
    boxShadow: theme.boxShadows.slight,
  })
)

type CodeTabData = {
  key: string
  label?: string
  language?: string
  content: string
}

const TitleArea = styled.div<{ $shrinkable: boolean }>(
  ({ $shrinkable, theme }) => ({
    display: 'flex',
    flexShrink: $shrinkable ? 1 : 0,
    flexGrow: 1,
    gap: theme.spacing.xsmall,
    ...theme.partials.text.overline,
    color: 'text-light',
  })
)

const tabsWrapMargin = 5
const TabsWrap = styled.div<{ $isDisabled: boolean }>(
  ({ $isDisabled, theme: _ }) => ({
    flexShrink: 1,
    overflow: 'hidden',
    margin: -tabsWrapMargin,
    padding: tabsWrapMargin,
    ...($isDisabled ? { opacity: 0.0, height: 0 } : {}),
  })
)

const TabsDropdownButton = styled(
  forwardRef<any, any>((props, ref) => {
    const fillLevel = useFillLevel()
    const theme = useTheme()

    return (
      <Button
        ref={ref}
        small
        tertiary
        endIcon={<DropdownArrowIcon className="dropdownIcon" />}
        {...{
          '&, &:hover, &:focus, &:focus-visible': {
            backgroundColor:
              theme.colors[`fill-${fillLevel > 2 ? 'three' : 'two'}-selected`],
          },
        }}
        {...props}
      />
    )
  })
)<{ isOpen?: boolean }>(({ isOpen = false, theme }) => ({
  '.dropdownIcon': {
    transform: isOpen ? 'scaleY(-1)' : 'scaleY(1)',
    transition: 'transform 0.1s ease',
  },
  backgroundColor: theme.colors['fill-one'],
}))

function CodeTabs() {
  const {
    tabInterface,
    setTabInterface,

    tabStateRef,
    tabs,
    selectedKey,
    onSelectionChange,
  } = useContext(TabsContext)
  const tabsRef = useRef<HTMLDivElement>()
  const tabsWrapRef = useRef<HTMLDivElement>()
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation: 'horizontal',
    selectedKey,
    onSelectionChange,
    isDisabled: tabInterface !== 'tabs',
  }

  useResizeObserver(
    tabsRef,
    useCallback(() => {
      const scrollWidth = tabsRef?.current?.scrollWidth
      const clientWidth = tabsRef?.current?.clientWidth

      if (typeof scrollWidth === 'number' && typeof clientWidth === 'number') {
        if (clientWidth - scrollWidth < 0) {
          setTabInterface('dropdown')
        } else {
          setTabInterface('tabs')
        }
      }
    }, [setTabInterface])
  )

  return (
    <TabsWrap
      ref={tabsWrapRef}
      $isDisabled={tabListStateProps.isDisabled}
    >
      <TabList
        className="my-tab-list"
        stateRef={tabStateRef}
        stateProps={tabListStateProps}
        ref={tabsRef}
        style={!tabInterface ? { opacity: 0 } : undefined}
      >
        {tabs.map((tab) => {
          if (typeof tab.content !== 'string') {
            throw new Error(
              'Code component expects a string for tabs[].content'
            )
          }

          return (
            <SubTab
              key={tab.key}
              size="small"
              textValue={tab.label || tab.language}
            >
              {tab.label || tab.language}
            </SubTab>
          )
        })}
      </TabList>
    </TabsWrap>
  )
}

function CodeSelectUnstyled({ className }: ComponentProps<'div'>) {
  const { tabs, selectedKey, onSelectionChange } = useContext(TabsContext)

  const selectedTab = tabs.find((tab) => tab.key === selectedKey) || tabs[0]

  return (
    <div className={className}>
      <Select
        selectedKey={selectedKey}
        onSelectionChange={onSelectionChange}
        width="max-content"
        placement="right"
        triggerButton={
          <TabsDropdownButton>{selectedTab.label} </TabsDropdownButton>
        }
      >
        {tabs.map((tab) => (
          <ListBoxItem
            key={tab.key}
            label={tab.label || tab.language}
            textValue={tab.label || tab.language}
          />
        ))}
      </Select>
    </div>
  )
}
const CodeSelect = styled(CodeSelectUnstyled)<{ $isDisabled?: boolean }>(
  ({ $isDisabled: _, theme: _t }) => ({
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'right',
  })
)

function CodeContent({
  children,
  hasSetHeight,
  ...props
}: ComponentProps<typeof Highlight> & { hasSetHeight: boolean }) {
  const [copied, setCopied] = useState(false)
  const codeString = children?.trim() || ''
  const multiLine = !!codeString.match(/\r?\n/) || hasSetHeight
  const handleCopy = useCallback(
    () =>
      window.navigator.clipboard
        .writeText(codeString)
        .then(() => setCopied(true)),
    [codeString]
  )

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1000)

      return () => clearTimeout(timeout)
    }
  }, [copied])

  if (typeof children !== 'string') {
    throw new Error('Code component expects a string as its children')
  }

  return (
    <Div
      height="100%"
      overflow="auto"
      alignItems="center"
    >
      <CopyButton
        copied={copied}
        handleCopy={handleCopy}
        verticallyCenter={!multiLine}
      />
      <Div
        paddingHorizontal="medium"
        paddingVertical={multiLine ? 'medium' : 'small'}
      >
        <Highlight {...props}>{codeString}</Highlight>
      </Div>
    </Div>
  )
}

function CodeRef(
  {
    children,
    language,
    showLineNumbers,
    showHeader,
    tabs,
    title,
    onSelectedTabChange,
    ...props
  }: CodeProps,
  ref: RefObject<any>
) {
  const parentFillLevel = useFillLevel()
  const tabStateRef = useRef()
  const [selectedTabKey, setSelectedTabKey] = useState<string>(
    tabs?.[0]?.key || ''
  )
  const theme = useTheme()
  const [tabInterface, setTabInterface] = useState<TabInterfaceT>()

  props.height = props.height || undefined
  const hasSetHeight = !!props.height || !!props.minHeight

  showHeader = tabs ? true : showHeader === undefined ? !!language : showHeader

  const uiContext: TabsContext = useMemo(
    () => ({
      tabInterface,
      setTabInterface,
      tabs,
      tabStateRef,
      selectedKey: selectedTabKey,
      onSelectionChange: (key: string) => {
        setSelectedTabKey(key)
        if (typeof onSelectedTabChange === 'function') {
          onSelectedTabChange(key)
        }
      },
    }),
    [onSelectedTabChange, selectedTabKey, tabInterface, setTabInterface, tabs]
  )

  const titleArea =
    (tabs && title) || !tabs ? (
      <TitleArea $shrinkable={tabInterface === 'dropdown' || !tabs}>
        <FileIcon />
        {(title || language) && <div>{title || language}</div>}
      </TitleArea>
    ) : undefined

  const content = (
    <Card
      ref={ref}
      fillLevel={toFillLevel(Math.min(parentFillLevel + 1, 2))}
      borderColor={
        parentFillLevel >= 1
          ? theme.colors['border-fill-three']
          : theme.colors['border-fill-two']
      }
      {...props}
    >
      <Flex
        position="relative"
        direction="column"
        height="100%"
      >
        {showHeader && (
          <>
            <CodeHeader
              fillLevel={parentFillLevel}
              $visuallyHidden={tabInterface === 'dropdown'}
            >
              {titleArea}
              {tabs && <CodeTabs />}
            </CodeHeader>
            {tabInterface === 'dropdown' && (
              <CodeHeader fillLevel={parentFillLevel}>
                {titleArea}
                <CodeSelect />
              </CodeHeader>
            )}
          </>
        )}
        {tabs ? (
          tabs.map((tab) => (
            <TabPanel
              key={tab.key}
              tabKey={tab.key}
              mode="multipanel"
              stateRef={tabStateRef}
              as={
                <Div
                  position="relative"
                  height="100%"
                  overflow="hidden"
                />
              }
            >
              <CodeContent
                language={tab.language}
                showLineNumbers={showLineNumbers}
                hasSetHeight={hasSetHeight}
              >
                {tab.content}
              </CodeContent>
            </TabPanel>
          ))
        ) : (
          <Div
            position="relative"
            height="100%"
            overflow="hidden"
          >
            <CodeContent
              language={language}
              showLineNumbers={showLineNumbers}
              hasSetHeight={hasSetHeight}
            >
              {children}
            </CodeContent>
          </Div>
        )}
      </Flex>
    </Card>
  )

  return (
    <TabsContext.Provider value={uiContext}>{content}</TabsContext.Provider>
  )
}

const Code = styled(forwardRef(CodeRef))((_) => ({
  [`${CopyButton}`]: {
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease',
  },
  [`&:hover ${CopyButton}`]: {
    opacity: 1,
    pointerEvents: 'auto',
    transition: 'opacity 0.2s ease',
  },
}))

export default Code
export type { CodeProps }
