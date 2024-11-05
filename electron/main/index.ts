import { sleep } from '@antfu/utils'
import { BrowserWindow, Menu, Notification, app, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import open from 'open'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const bcolors = {
  HEADER: "\x1B[95m",
  OKBLUE: "\x1B[94m",
  OKCYAN: "\x1B[96m",
  OKGREEN: "\x1B[92m",
  WARNING: "\x1B[93m",
  FAIL: "\x1B[91m",
  ENDC: "\x1B[0m",
  BOLD: "\x1B[1m",
  UNDERLINE: "\x1B[4m",
} as const

// The built directory structure
//
// ├─┬ dist
// │ ├─┬ frontend
// │ │ ├── index.html    > Electron-Renderer
// │ │ └── assets        > Vue assets (frontend)
// │ ├─┬ launcher
// │ │ ├── index.html    > Electron-Renderer
// │ │ └── assets        > Vue assets (launcher)
// │ ├─┬ electron
// │ │ ├─┬ main
// │ │ │ └── index.js    > Electron-Main
// │ │ └─┬ preload
// │ │   └── index.mjs   > Preload-Scripts
// │ └─┬ backend
// │   └── main          > FastAPI engine
// └── Samples

process.env.APP_ROOT = path.normalize(path.join(__dirname, '../../..'))

let isFresh = false
let apiReady = false
let elecClient = null
let isUpdated = false
const isMac = process.platform === 'darwin'
const osType = (process.platform === 'win32' ? 'win' : (isMac ? 'mac' : 'linux'))

const PY_MODULE = 'main' // without .py suffix
let pyProc = null
let pyPort: any = null
let showAPILogger: boolean = false

export const MAIN_DIST = path.normalize(path.join(process.env.APP_ROOT, 'dist', 'electron'))
export const RENDERER_DIST = path.normalize(path.join(process.env.APP_ROOT, 'dist', 'launcher'))
export const RESOURCE_DIST = app.isPackaged
  ? path.normalize(path.join(process.env.APP_ROOT, '..'))
  : path.normalize(path.join(process.env.APP_ROOT))
export const TMP_UPDATE = app.isPackaged
  ? path.normalize(path.join(process.env.APP_ROOT, '..', '..', '..', 'tmp-update'))
  : path.normalize(path.join(process.env.APP_ROOT, 'tmp-update'))
export const FRONTEND_DIST = app.isPackaged
  ? path.normalize(path.join(process.env.APP_ROOT, '..'))
  : path.normalize(path.join(process.env.APP_ROOT, 'dist'))
export const SAMPLES_DIST = path.normalize(path.join(RESOURCE_DIST, 'Samples'))
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
export const PYTHON_EXEC = path.normalize(path.join(RESOURCE_DIST, 'python-3.12.4'))

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1'))
  app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32')
  app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// console.log(app.getPath('home'))

/*************************************************************
 * path browser
 *************************************************************/
const drivelist = require('drivelist')

async function listDrive() {
  const drives = await drivelist.list()

  return {
    dir: "",
    filename: null,
    parent: null,
    children: drives.reduce((drv, d, i) => {
      return [...drv, ...d.mountpoints.map(p => ({ name: p.path, type: 0 }))]
    }, []),
  }
}

async function read_path(flext: string, srcpath: string) {
  let curPath = path.normalize(srcpath)
  let basename = ''
  if (curPath.toLowerCase().includes(`.${flext}`)) {
    basename = path.basename(curPath)
    curPath = path.normalize(path.join(curPath, '..'))
  }
  if (fs.existsSync(curPath)) {
    const drvContent = fs.readdirSync(curPath, { withFileTypes: true }).filter(dl => {
      return (dl.isDirectory() || dl.isFile()) && !dl.isSymbolicLink()
    })

    const lstPath = drvContent.filter(dirent => dirent.isDirectory()).map(dirent => ({ name: dirent.name, type: 1 })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    const lstFile = drvContent.filter(dirent => dirent.isFile() && dirent.name.toLowerCase().includes(`.${flext}`)).map(dirent => ({ name: dirent.name, type: 2 })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    const infoPath = path.parse(curPath)
    const prevPath = path.normalize(path.join(curPath, '..'))

    const childs = [
      ...lstPath,
      ...lstFile,
    ]

    return {
      dir: curPath,
      filename: basename.length && childs.findIndex(c => c.name.toLowerCase() === basename.toLowerCase()) ? basename : null,
      parent: infoPath.root === curPath ? "" : prevPath,
      children: childs,
    }
  }
  else {
    const infoPath = path.parse(curPath)
    while (!fs.existsSync(curPath)) {
      curPath = path.normalize(path.join(curPath, '..'))
      if (curPath === infoPath.root) {
        if (fs.existsSync(curPath))
          break
        else
          curPath = ""
      }
    }

    return { dir: curPath, parent: curPath, filename: null, children: null }
  }
}

async function read_dirs(ev, lookup: string) {
  const dl = JSON.parse(atob(lookup))

  // "" = list drive
  // null = default path
  if (dl.path != null) {
    if (dl.path.trim().length)
      return await read_path(dl.flext, path.normalize(dl.path))
    else
      return { dir: '', parent: null, filename: null, children: null }
  }
  else { return await read_path(dl.flext, SAMPLES_DIST) }
}

/*************************************************************
 * ws server
 *************************************************************/
const WebSocket = require('ws')

const serverWS = createServer()

const wss = new WebSocket.Server({
  noServer: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },

    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024, // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  },
})

function onSocketError(err) {
  console.log(`${bcolors.OKGREEN}[WS-SERVER]${bcolors.ENDC}: ${err}.`)
}

function heartbeat(ev) {
  this.isAlive = true

  // console.log(`${chalk.blueBright('[WS-SERVER]')} Pong:${this.id} still alive}`)
}

wss.getUniqueID = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  }

  return `${s4() + s4()}-${s4()}`
}

