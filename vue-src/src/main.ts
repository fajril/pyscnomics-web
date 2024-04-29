import { createApp } from 'vue';

import App from '@/App.vue';
import { registerPlugins } from '@core/utils/plugins';
import { registerAllRenderers } from 'handsontable/registry';
// import { registerAllModules } from 'handsontable/registry';

import {
  AutocompleteCellType,
  DropdownCellType,
  NumericCellType,
  SelectCellType,
  TextCellType,
  registerCellType,
} from 'handsontable/cellTypes';

import {
  AutoColumnSize,
  AutoRowSize,
  Autofill,
  ContextMenu,
  CopyPaste,
  Formulas,
  ManualColumnResize,
  ManualRowResize,
  MergeCells,
  TrimRows,
  UndoRedo,
  registerPlugin,
} from 'handsontable/plugins';

// registerAllModules()
// Styles
import '@core/scss/template/index.scss';
import '@styles/styles.scss';


// Create vue app
const app = createApp(App)


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

registerAllRenderers()
// registerAllModules()
// Register plugins
registerPlugins(app)

// Mount vue app
app.mount('#app')
