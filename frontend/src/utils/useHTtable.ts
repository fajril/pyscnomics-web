import { useAppStore } from "@/stores/appStore"
import { BaseEditor, SelectEditor } from "handsontable/editors"
import { baseRenderer } from "handsontable/renderers"
import type { GridSettings } from "handsontable/settings"
import "tippy.js/dist/tippy.css"
import { useTippy } from "vue-tippy"
import { TableContextMenus } from "./pysc/pyscType"

export const useHTtable = (tableSett?: GridSettings, enumHintTipe: 'none' | 'header' | 'data' | 'all' = 'data') => {
  const TabelContainer = ref()
  const hotTableRef = ref()
  const hotInstance = computed(() => hotTableRef.value?.hotInstance)

  const extData = ref()

  const appStore = useAppStore()

  const tipTargetEl = ref()
  const tipContentEl = ref()

  const onGetHintTooltip = ref<((rowData: any, value: any, cellProperties: any, isHeader: boolean) => string | null) | null | undefined>()
  const onAfterValidate = ref<((isValid, value, row, prop) => void) | null | undefined>()

  const { x, y } = useWindowScroll()
  const { elementPositionX, elementPositionY, elementWidth, elementHeight } = useMouseInElement(tipTargetEl)

  const tippyCtrl = useTippy(tipTargetEl, {
    content: tipContentEl,
    animation: 'shift-away',
    delay: [500, null],
    duration: [500, 350],
    maxWidth: '800',
    hideOnClick: true,
    trigger: 'manual',
    moveTransition: 'transform 0.3s ease-out',

    getReferenceClientRect() {
      return {
        width: elementWidth.value,
        height: elementHeight.value,
        top: elementPositionY.value - y.value,
        right: elementPositionX.value - x.value,
        bottom: elementPositionY.value - y.value,
        left: elementPositionX.value - x.value,
      }
    },
  })

  class linkEditor extends BaseEditor {
    beginEditing(newInitialValue, event) {
      const rowData_ = this.hot.getSourceDataAtRow(this.cellProperties.row)
      if (this.cellProperties.linkAction)
        this.cellProperties.linkAction(this.TD, rowData_, this.cellProperties)
    }
  }

  const linkRenderer = (Instance, TD, row, col, prop, value, cellProperties) => {
    if (!(TD.querySelector('v-btn'))) {
      baseRenderer.apply(this, [Instance, TD, row, col, prop, value, cellProperties])
      if (!TD.classList.contains('htCenter'))
        TD.classList.add('htCenter')

      TD.innerHTML = ''

      const txtLink = cellProperties.linkText ?? 'Edit'
      const btnVariant = cellProperties.btnVariant ?? 'flat'
      const btnColor = cellProperties.btnColor ?? 'primary'

      const btn = Instance.rootDocument.createElement('button')

      btn.classList.add('v-btn')
      btn.classList.add('v-btn--block')
      btn.classList.add('px-0')
      btn.classList.add('v-theme--dark')
      btn.classList.add(`bg-${btnColor}`)
      btn.classList.add('v-btn--density-default')
      btn.classList.add('v-btn--size-x-small')
      btn.classList.add(`v-btn--variant-${btnVariant}`)
      btn.innerHTML = `<span class="v-btn__overlay"></span><span class="v-btn__underlay"></span><span class="v-btn__content" data-no-activator="">${txtLink}</span>`
      btn.addEventListener('click', ev => {
        ev.stopImmediatePropagation()
        ev.preventDefault()

        Instance.getActiveEditor().beginEditing(Instance.getDataAtCell(row, col), ev)
      })

      TD.appendChild(btn)
    }

    return TD
  }

  class comboEditor extends SelectEditor {
    getValue() {
      return +this.select.value
    }

    setValue(value) {
      this.select.value = +value
    }
  }

  const comboRenderer = (instance, td, row, col, prop, value, cellProperties) => {
    const comboCellValue = td.querySelector('.combo-cell-value')
    if (!comboCellValue) {
      if (!td.classList.contains('htLeft'))
        td.classList.add('htLeft')
      if (!td.classList.contains('text-truncate'))
        td.classList.add('text-truncate')
      if (!isNullOrUndefined(value) && !isEmpty(value)) {
        const valCb = (cellProperties.selectOptions?.length && isObject(cellProperties.selectOptions[0])) ? cellProperties.selectOptions[value] : value

        td.innerHTML = `<div class="combo-cell-ctrl d-flex w-100 justify-space-between"><span class="combo-cell-value text-truncate">${valCb}</span><span class="d-flex align-center text-secondary"><i class="tabler-caret-down-filled v-icon notranslate v-theme--dark v-icon--size-small"></i></span></div>`
      }
      else {
        td.innerHTML = null
      }
    }
    else if (!isNullOrUndefined(value) && !isEmpty(value)) {
      comboCellValue.innerText = (cellProperties.selectOptions?.length && isObject(cellProperties.selectOptions[0])) ? cellProperties.selectOptions[value] : value
    }
    else {
      comboCellValue.innerHTML = null
    }

    return td
  }

  const htTblSett = ref<GridSettings>({
    beforeCopy: (data, coords) => {
      if (data.length)
        data.splice(0, data.length, ...data.map(r => r.map(c => `${c ?? ''}`.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, " "))))
    },
    afterSelection: (row, column, row2, column2, preventScrolling, selectionLayerLevel) => {
      if (tippyCtrl.state.value.isShown) {
        tippyCtrl.hide()
        tipTargetEl.value = undefined
      }
    },
    afterGetCellMeta(ow, column, cellProperties) {
      if (cellProperties.useComboRender)
        cellProperties.renderer = comboRenderer
    },
    afterOnCellMouseOver(event, coords, TD) {
      if (enumHintTipe === 'none')
        return
      if (onGetHintTooltip.value) {
        event.stopImmediatePropagation()
        event.preventDefault()
        let hint_: string | null | undefined
        if (['data', 'all'].includes(enumHintTipe) && coords.col >= 0 && coords.row >= 0) {
          const cellProperties_ = hotInstance.value?.getCellMeta(coords.row, coords.col)

          const data_ = hotInstance.value?.getSourceDataAtRow(cellProperties_.row)
          const value_ = hotInstance.value?.getDataAtCell(cellProperties_.visualRow, cellProperties_.visualCol)

          hint_ = onGetHintTooltip.value(data_, value_, cellProperties_, false)
        }
        else if (['header', 'all'].includes(enumHintTipe) && (coords.col < 0 || coords.row < 0)) {
          hint_ = onGetHintTooltip.value(null, null, coords, true)
        }
        tipContentEl.value = hint_ ?? undefined

        if (!isEmpty(hint_)) {
          if (tipTargetEl.value !== TD) {
            tipTargetEl.value = TD
            tippyCtrl.refresh()
          }
          if (!tippyCtrl.state.value.isMounted)
            tippyCtrl.mount()
          if (!tippyCtrl.state.value.isEnabled)
            tippyCtrl.enable()

          if (!tippyCtrl.state.value.isShown)
            tippyCtrl.show()
          else
            tippyCtrl.tippy.value?.popperInstance?.update()
        }
        else {
          tippyCtrl.hide()
        }
      }
    },
    afterValidate(isValid, value, row, prop) {
      if (!isValid) {
        appStore.showAlert({
          text: `"${value}" Is invalid value`,
          isalert: true,
        })
      }
      else if (onAfterValidate.value) {
        onAfterValidate.value(isValid, value, row, prop)
      }

      return isValid
    },
    fillHandle: {
      autoInsertRow: false,
      direction: 'vertical',
    },

    contextMenu: TableContextMenus([{ name: 'copy' }, { name: 'copy_with_column_headers' }]),
    wordWrap: false,
    noWordWrapClassName: 'text-truncate',
    width: '100%',
    height: 'auto',

    mergeCells: true,
    stretchH: 'none',
    autoColumnSize: {
      syncLimit: '40%',
      useHeaders: true,
      samplingRatio: 10,
      allowSampleDuplicates: true,
    },
    manualColumnResize: true,
    rowHeaders: false,
    autoWrapCol: false,
    autoWrapRow: false,
    licenseKey: 'non-commercial-and-evaluation',

    ...(tableSett ?? {}),
  })

  const updateData = (data_: any) => {
    htTblSett.value.data = data_
    if (data_)
      hotInstance.value?.loadData(data_)
  }

  const updateSetting = () => {
    hotInstance.value?.updateSettings(htTblSett.value)
  }

  return {
    TabelContainer,
    hotTableRef,
    hotInstance,

    extData,

    htTblSett,
    updateData,
    updateSetting,
    onGetHintTooltip,
    onAfterValidate,

    comboEditor,
    comboRenderer,

    linkEditor,
    linkRenderer,
  }
}