function broadCastMessge(data: any, isBinary: any, id?: any) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && (id === undefined || (id && id === client.id)))
      client.send(data, { binary: isBinary })
  })
}

wss.on('connection', (ws, request) => {
  // ws.id = wss.getUniqueID()
  ws.isAlive = true
  console.log(`${bcolors.OKGREEN}[WS-SERVER]${bcolors.ENDC} Client request - ${request?.url}.`)
  console.log(`${bcolors.OKGREEN}[WS-SERVER]${bcolors.ENDC} Client connected - ${ws.id}.`)

  ws.on('close', () => {
    if (elecClient === ws.id)
      elecClient = null

    console.log(`${bcolors.OKGREEN}[WS-SERVER]${bcolors.ENDC} Client disconnected.`)
  })

  ws.on('error', console.error)
  ws.on('pong', heartbeat)

  ws.on('message', async (data, isBinary) => {
    try {
      const msg = JSON.parse(atob(data))
      if (msg.module === 'os:sep') {
        broadCastMessge(JSON.stringify({
          module: 'os:sep',
          id: ws.id,
          data: { type: 'os:sep', data: JSON.stringify({ sep: path.sep }) },
        }), false, ws.id)
      }
      else if (msg.module === 'app:isfresh') {
        broadCastMessge(JSON.stringify({
          module: 'app:isfresh',
          id: ws.id,
          data: { type: 'app:isfresh', data: isFreshInstall(null) },
        }), false, ws.id)
      }
      else if (msg.module === 'app:drive') {
        const listPath = await listDrive()

        broadCastMessge(JSON.stringify({
          module: 'app:dirs',
          id: ws.id,
          data: { type: 'app:drive', data: btoa(JSON.stringify(listPath)) },
        }), false, ws.id)
      }
      else if (msg.module === 'app:dirs') {
        const listPath = await read_dirs(null, msg.data)

        broadCastMessge(JSON.stringify({
          module: 'app:dirs',
          id: ws.id,
          data: { type: 'app:dirs', data: btoa(JSON.stringify(listPath)) },
        }), false, ws.id)
      }
      else if (msg.module === 'app:open') {
        handleFileOpen(null, msg.data.path).then(value => {
          if (value.path) {
            broadCastMessge(JSON.stringify({
              module: 'app:open',
              id: ws.id,
              data: { type: 'app:open', data: { path: btoa(value.path) } },
            }), false, ws.id)
          }
        })
      }
      else if (msg.module === 'module:monteCalc') {
        const res = await calcMonteCarlo(null, ws.id, msg.data.caseID, msg.data.path, msg.data.numSim)

        broadCastMessge(JSON.stringify({
          module: 'module:monteCalc',
          id: ws.id,
          data: { type: 'monteCalc:status', caseID: msg.data.caseID, data: { status: res } },
        }), false, ws.id)
      }
    }
    catch (error) {
      if (error)
        console.log(`${bcolors.OKGREEN}[WS-SERVER]${bcolors.ENDC}: ${error}`)
    }
  })

  ws.send(JSON.stringify({
    module: 'os:conf',
    id: ws.id,
    data: {
      type: 'os:conf', isFreshInst: (elecClient === ws.id ? isFresh : isFreshInstall(null)), data: btoa(JSON.stringify({ sep: path.sep, os: osType, port: pyPort })),
    },
  }))
})

const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false)
      return ws.terminate()

    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', () => {
  clearInterval(interval)
})

serverWS.on('upgrade', (request, socket, head) => {
  socket.on('error', onSocketError)

  const { pathname, searchParams } = new URL(request.url, 'http://127.0.0.1:3142')

  const clientid = searchParams.get('client')
  const iselec = searchParams.get('elec')

  // console.log([pathname, clientid])

  // This function is not defined on purpose. Implement it with your own logic.

  if (pathname === '/ws') {
    // if (pathname==='ws')
    if (iselec === null && (!apiReady || pyProc === null)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()

      return
    }
    if (iselec)
      elecClient = clientid

    socket.removeListener('error', onSocketError)
    wss.handleUpgrade(request, socket, head, ws => {
      ws.id = clientid
      wss.emit('connection', ws, request)
    })
  }
})

serverWS.listen(3142)

/*************************************************************
 * py process
 *************************************************************/
const broadCastNewPort = () => {
  if (pyPort) {
    wss?.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && elecClient === client.id) {
        client.send(JSON.stringify({
          module: 'os:conf',
          id: client.id,
          data: {
            type: 'os:conf', isFreshInst: (elecClient === client.id ? isFresh : isFreshInstall(null)), data: btoa(JSON.stringify({ sep: path.sep, os: osType, port: pyPort })),
          },
        }), { binary: false })
      }
    })
  }
}

const broadCastFailedPort = () => {
  if (pyPort) {
    wss?.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && elecClient === client.id) {
        client.send(JSON.stringify({
          module: 'os:conf',
          id: client.id,
          data: {
            type: 'os:failPort',
            isFreshInst: (elecClient === client.id ? isFresh : isFreshInstall(null)),
            data: btoa(JSON.stringify({ sep: path.sep, os: osType, port: pyPort })),
          },
        }), { binary: false })
      }
    })
  }
}

