import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args

    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args

    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args

    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args

    return ipcRenderer.invoke(channel, ...omit)
  },

  openFile: (filePath?: string, ext?: string) => ipcRenderer.invoke('dialog:openFile', filePath, ext),
  saveFile: (filePath?: string) => ipcRenderer.invoke('dialog:saveFile', filePath),
  getBackendUrl: () => ipcRenderer.invoke('config:getBackendUrl'),
  listPath: (lookup: string) => ipcRenderer.invoke('app:readPath', lookup),
  getPort: () => ipcRenderer.invoke('config:getPort'),
  setPort: (port?: number, showLog?: boolean) => ipcRenderer.invoke('config:setPort', port, showLog),
  isFreshInstall: () => ipcRenderer.invoke('app:fresh'),

  chkPython: () => ipcRenderer.invoke('config:chkPython'),
  chkPIP: () => ipcRenderer.invoke('config:chkPIP'),
  instPIP: (id: string) => ipcRenderer.invoke('config:instPIP', id),
  instVenv: (id: string) => ipcRenderer.invoke('config:instVenv', id),

  makeEnv: (id: string, pyPath?: string) => ipcRenderer.invoke('config:makeEnv', id, pyPath),
  instLib: (id: string) => ipcRenderer.invoke('config:instLib', id),
  stopPy: () => ipcRenderer.invoke('config:stopPy'),
  openPy: (noBrowseFile?: boolean) => ipcRenderer.invoke('dialog:testFilePython', noBrowseFile),
  instPy: (id: string) => ipcRenderer.invoke('config:instPy', id),
  openUrl: (url: string) => ipcRenderer.invoke('app:openUrl', url),
  winReload: () => ipcRenderer.invoke('window:reload'),

  calcmonte: (id: string, caseID: number, dataPath: string, numsim: number) => ipcRenderer.invoke('module:monteCalc', id, caseID, dataPath, numsim),
})

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    }
    else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState))
          resolve(true)
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child))
      return parent.appendChild(child)
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child))
      return parent.removeChild(child)
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const preloadclass = 'loading'

  const preloadStyle = `
body {
  margin: 0;
}

html {
  overflow-x: hidden;
  overflow-y: scroll;
}

#loading-bg {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--initial-loader-bg, #fff);
  block-size: 100%;
  gap: 1rem 0;
  inline-size: 100%;
}

.loading {
  position: relative;
  box-sizing: border-box;
  border: 3px solid transparent;
  border-radius: 50%;
  block-size: 55px;
  inline-size: 55px;
}

.loading .effect-1,
.loading .effect-2,
.loading .effect-3 {
  position: absolute;
  box-sizing: border-box;
  border: 3px solid transparent;
  border-radius: 50%;
  block-size: 100%;
  border-inline-start: 3px solid var(--initial-loader-color, #eee);
  inline-size: 100%;
}

.loading .effect-1 {
  animation: rotate 1s ease infinite;
}

.loading .effect-2 {
  animation: rotate-opacity 1s ease infinite 0.1s;
}

.loading .effect-3 {
  animation: rotate-opacity 1s ease infinite 0.2s;
}

.loading .effects {
  transition: all 0.3s ease;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(1turn);
  }
}

@keyframes rotate-opacity {
  0% {
    opacity: 0.1;
    transform: rotate(0deg);
  }

  100% {
    opacity: 1;
    transform: rotate(1turn);
  }
}
`

  const loaderColor = '#FFFFFF'
  const primaryColor = '#7367F0'

  if (loaderColor)
    document.documentElement.style.setProperty('--initial-loader-bg', loaderColor)
  if (loaderColor)
    document.documentElement.style.setProperty('--initial-loader-bg', loaderColor)

  if (primaryColor)
    document.documentElement.style.setProperty('--initial-loader-color', primaryColor)

  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oDiv.id = 'loading-bg'
  oDiv.innerHTML = `<div class=" ${preloadclass}"><div class="effect-1 effects"></div><div class="effect-1 effects"></div><div class="effect-1 effects"></div></div>`
  oStyle.id = 'app-loader-style'
  oStyle.innerHTML = preloadStyle

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()

domReady().then(appendLoading)

window.onmessage = ev => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
