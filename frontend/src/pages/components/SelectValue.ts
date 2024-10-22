import { app } from '@/main'
import { BaseEditor } from 'handsontable/editors'
import { h, render } from 'vue'

export const createComponent = (component, props, parent, slots = {}) => {
  const vNode = h(component, props, slots)

  vNode.appContext = app._context
  render(vNode, parent)

  return vNode.component
}

export class ValueEditor extends BaseEditor {
  init() {
    // Create detached node, add CSS class and make sure its not visible
    this.select = this.hot.rootDocument.createElement('SELECT')
    this.select.classList.add('htSelectEditor')
    this.select.style.display = 'none'
    this.select.style.color = 'black'
    this.select.style.background = 'transparent'

    this.select.addEventListener('change', ev => {
      ev.stopImmediatePropagation()

      ev.preventDefault()

      this.finishEditing(false, true, () => {
        nextTick(() => {
          this.getEditedCell().focus()
        })
      })
    })

    // Attach node to DOM, by appending it to the container holding the table
    this.hot.rootElement.appendChild(this.select)
  }

  // Create options in prepare() method
  prepare(row, col, prop, td, originalValue, cellProperties) {
    // Remember to invoke parent's method
    super.prepare(row, col, prop, td, originalValue, cellProperties)

    const selectOptions = this.cellProperties.selectOptions
    let options

    if (typeof selectOptions === 'function')
      options = this.prepareOptions(selectOptions(this.row, this.col, this.prop))
    else
      options = this.prepareOptions(selectOptions)

    this.select.innerText = ''

    Object.keys(options).forEach(key => {
      const optionElement = this.hot.rootDocument.createElement('OPTION')

      optionElement.style.color = '#373737'

      optionElement.value = key
      optionElement.innerText = options[key]
      this.select.appendChild(optionElement)
    })
  }

  prepareOptions(optionsToPrepare) {
    let preparedOptions = {}

    if (Array.isArray(optionsToPrepare)) {
      for (let i = 0, len = optionsToPrepare.length; i < len; i++)
        preparedOptions[optionsToPrepare[i]] = optionsToPrepare[i]
    }
    else if (typeof optionsToPrepare === 'object') {
      preparedOptions = optionsToPrepare
    }

    return preparedOptions
  }

  getValue() {
    return this.select.value
  }

  setValue(value) {
    this.select.value = value
  }

  open() {
    const {
      top,
      start,
      width,
      height,
    } = this.getEditedCellRect()

    this.addHook('beforeKeyDown', () => this.onBeforeKeyDown())

    const selectStyle = this.select.style

    this.getEditedCell().innerText = ''

    this._opened = true

    selectStyle.height = `${height}px`
    selectStyle.minWidth = `${width}px`
    selectStyle.top = `${top}px`
    selectStyle[this.hot.isRtl() ? 'right' : 'left'] = `${start}px`
    selectStyle.margin = '0px'
    selectStyle.display = ''
  }

  focus() {
    this.select.focus()
  }

  close() {
    this._opened = false

    this.clearHooks()

    this.select.style.display = 'none'
  }

  onBeforeKeyDown() {
    const previousOptionIndex = this.select.selectedIndex - 1
    const nextOptionIndex = this.select.selectedIndex + 1

    switch (event.keyCode) {
      case 38: // Arrow Up
        if (previousOptionIndex >= 0)
          this.select[previousOptionIndex].selected = true

        event.stopImmediatePropagation()
        event.preventDefault()
        break;

      case 40: // Arrow Down
        if (nextOptionIndex <= this.select.length - 1)
          this.select[nextOptionIndex].selected = true

        event.stopImmediatePropagation()
        event.preventDefault()
        break;

      default:
        break;
    }
  }
}