const getScriptPath = () => {
  return path.normalize(path.join(RESOURCE_DIST, 'backend', `${PY_MODULE}.py`))
}

// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const sendAPILog = async (msg: string) => {
  if (msg?.length) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          module: 'app:logger',
          id: client.id,
          data: { type: 'api:log', data: btoa(msg) },
        }), { binary: false })
      }
    })
  }
}

let portInUse = false

const createPyProc = async (showLog: boolean = false) => {
  showAPILogger = showLog

  const script = getScriptPath()
  const statMainPy = fs.statSync(script, { throwIfNoEntry: false })
  if (!(script && pyPort) || statMainPy === undefined)
    return `${script} port:${pyPort} failed to start`

  try {
    portInUse = false
    if (app.isPackaged) {
      if (osType === 'win') {
        pyProc = require('node:child_process').spawn(`${path.normalize(path.join(RESOURCE_DIST, 'pyscnomics-env', 'Scripts', 'python'))}`, [`${PY_MODULE}.py`, pyPort, `"${FRONTEND_DIST}"`], {
          cwd: path.normalize(path.dirname(script)),
          windowsHide: true,

          // stdio: ['pipe', process.stdout, process.stderr],
        })
      }
      else {
        pyProc = require('node:child_process').spawn(`${path.normalize(path.join(RESOURCE_DIST, 'pyscnomics-env', 'bin', 'python3'))}`, [`${PY_MODULE}.py`, pyPort, `"${FRONTEND_DIST}"`], {
          cwd: path.normalize(path.dirname(script)),
          windowsHide: true,

          // stdio: ['pipe', process.stdout, process.stderr],
        })
      }
    }
    else {
      pyProc = require('node:child_process').spawn(`${path.normalize(path.join(RESOURCE_DIST, 'pyscnomics-env', 'Scripts', 'python'))}`, [`${PY_MODULE}.py`, pyPort, `"${FRONTEND_DIST}"`], {
        cwd: path.normalize(path.dirname(script)),
        windowsHide: true,

        // stdio: ['pipe', process.stdout, process.stderr],
      })
    }
    if (pyProc) {
      pyProc.on('spawn', () => {
        console.log(`${bcolors.OKGREEN}[backend]${bcolors.ENDC} Force running FastAPI on port ${pyPort} ${showAPILogger ? 'with logging' : ''}`)

        // process.stdout?.addListener('data', processStrOutListenner)
      })

      pyProc.stdout.on('data', async data => {
        // tes if its monte progress
        const logs = `${data}`.replace(/(INFO:)(.*)"(PUT|GET|POST|OPTIONS)(.*)"(\s\d+\s.*)[\r\n$]/, `${bcolors.OKGREEN}[backend]${bcolors.ENDC} ${bcolors.OKCYAN}$1${bcolors.ENDC}$2"${bcolors.WARNING}$3${bcolors.ENDC}$4"${bcolors.WARNING}$5${bcolors.ENDC}`)
        if (logs && showAPILogger) {
          // send looger
          sendAPILog(`${logs}`)
        }

        process.stdout.write(`${logs}`)
      })
      pyProc.stderr.on('data', async data => {
        if (data && showAPILogger) {
          // send looger
          sendAPILog(`${data}`)
        }

        // [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8888): only one usage of each socket address (protocol/network address/port) is normally permitted
        console.log(`${bcolors.FAIL}[backend]${bcolors.ENDC} ${data}`)
        if (`${data}`.includes(`Uvicorn running on http`)) {
          console.log(`${bcolors.FAIL}[backend]${bcolors.ENDC} Uvicorn started`)
          broadCastNewPort()
        }
        else if (`${data}`.includes('error while attempting to bind on address')) {
          // port in used
          apiReady = false
          portInUse = true
          broadCastFailedPort()
        }
      })
      pyProc.on('exit', code => {
        apiReady = false

        console.log(`${bcolors.FAIL}[backend]${bcolors.ENDC} Process exist`)

        // process.stdout?.removeListener('data', processStrOutListenner)
      })
    }

    // broadCastNewPort()
  }
  catch (error) {
    if (error)
      console.log(error.toString())
    apiReady = false

    return `${script} port:${pyPort} failed to start`
  }

  return true
}

const exitPyProc = () => {
  if (pyProc !== null) {
    try {
      if (process.platform === "win32") {
        try {
          require('node:child_process').execSync(`taskkill /PID ${pyProc.pid} /T /F`, {
            windowsHide: true,
          })
          console.log(`${bcolors.OKGREEN}[backend]${bcolors.ENDC} the server is shut down`)
        }
        catch (error) {
          if (error)
            console.log(error.toString())
        }
      }
      else {
        try {
          process?.kill(pyProc.pid)
          console.log(`${bcolors.OKGREEN}[backend]${bcolors.ENDC} the server0 is shut down`)
        }
        catch (error) {
        }
        try {
          pyProc?.kill()
          console.log(`${bcolors.OKGREEN}[backend]${bcolors.ENDC} the server1 is shut down`)
        }
        catch (error) {
        }
      }
    }
    catch (error) {
      if (error)
        console.log(error.toString())
    }
  }
  pyProc = null
  pyPort = null
  apiReady = false
}

let win: BrowserWindow | null = null
const preload = path.normalize(path.join(__dirname, '../preload/index.mjs'))
const indexHtml = path.normalize(path.join(RENDERER_DIST, 'index.html'))

