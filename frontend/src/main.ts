import { createApp } from 'vue'

import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'
import { registerAllRenderers } from 'handsontable/registry'

// import { registerAllModules } from 'handsontable/registry';

import {
  AutocompleteCellType,
  DropdownCellType,
  NumericCellType,
  SelectCellType,
  TextCellType,
  registerCellType,
} from 'handsontable/cellTypes'

import {
  AutoColumnSize,
  AutoRowSize,
  Autofill,
  ColumnSorting,
  ColumnSummary,
  ContextMenu,
  CopyPaste,
  Formulas,
  ManualColumnResize,
  ManualRowResize,
  MergeCells,
  NestedHeaders,
  TrimRows,
  UndoRedo,
  registerPlugin,
} from 'handsontable/plugins'

// Styles
import '@core/scss/template/index.scss'
import '@styles/styles.scss'

// Create vue app
export const app = createApp(App)

registerCellType(NumericCellType)
registerCellType(TextCellType)
registerCellType(AutocompleteCellType)
registerCellType(DropdownCellType)
registerCellType(SelectCellType)

registerPlugin(Autofill)
registerPlugin(UndoRedo)
registerPlugin(CopyPaste)
registerPlugin(ContextMenu)
registerPlugin(AutoColumnSize)
registerPlugin(Formulas)
registerPlugin(AutoRowSize)
registerPlugin(ManualColumnResize)
registerPlugin(ManualRowResize)
registerPlugin(TrimRows)
registerPlugin(MergeCells)
registerPlugin(NestedHeaders)
registerPlugin(ColumnSummary)
registerPlugin(ColumnSorting)

registerAllRenderers()

// registerAllModules()

// Register plugins
registerPlugins(app)

// Mount vue app
app.mount('#app')
