// forked from https://github.com/pluralsh/forge-core/blob/main/src/components/CellMeasurer.js
// only so we could remove forge-core and grommet
// this is only used by the old scroller component, which should be deprecated replaced with a table at some point

import * as React from 'react'
import { findDOMNode } from 'react-dom'

/**
 * Wraps a cell and measures its rendered content.
 * Measurements are stored in a per-cell cache.
 * Cached-content is not be re-measured.
 */
export class CellMeasurer extends React.PureComponent {
  static __internalCellMeasurerFlag = false

  _child = null

  componentDidMount() {
    this.refreshOn = null
    this._maybeMeasureCell()
  }

  componentDidUpdate() {
    this._maybeMeasureCell()
  }

  render() {
    const { children } = this.props

    return typeof children === 'function'
      ? children({
          measure: this._measure,
          registerChild: this._registerChild,
        })
      : children
  }

  _getCellMeasurements() {
    // eslint-disable-next-line react/no-find-dom-node
    const node = this._child || findDOMNode(this)

    // TODO Check for a bad combination of fixedWidth and missing numeric width or vice versa with height

    if (
      node &&
      node.ownerDocument &&
      node.ownerDocument.defaultView &&
      node instanceof node.ownerDocument.defaultView.HTMLElement
    ) {
      const styleWidth = node.style.width
      const styleHeight = node.style.height

      // If we are re-measuring a cell that has already been measured,
      // It will have a hard-coded width/height from the previous measurement.
      // The fact that we are measuring indicates this measurement is probably stale,
      // So explicitly clear it out (eg set to "auto") so we can recalculate.
      // See issue #593 for more info.
      // Even if we are measuring initially- if we're inside of a MultiGrid component,
      // Explicitly clear width/height before measuring to avoid being tainted by another Grid.
      // eg top/left Grid renders before bottom/right Grid
      // Since the CellMeasurerCache is shared between them this taints derived cell size values.
      // if (!cache.hasFixedWidth()) {
      //   node.style.width = 'auto';
      // }
      node.style.height = 'auto'

      const height = Math.ceil(node.offsetHeight)
      const width = Math.ceil(node.offsetWidth)

      // Reset after measuring to avoid breaking styles; see #660
      if (styleWidth) {
        node.style.width = styleWidth
      }
      if (styleHeight) {
        node.style.height = styleHeight
      }

      return { height, width }
    }

    return { height: 0, width: 0 }
  }

  _maybeMeasureCell() {
    const { rowIndex = this.props.index || 0, refreshKey, setSize } = this.props

    if (this.refreshOn !== refreshKey) {
      this.refreshOn = refreshKey
      const { height } = this._getCellMeasurements()

      setSize(rowIndex, height)

      // // If size has changed, let Grid know to re-render.
      // if (
      //   parent &&
      //   typeof parent.invalidateCellSizeAfterRender === 'function'
      // ) {
      //   parent.invalidateCellSizeAfterRender({
      //     columnIndex,
      //     rowIndex,
      //   });
      // }
    }
  }

  _measure = () => {
    const { rowIndex = this.props.index || 0, setSize } = this.props

    const { height } = this._getCellMeasurements()

    setSize(rowIndex, height)
  }

  _registerChild = (element) => {
    if (element && !(element instanceof Element)) {
      console.warn(
        'CellMeasurer registerChild expects to be passed Element or null'
      )
    }
    this._child = element
    if (element) {
      this._maybeMeasureCell()
    }
  }
}