const template = [
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  },

  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'selectAll' },
        ]
        : [
          { role: 'selectAll' },
        ]),
    ],
  },

  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
]

const menu = Menu.buildFromTemplate(template)

Menu.setApplicationMenu(menu)

async function createWindow() {
  win = new BrowserWindow({
    title: 'PSCnomics',
    icon: path.normalize(path.join(process.env.VITE_PUBLIC, 'favicon.ico')),

    // titleBarStyle: osType === 'win' ? 'hidden' : 'hiddenInset',
    webPreferences: {
      preload,
      devTools: !app.isPackaged,

      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
    width: 600,
    height: 420,
  })

  // win.setTitleBarOverlay({ color: 'primary', height: 24 })

  win.on('close', e => {
    e.preventDefault()

    const msgRes = dialog.showMessageBoxSync(win, {
      message: `${pyProc ? 'Server still running!!' : 'No server running'}, do you want to close the application ?`,
      type: 'question',
      buttons: ['No', 'Yes, close now!'],
      defaultId: 0,
      cancelId: 0,
    })

    if (msgRes === 1) {
      // close server
      console.log(`close process${pyProc?.pid}`)
      exitPyProc()
      try {
        serverWS.close()
        wss.close()
      }
      catch (error) {
        if (error)
          console.log(error.toString())
      }

      app.quit()
    }
  })

  win.setMenuBarVisibility(false)

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)

    // Open devTool if the app is not packaged
    if (!app.isPackaged)
      win.webContents.openDevTools()
  }
  else {
    win.loadFile(indexHtml)
  }
  win.webContents.on('zoom-changed', (event, zoomDirection) => {
    const _zoomFact = win.webContents.getZoomFactor()

    win.webContents.setZoomFactor(_zoomFact + (zoomDirection === 'in' ? 0.05 : -0.05))
  })

  // win.webContents.on('context-menu', e => {
  //   e.preventDefault()
  //   ipcRenderer.send('show-context-menu')
  // })

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:'))
      shell.openExternal(url)

    return { action: 'deny' }
  })

  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

let dialogOnProcess = false
async function handleFileOpen(ev, curfilePath, ext: string = 'psc') {
  if (dialogOnProcess)
    return { path: null }
  dialogOnProcess = true

  const normPath = curfilePath ? path.dirname(curfilePath) : path.join(RESOURCE_DIST, 'Samples')

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: ext === 'psc' ? 'Open PSCnomics File' : 'Select Python Interpreter',
    defaultPath: path.normalize(normPath),
    filters: [(ext === 'psc' ? { name: 'PSCnomics', extensions: ['psc'] } : { name: 'Python file', extensions: ['*'] })],
    properties: ['openFile'],
  })

  // setTimeout(() => {
  //   const allWindows = BrowserWindow.getAllWindows()

  //   // allWindows[0].minimize()
  // }, 2000)

  // const allWindows = BrowserWindow.getAllWindows()

  // allWindows[0].moveTop()

  // const { canceled, filePaths } = await dialog.showOpenDialog({
  //   title: 'Open PySCnomics File',
  //   defaultPath: path.normalize(normPath),
  //   filters: [(ext === 'psc' ? { name: 'PySCnomics-App', extensions: ['psc'] } : { name: 'Application file', extensions: [ext] })],
  //   properties: ['openFile'],
  // })

  dialogOnProcess = false
  if (!canceled)
    return { path: path.normalize(filePaths[0]) }

  return { path: null }
}

async function handleFileSave(ev, curfilePath) {
  if (dialogOnProcess)
    return { path: null }
  dialogOnProcess = true

  const normPath = curfilePath ? path.dirname(curfilePath) : path.join(RESOURCE_DIST, 'Samples')

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save PSCnomics Project',
    defaultPath: path.normalize(normPath),
    filters: [{ name: 'PSCnomics-App', extensions: ['psc'] }],
    properties: ['showOverwriteConfirmation'],
  })

  dialogOnProcess = false

  if (!canceled)
    return { path: path.normalize(filePath) }

  return { path: null }
}

function isFreshInstall(ey) {
  const _fresh = isFresh

  isFresh = false

  return _fresh
}

async function handlesetPort(ev, port?: number, showLog: boolen = false) {
  pyPort = port
  if (pyProc)
    exitPyProc()
  if (pyPort)
    return createPyProc(showLog)

  return false
}

async function stopPyton(ev) {
  try {
    exitPyProc()

    // close ws client connection
    wss?.clients.forEach(ws => {
      if (ws.id !== elecClient)
        ws.terminate()
    })
  }
  catch (error) {
  }

  return true
}

async function windowReload(ev) {
  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)

    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  }
  else {
    win.loadFile(indexHtml)
  }
}

/*************************************************************
 * python installer
 *************************************************************/
