function getRelativeOvershoots(parent: Element, child: Element) {
  const overshoot = {
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
  }
  const parentR = parent.getBoundingClientRect()
  const childR = child.getBoundingClientRect()

  const hScrollWidth = parentR.width - parent.clientWidth
  const vScrollWidth = parentR.height - parent.clientHeight

  overshoot.top = parentR.top - childR.top
  overshoot.bottom = childR.bottom - parentR.bottom + vScrollWidth
  overshoot.left = parentR.left - childR.left
  overshoot.right = childR.right - parentR.right + hScrollWidth

  return overshoot
}

type Behavior = 'smooth' | 'auto'
type ScrollToPosition = 'start' | 'center' | 'end' | 'nearest'

type Config = {
  behavior?: Behavior
  block?: ScrollToPosition
  inline?: 'start' | 'center' | 'end' | 'nearest'
  blockOffset?: number
  inlineOffset?: number
  preventIfVisible?: boolean
}

function getNewScrollPos({
  overshootStart,
  overshootEnd,
  curScrollPos,
  scrollToPos,
  offset = 0,
}: {
  overshootStart?: number
  overshootEnd?: number
  curScrollPos?: number
  scrollToPos?: ScrollToPosition
  offset?: number
}) {
  let newScrollPos = curScrollPos

  if (scrollToPos === 'nearest') {
    if (overshootStart > overshootEnd) {
      scrollToPos = 'start'
    } else {
      scrollToPos = 'end'
    }
  }

  if (scrollToPos === 'start') {
    newScrollPos = curScrollPos - overshootStart - offset
  } else if (scrollToPos === 'end') {
    newScrollPos = curScrollPos + overshootEnd + offset
  } else if (scrollToPos === 'center') {
    newScrollPos = curScrollPos - (overshootStart - overshootEnd) * 0.5
  }

  return newScrollPos
}

function scrollIntoContainerView(
  child: Element,
  parent: Element,
  config: Config
) {
  config = {
    ...{
      blockOffset: 0,
      inlineOffset: 0,
    },
    ...config,
  }
  const {
    block,
    inline,
    behavior,
    blockOffset,
    inlineOffset,
    preventIfVisible,
  } = config
  const overshoot = getRelativeOvershoots(parent, child)

  const scrollToOptions: {
    top?: number
    left?: number
    behavior?: Behavior
  } = {}

  if (behavior) {
    scrollToOptions.behavior = behavior
  }
  if (
    block &&
    !(preventIfVisible && overshoot.top <= 0 && overshoot.bottom <= 0)
  ) {
    scrollToOptions.top = getNewScrollPos({
      overshootStart: overshoot.top,
      overshootEnd: overshoot.bottom,
      curScrollPos: parent.scrollTop,
      scrollToPos: block,
      offset: blockOffset,
    })
  }
  if (
    inline &&
    !(preventIfVisible && overshoot.left <= 0 && overshoot.right <= 0)
  ) {
    scrollToOptions.left = getNewScrollPos({
      overshootStart: overshoot.left,
      overshootEnd: overshoot.right,
      curScrollPos: parent.scrollLeft,
      scrollToPos: inline,
      offset: inlineOffset,
    })
  }

  parent.scrollTo(scrollToOptions)
}

export default scrollIntoContainerView