async function testFilePython(ev, noBrowseFile: any = false) {
  const openfilepy = async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Python Interpreter',
      filters: [{ name: 'Python file', extensions: ['*'] }],
      properties: ['openFile'],
    })

    return !canceled ? filePaths[0] : null
  }

  let filePyPath = null
  if (noBrowseFile !== true)
    filePyPath = await openfilepy()

  if (noBrowseFile || filePyPath) {
    const pyFilePath = filePyPath ? path.normalize(filePyPath) : null
    let python: string | null = null
    let pyValid: boolean = false
    process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} Test Python File...`)
    try {
      // if (osType === 'win') {
      //   python = require('node:child_process').execFileSync(pyFilePath || 'python3', ['--version'],
      //     {
      //       cwd: pyFilePath ? path.normalize(path.dirname(pyFilePath)) : undefined,
      //       windowsHide: true,
      //       stdio: 'pipe',
      //     })
      // }
      // else {
      python = require('node:child_process').execFileSync(pyFilePath || 'python', ['--version'],
        {
          cwd: pyFilePath ? path.normalize(path.dirname(pyFilePath)) : undefined,
          windowsHide: true,
          stdio: 'pipe',
        })

      // }
      process.stdout.write(`${python.toString()}\n`)

      const pyver_ = python.toString().match(/Python\s*(\d*\.\d*)(\.\d*)/i)
      if (pyver_) {
        // check ver
        pyValid = pyver_[1] === '3.12' && Number.parseInt(pyver_[2].slice(1)) >= 7
        python = pyver_.slice(1).join('')
      }
    }
    catch (error) {
      if (error)
        console.log(error.toString())
    }

    return { path: pyFilePath, pyVer: python, valid: pyValid }
  }

  return { path: null, pyVer: null, valid: false }
}

async function checkPython() {
  process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} Test Python...`)

  const statDir = fs.statSync(path.join(RESOURCE_DIST, 'pyscnomics-env'), { throwIfNoEntry: false })
  const envNotFound = statDir === undefined
  let python: string | null = null
  let pyExists: boolean = false
  if (envNotFound) {
    // check python
    try {
      python = require('node:child_process').execFileSync('python', ['--version'],
        {
          windowsHide: true,
          stdio: 'pipe',

        })

      process.stdout.write(`${python.toString()}\n`)

      const pyver_ = python.toString().match(/Python\s*(\d*\.\d*)(\.\d*)/i)
      if (pyver_) {
        // check ver
        pyExists = pyver_[1] === '3.12' && Number.parseInt(pyver_[2].slice(1)) >= 7
        python = pyver_.slice(1).join('')
      }
    }
    catch (err) {
      if (err)
        console.log(err.toString())
    }
  }
  else { console.log("Ok\n") }

  return {
    env: !envNotFound,
    pyExist: pyExists,
    pyver: python,
    isUpdate: isUpdated,
  }
}

async function checkPIP() {
  process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} Test PIP...`)
  try {
    const statPIP = require('node:child_process').execFileSync(path.join(PYTHON_EXEC, 'python'), ['-m', 'pip', '--version'],
      {
        cwd: PYTHON_EXEC,
        windowsHide: true,
        stdio: 'pipe',
      })

    process.stdout.write(statPIP ? `${statPIP.toString()}\n` : 'not found\n')

    return {
      pip: statPIP !== undefined,
    }
  }
  catch (error) {
    process.stdout.write('not found\n')
    if (error)
      console.log(error.toString())
  }

  return {
    pip: false,
  }
}
async function installPIP(ev, clientid: string) {
  process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} Install pip...`)
  isFresh = true
  try {
    require('node:child_process').execFile('python', ['get-pip.py'],
      {
        cwd: PYTHON_EXEC,
        windowsHide: true,
        stdio: ['pipe', process.stdout, process.stderr],
      },
      error => {
        if (error)
          console.log(error.toString())
        broadCastMessge(JSON.stringify({ module: 'setup', id: clientid, data: { type: 'config:instpip', data: !error } }), false, clientid)
        process.stdout.write(error ? "failed" : "done\n")
      })
  }
  catch (error) {
    if (error)
      console.log(error.toString())

    return false
  }

  return 'pip installing'
}
async function installVirtualEnv(ev, clientid: string) {
  isFresh = true
  process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} Install virtualenv...`)
  try {
    require('node:child_process').execFile('pip', ['install', 'virtualenv'],
      {
        cwd: path.join(PYTHON_EXEC, 'Scripts'),
        windowsHide: true,
        stdio: ['pipe', process.stdout, process.stderr],

      },
      error => {
        if (error)
          console.log(error.toString())
        broadCastMessge(JSON.stringify({ module: 'setup', id: clientid, data: { type: 'config:instvenv', data: !error } }), false, clientid)
        process.stdout.write(error ? "failed" : "done\n")
      })
  }
  catch (error) {
    if (error)
      console.log(error.toString())

    return false
  }

  return 'venv installing'
}

async function createPyEnv(ev, clientid: string, builtIn: boolean, pyPath: string | null = null) {
  isFresh = true
  try {
    process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} Create Python environment for pyscnomics-env...`)

    // if (osType === 'win' && builtIn) {
    //   require('node:child_process').execFile(path.join(PYTHON_EXEC, 'Scripts', 'virtualenv'),
    //     ['--copies', 'pyscnomics-env'],
    //     {
    //       cwd: path.normalize(RESOURCE_DIST),
    //       windowsHide: true,
    //       stdio: ['pipe', process.stdout, process.stderr],
    //     },
    //     error => {
    //       if (error)
    //         console.log(error.toString())
    //       broadCastMessge(JSON.stringify({ module: 'setup', id: clientid, data: { type: 'config:makeEnv', data: !error } }), false, clientid)
    //       process.stdout.write(error ? "failed" : "done\n")
    //     })
    // }
    // else {
    require('node:child_process').execFile(pyPath ? path.normalize(pyPath) : 'python',
      ['-m', 'venv', '--copies', 'pyscnomics-env'],
      {
        cwd: path.normalize(RESOURCE_DIST),
        windowsHide: true,
        stdio: ['pipe', process.stdout, process.stderr],
      },
      error => {
        if (error)
          console.log(error.toString())
        broadCastMessge(JSON.stringify({ module: 'setup', id: clientid, data: { type: 'config:makeEnv', data: !error } }), false, clientid)
        process.stdout.write(error ? "failed" : "done\n")
      })

    // }
  }
  catch (error) {
    if (error)
      console.log(error.toString())

    return false
  }

  return 'Create Env'
}
async function installPyLib(ev, clientid: string) {
  isFresh = true
  try {
    process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} Install Python library...`)
    if (osType === 'win') {
      require('node:child_process').execFile('activate',
        ['&&',
          'pip',
          'install',
          '-r',
          `"${path.normalize(path.join(RESOURCE_DIST, 'backend', 'requirements.txt'))}"`,
          '&&',
          'deactivate'],
        {
          cwd: path.normalize(path.join(RESOURCE_DIST, 'pyscnomics-env', 'Scripts')),
          windowsHide: true,
          shell: true,
          stdio: 'pipe',
        }, error => {
          broadCastMessge(JSON.stringify({ module: 'setup', id: clientid, data: { type: 'config:insLib', data: !error } }), false, clientid)
          process.stdout.write(error ? "failed" : "done\n")
        })
    }
    else {
      require('node:child_process').execFile('source ./pyscnomics-env/bin/activate',
        ['&&',
          'pip install -r ./backend/requirements.txt',
          '&&',
          'deactivate'],
        {
          cwd: RESOURCE_DIST,
          windowsHide: true,
          shell: true,
          stdio: 'pipe',
        }, error => {
          broadCastMessge(JSON.stringify({ module: 'setup', id: clientid, data: { type: 'config:insLib', data: !error } }), false, clientid)
          process.stdout.write(error ? "failed" : "done\n")
        })
    }
  }
  catch (error) {
    if (error)
      console.log(error.toString())

    return false
  }

  return 'Install PyLib'
}

async function showAppUpdated(appver_: string) {
  if (Notification.isSupported()) {
    const _notif = new Notification({
      title: 'PSCnomics',
      icon: path.normalize(path.join(process.env.VITE_PUBLIC, 'favicon.ico')),
      body: `Successfully updated to  ${typeof appver_ === 'string' && appver_.length ? (`version ${appver_}`) : 'the latest version'}`,
    })

    _notif.show()
  }
}

async function chkPythonLibs(ev, clientid_: string, appver_: string) {
  try {
    process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} check Python library...`)
    if (osType === 'win') {
      require('node:child_process').execFile('activate',
        ['&&',
          'pip',
          'install',
          '-r',
          `"${path.normalize(path.join(RESOURCE_DIST, 'backend', 'requirements.txt'))}"`,
          '&&',
          'deactivate'],
        {
          cwd: path.normalize(path.join(RESOURCE_DIST, 'pyscnomics-env', 'Scripts')),
          windowsHide: true,
          shell: true,
          stdio: 'pipe',
        }, error => {
          if (!error)
            showAppUpdated(appver_)
          broadCastMessge(JSON.stringify({ module: 'setup', id: clientid_, data: { type: 'config:chkLib', data: !error } }), false, clientid_)
          process.stdout.write(error ? "failed" : "done\n")
        })
    }
    else {
      require('node:child_process').execFile('source ./pyscnomics-env/bin/activate',
        ['&&',
          'pip install -r ./backend/requirements.txt',
          '&&',
          'deactivate'],
        {
          cwd: RESOURCE_DIST,
          windowsHide: true,
          shell: true,
          stdio: 'pipe',
        }, error => {
          if (!error)
            showAppUpdated(appver_)
          broadCastMessge(JSON.stringify({ module: 'setup', id: clientid_, data: { type: 'config:chkLib', data: !error } }), false, clientid_)
          process.stdout.write(error ? "failed" : "done\n")
        })
    }
  }
  catch (error) {
    if (error)
      console.log(error.toString())

    return false
  }

  return 'check for PyLib'
}

async function installPy(ev, clientid: string) {
  isFresh = true
  process.stdout.write(`${bcolors.OKGREEN}[Setup]${bcolors.ENDC} Install Python 3.12...`)
  try {
    if (osType === 'win') {
      require('node:child_process').exec('python-3.12.7.exe',
        {
          cwd: path.normalize(path.join(RESOURCE_DIST, 'python-win-3.12')),
          shell: true,
          stdio: 'pipe',
        }, (error, stdout, stderr) => {
          process.stdout.write(error ? "failed" : "done\n")
          if (error)
            process.stdout.write(error.toString())
        })
    }
    else {
      require('node:child_process').exec('open python-3.12.7.pkg',
        {
          cwd: path.normalize(path.join(RESOURCE_DIST, 'python-mac-3.12')),
          shell: true,
          stdio: 'pipe',
        }, (error, stdout, stderr) => {
          process.stdout.write(error ? "failed" : "done\n")
          if (error)
            process.stdout.write(error.toString())
        })
    }
  }
  catch (error) {
    if (error)
      console.log(error.toString())
    process.stdout.write(error ? "failed" : "done\n")

    return false
  }

  return 'Install Python'
}

async function openAppUrl(ev, url: string) {
  apiReady = true
  open(url)
}

async function calcMonteCarlo(ev, clientID: string, CaseID: number, dataPath: string, numSim: number) {
  process.stdout.write(`${bcolors.OKGREEN}[backend]${bcolors.ENDC} start running montecarlo...\n`)

  const sendProgress = async (prog: number, fileOut: string | null = null) => {
    broadCastMessge(JSON.stringify({
      module: 'module:monteCalc',
      id: clientID,
      data: { type: 'monteCalc:progress', caseID: CaseID, data: { progress: prog, path: fileOut ?? undefined } },
    }), false, clientID)
  }

  const script = path.normalize(path.join(RESOURCE_DIST, 'backend', "monteDetached.py"))
  try {
    const monteProc = require('node:child_process').spawn(`${path.normalize(path.join(RESOURCE_DIST, 'pyscnomics-env', osType === 'win' ? 'Scripts' : 'bin', osType === 'win' ? 'python' : 'python3'))}`, ["-u", "monteDetached.py", dataPath], {
      cwd: path.normalize(path.dirname(script)),
      windowsHide: true,

      // stdio: 'inherit',
    })

    const progress = { cur: 0, prog: 0 }

    monteProc.stdout.on('data', async data => {
      const doneMonte = (`${data}`.match(/(Monte Done:)(.*)/i) ?? [])

      console.log(`${data}`)
      if (doneMonte.length >= 3 && doneMonte[2]) {
        await sendProgress(-1, doneMonte[2])

        return
      }

      progress.cur += (`${data}`.match(/(Monte Progress.*)/g) ?? []).length

      const posProg = +(+(progress.cur / numSim * 100).toPrecision(10)).toFixed(1)

      if (posProg !== progress.prog) {
        progress.prog = posProg
        await sendProgress(progress.prog)
      }
    })
    monteProc.stderr.on('data', data => {
      console.log(`stderr from monte : ${data ?? 'unknown'}`)
    })

    monteProc.on('error', code => {
      console.log(`montecarlo error : ${code}`)
    })

    monteProc.on('exit', code => {
      console.log(`montecarlo exit : ${code}`)
      try {
        process?.kill(monteProc.pid)
        console.log('the montecarlo0 is shut down')
      }
      catch (error) {
        if (error)
          console.log(error.toString())
      }
      try {
        monteProc?.kill()
        console.log('the montecarlo1 is shut down')
      }
      catch (error) {
        if (error)
          console.log(error.toString())
      }
      if (code !== 0)
        sendProgress(-500)
    })

    return !!monteProc
  }
  catch (error) {
    console.log(error ? error.toString() : 'error calc montecarlo')
  }

  return false
}

async function checkUpdate(ev, clientID: string) {
  try {
    const resp = await fetch("https://raw.githubusercontent.com/edealam/pscnomics-packages/main/version.json")

    const _txt = await resp.text()

    return isMac ? (JSON.parse(_txt).mac) : (JSON.parse(_txt).windows)
  }
  catch (error) {
    console.log(error.toString())
  }

  return null
}

const _7z = require('7zip-min-electron')

async function downloadUpdate(url: string, clientID: string, ver: string) {
  try {
    // creating a new AbortController
    const controller = new AbortController()

    // Getting signal from the controller
    const signal = controller.signal

    // Setting timeout to automatically abort
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, { signal })

    clearTimeout(timeoutId)
    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`)

    const contentLength = response.headers.get('content-length')

    const totalSize = contentLength ? Number.parseInt(contentLength, 10) : 0

    const reader = response.body.getReader()

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

    let loaded = 0

    const stream = new ReadableStream({
      // start the stream
      async start(controller) {
        while (true) {
          // read the next chuck of data
          const { done, value } = await reader.read()

          //  simulate  network delay
          await delay(100)

          if (done)
            break

          // calcualte the progress %
          loaded += value.length

          broadCastMessge(JSON.stringify({
            module: 'app:update',
            id: clientID,
            data: { type: 'download:progress', data: { loaded, totalSize, stage: 1 } },
          }), false, clientID)

          // send the data to the controller
          controller.enqueue(value)
        }

        // close the stream
        controller.close()
      },
    })

    const responseStream = new Response(stream)
    const buffer = await responseStream.arrayBuffer()
    const view = new Uint8Array(buffer)
    const fileExe = path.normalize(TMP_UPDATE)

    const file7z = path.join(fileExe, `module-update-${ver}.7z`)
    if (!fs.existsSync(fileExe))
      fs.mkdirSync(fileExe)

    fs.writeFileSync(file7z, view)

    broadCastMessge(JSON.stringify({
      module: 'app:update',
      id: clientID,
      data: { type: 'download:progress', data: { loaded, totalSize, stage: 2 } },
    }), false, clientID)

    return true
  }
  catch (error) {
    console.log(error.toString())

    return error
  }

  // return false
}

async function updateApp(ev, clientID: string, ver: string) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  try {
    // console.log(process.env.APP_ROOT)
    try {
      console.log('stoping python...')
      exitPyProc()
    }
    catch (error) { }

    const resDownload = isMac
      ? (await downloadUpdate(`https://github.com/edealam/pscnomics-packages/releases/download/mac-x64-${ver}/module-${ver}.7z`, clientID, ver))
      : (await downloadUpdate(`https://github.com/edealam/pscnomics-packages/releases/download/win-x64-${ver}/module-${ver}.7z`, clientID, ver))

    if (resDownload === true) {
      const fileExe = path.normalize(TMP_UPDATE)
      const file7z = path.join(fileExe, `module-update-${ver}.7z`)

      // clear frontend/launcher content
      fs.rmSync(path.join(RESOURCE_DIST, 'frontend'), { recursive: true, force: true })
      fs.rmSync(path.join(RESOURCE_DIST, 'app', 'dist', 'launcher'), { recursive: true, force: true })

      await _7z.unpack(file7z, RESOURCE_DIST, err => {
        if (err) {
          console.log(err.toString())
          throw new Error('extract update-file failed')
        }
      })

      await sleep(1000)
      try {
        fs.rmSync(TMP_UPDATE, { recursive: true, force: true })
      }
      catch (error) {

      }
    }
    else {
      throw new Error(typeof resDownload === 'string' ? resDownload : 'download update-file failed')
    }
    console.log('done, updated')

    return true
  }
  catch (error) {
    console.log(error.toString())

    return error
  }
}

async function reloadApp(ev, ver: string) {
  try {
    exitPyProc()
    serverWS.close()
    wss.close()
    app.relaunch({ args: process.argv.slice(1).concat([`--relaunch="${ver}"`]) })
  }
  catch (error) {
    if (error)
      console.log(error.toString())
  }
  app.exit(0)
}

// async function updateApp2(ev, clientID: string, ver: string) {
//   try {
//     if (isMac) {
//       const response = await fetch(`https://github.com/edealam/pscnomics-packages/releases/download/mac-${ver}/PSCnomics-Mac-${ver}.app.zip`)
//       if (response.ok) {
//         const buffer = await response.arrayBuffer()
//         const view = new Uint8Array(buffer)
//       }

//       // const fileExe = path.normalize(TMP_UPDATE)

//       // if (!fs.existsSync(fileExe))
//       //   fs.mkdirSync(fileExe)
//       // fs.writeFileSync(path.join(fileExe, `PSCnomics-Mac${ver}.app.zip`), view)

//       // run update
//       // require('node:child_process').spawn(path.join(fileExe, `PSCnomics-Mac${ver}.app`), {
//       //   detached: true,
//       //   stdio: 'ignore',
//       // })

//       // setTimeout(() => {
//       //   // closeApp
//       //   exitPyProc()
//       //   try {
//       //     serverWS.close()
//       //     wss.close()
//       //   }
//       //   catch (error) {
//       //     if (error)
//       //       console.log(error.toString())
//       //   }
//       //   app.quit()
//       // }, 1000)

//       return null
//     }
//     else {
//       const response = await fetch(`https://github.com/edealam/pscnomics-packages/releases/download/win-x64-${ver}/PSCnomics-Win-x64-${ver}-Setup.exe`)
//       if (response.ok) {
//         const buffer = await response.arrayBuffer()
//         const view = new Uint8Array(buffer)
//         const fileExe = path.normalize(TMP_UPDATE)

//         if (!fs.existsSync(fileExe))
//           fs.mkdirSync(fileExe)
//         fs.writeFileSync(path.join(fileExe, `Setup-update-${ver}.exe`), view)

//         // run update
//         require('node:child_process').spawn(path.join(fileExe, `Setup-update-${ver}.exe`), {
//           detached: true,
//           stdio: 'ignore',
//         })

//         setTimeout(() => {
//           // closeApp
//           exitPyProc()
//           try {
//             serverWS.close()
//             wss.close()
//           }
//           catch (error) {
//             if (error)
//               console.log(error.toString())
//           }
//           app.quit()
//         }, 2000)

//         return true
//       }
//       console.log(await response.text())
//     }
//   }
//   catch (error) {
//     console.log(error.toString())
//   }

//   return null
// }

app.whenReady().then(() => {
  ipcMain.handle('config:getBackendUrl', () => `http://127.0.0.1:${pyPort}`)
  ipcMain.handle('dialog:openFile', handleFileOpen)
  ipcMain.handle('dialog:saveFile', handleFileSave)
  ipcMain.handle('config:getPort', () => pyPort ?? null)
  ipcMain.handle('config:setPort', handlesetPort)
  ipcMain.handle('window:reload', windowReload)
  ipcMain.handle('app:fresh', isFreshInstall)
  ipcMain.handle('config:chkPython', checkPython)
  ipcMain.handle('config:chkPIP', checkPIP)
  ipcMain.handle('config:instPIP', installPIP)
  ipcMain.handle('config:instVenv', installVirtualEnv)
  ipcMain.handle('config:chkPyLib', chkPythonLibs)

  ipcMain.handle('config:makeEnv', createPyEnv)
  ipcMain.handle('config:instLib', installPyLib)
  ipcMain.handle('config:stopPy', stopPyton)
  ipcMain.handle('dialog:testFilePython', testFilePython)
  ipcMain.handle('config:instPy', installPy)
  ipcMain.handle('app:openUrl', openAppUrl)
  ipcMain.handle('app:readPath', read_dirs)
  ipcMain.handle('module:monteCalc', calcMonteCarlo)

  ipcMain.handle('app:checkUpdate', checkUpdate)
  ipcMain.handle('app:updateApp', updateApp)
  ipcMain.handle('app:reload', reloadApp)

  createWindow()
})

app.on('window-all-closed', () => {
  win = null

  // if (process.platform !== 'darwin')
  app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized())
      win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length)
    allWindows[0].focus()
  else
    createWindow()
})

app.on('ready', () => {
  isUpdated = (process.argv.length > 1 && /--relaunch/.test(process.argv[1]))
})

app.on('before-quit', e => {
  app.exit()
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL)
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  else
    childWindow.loadFile(indexHtml, { hash: arg })
})
