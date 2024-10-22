<script setup lang="ts">
import { getHighlighter } from 'shikiji'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VProgressLinear } from 'vuetify/lib/components/index.mjs'
import { useAppStore } from '@/stores/appStore'
import { useWSStore } from '@/stores/wsStore'
import { layoutConfig } from '@layouts'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'

const appStore = useAppStore()

definePage({
  name: 'wellcome',
  meta: {
    title: 'Wellcome',
    layout: 'blank',
  },
})

const isLoading = ref(false)
const isFailed = ref(false)
const step = ref('test-python')
const currentTab = ref(0)
const wsStore = useWSStore()
const port = ref<number | null>(null)
const linkApp = ref('')

const builtInPy = ref(false)
const isBrowsingPy = ref(false)
const isInstallingPy = ref(false)
const instPythonMode = ref(0)
const pyhtonIntPath = ref('')
const PyInsProcess = ref(false)
const StoppingProcess = ref(false)
const isBusy = ref(false)
const FastAPIStarted = ref(false)

const consoleSource = ref(`\x1B[94m[Setup]\x1B[0m PSCnomics API...\n`)
const showConsole = ref(false)
const chkShowConsole = ref(false)

const loaderText = computed(() => {
  if (step.value === 'test-python')
    return `preparing server...${isFailed.value ? '(python 3.12 not found)' : ''}`
  else if (step.value === 'test-pip')
    return `test pip...${isFailed.value ? '(pip not found)' : ''}`
  else if (step.value === 'inst-pip')
    return `installing pip...${isFailed.value ? 'failed' : ''}`
  else if (step.value === 'inst-venv')
    return `installing virtualenv...${isFailed.value ? 'failed' : ''}`
  else if (step.value === 'make-env')
    return `create python environment...${isFailed.value ? 'failed' : ''}`
  else if (step.value === 'inst-py312')
    return `installpython 3.12...${isFailed.value ? 'failed' : ''}`
  else if (step.value === 'inst-lib')
    return `install/update python library...${isFailed.value ? 'failed' : ''}`
  else if (step.value === 'chk-pylib')
    return `check for updates of python libraries...${isFailed.value ? 'failed' : ''}`
})

const openAppTab = () => {
  nextTick(() => window.ipcRenderer?.openUrl(linkApp.value))
}

const { pause: pauseTes, resume: resumeTes, isActive } = useIntervalFn(async () => {
  try {
    pauseTes()

    await $api('/apiinfo', {
      baseURL: `http://localhost:${port.value}/api`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE',
      },
      onResponseError({ response }) {
        throw response
      },
    })

    // has result then open browser
    isBusy.value = true
    consoleSource.value = `\x1B[94m[Setup]\x1B[0m PSCnomics API...\n`
    console.log('FasiAPI Ready!')
    isLoading.value = false
    linkApp.value = `http://localhost:${port.value}`
    currentTab.value = chkShowConsole.value ? 4 : 3
    appStore.$patch(state => {
      state.appPort = port.value
    })
    nextTick(() => showConsole.value = chkShowConsole.value)

    openAppTab()
  }
  catch (error) {
    console.log(error)
    resumeTes()
  }
}, 1000, { immediate: false })

const processTask = async (_step: string) => {
  step.value = _step
  isFailed.value = false
  if (step.value === 'test-python') {
    isBusy.value = true
    currentTab.value = 0
    showConsole.value = false

    const pyEnv = await window.ipcRenderer?.chkPython()
    if (!pyEnv.env) {
      if (!pyEnv.pyExist) {
        isFailed.value = true

        // if (appStore.osConf.os === 'win') {
        //   builtInPy.value = true
        //   processTask('inst-pip')

        // // processTask('test-pip')
        // }
        // else {
        processTask('inst-py')

        // }
      }
      else {
        // if (appStore.osConf.os === 'win')

        //   processTask('test-pip')
        // else
        builtInPy.value = false
        processTask('make-env')
      }
    }
    else if (pyEnv.isUpdate) {
      // chk python library
      processTask('chk-pylib')
    }
    else {
      showConsole.value = false
      currentTab.value = 1
      isBusy.value = false
      resumeChkUpdate()
    }
  }
  else if (step.value === 'test-pip') {
    showConsole.value = false
    currentTab.value = 0

    const pyPIP = await window.ipcRenderer?.chkPIP()
    if (!pyPIP.pip)
      processTask('inst-pip')
    else
      processTask('make-env')
  }
  else if (step.value === 'inst-pip') {
    showConsole.value = false
    currentTab.value = 0
    window.ipcRenderer?.instPIP(wsStore.clientID).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'inst-venv') {
    showConsole.value = false
    currentTab.value = 0
    window.ipcRenderer?.instVenv(wsStore.clientID).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'make-env') {
    showConsole.value = false
    currentTab.value = 0
    window.ipcRenderer?.makeEnv(wsStore.clientID, builtInPy.value).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'inst-py') {
    nextTick(() => nextTick(() => {
      showConsole.value = false
      currentTab.value = 2
    }))
  }
  else if (step.value === 'inst-lib') {
    showConsole.value = false
    currentTab.value = 0
    window.ipcRenderer?.instLib(wsStore.clientID).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'chk-pylib') {
    showConsole.value = false
    currentTab.value = 0
    window.ipcRenderer?.chkLib(wsStore.clientID, appStore.PYSCAPPVER).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'runAPI') {
    isLoading.value = true

    const resSetPort = await window.ipcRenderer?.setPort(port.value, chkShowConsole.value)

    if (resSetPort === true) {
      // resumeTes()
    }
    else {
      isLoading.value = false
      appStore.showAlert({ isalert: true, text: resSetPort })
    }
    console.log(resSetPort)
  }
}

const browsePythonPath = async () => {
  isBrowsingPy.value = true

  const pyInfo = await window.ipcRenderer.openPy()
  if (pyInfo.valid) {
    appStore.showAlert({ text: `Valid Python ver. ${pyInfo.pyVer}`, isalert: false })
    pyhtonIntPath.value = pyInfo.path
    isFailed.value = false
    step.value = 'make-env'
    window.ipcRenderer?.makeEnv(wsStore.clientID, false, pyhtonIntPath.value).then(res => {
      console.log(res)
    })
    showConsole.value = false
    currentTab.value = 0
  }
  else if (pyInfo.pyVer) {
    appStore.showAlert({ text: `Python ver. ${pyInfo.pyVer}, we need 3.12.7`, isalert: true })
  }
  isBrowsingPy.value = false
}

const InstallPython = () => {
  isFailed.value = false

  // currentTab.value = 0
  // step.value = 'inst-py312'
  window.ipcRenderer.instPy().then(msg => {
    console.log('msg')
  })
  nextTick(() => PyInsProcess.value = true)
}

const AfterInsPy = async () => {
  PyInsProcess.value = false

  isBrowsingPy.value = true

  const pyInfo = await window.ipcRenderer.openPy(true)
  if (pyInfo.valid) {
    appStore.showAlert({ text: `Valid Python ver. ${pyInfo.pyVer}`, isalert: false })
    isFailed.value = false
    showConsole.value = false
    currentTab.value = 0
    step.value = 'make-env'
    window.ipcRenderer?.makeEnv(wsStore.clientID, false, pyhtonIntPath.value).then(res => {
      console.log(res)
    })
  }
  else if (pyInfo.pyVer) {
    appStore.showAlert({ text: `found Python ver. ${pyInfo.pyVer}, please browse to installed path`, isalert: true })
  }
  isBrowsingPy.value = false
}

const stopServe = async () => {
  StoppingProcess.value = true
  isFailed.value = false

  const res = await window.ipcRenderer.stopPy()

  StoppingProcess.value = false

  nextTick(() => nextTick(() => {
    showConsole.value = false
    currentTab.value = 1
    isBusy.value = false
    resumeChkUpdate()
  }))
}

// console logger
const { copy, copied } = useClipboard({ source: computed(() => consoleSource.value) })

const highlighter = await getHighlighter({
  themes: ['dracula', 'dracula-soft'],
  langs: ['text'],
})

const codeSnippet = ref(highlighter.codeToHtml(consoleSource.value, {
  lang: 'ansi',
  theme: 'dracula',
}))

const cardLogger = ref()
const loggerScrollbar = ref()

useResizeObserver(cardLogger, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect

  if (loggerScrollbar.value) {
    nextTick(() => {
      loggerScrollbar.value?.update()
      if (loggerScrollbar.value && loggerScrollbar.value.$el.scrollHeight)
        loggerScrollbar.value.$el.scrollTop = loggerScrollbar.value.$el.scrollHeight
    })
  }
})

const isOnUpdate = ref(false)

const progressUpdate = ref({
  total: 0,
  loaded: 0,
  progress: 0,
  stage: 0,
})

const updateApp = () => {
  if (isBusy.value) {
    appStore.showAlert({
      text: 'App. still busy',
      isalert: true,
    })
  }
  if (isBusy.value || isOnUpdate.value)
    return

  progressUpdate.value.total = 0
  progressUpdate.value.loaded = 0
  progressUpdate.value.progress = 0
  progressUpdate.value.stage = 0
  isOnUpdate.value = true

  currentTab.value = 5

  window.ipcRenderer?.updateApp(wsStore.clientID, appStore.updVer).then(res => {
    pauseChkUpdate()
    if (res === true) {
      appStore.$patch(state => {
        state.updVer = null
      })
      appStore.showAlert({
        text: 'PSCnomics has been successfully updated,<br>PSCnomics will be reopened shortly.',
        isalert: false,
      })
      useTimeoutFn(() => {
        window.ipcRenderer?.reloadPage()
      }, 2000)
    }
    else {
      appStore.showAlert({
        text: `Error : ${typeof res === 'string' ? res : 'updateding failed'}`,
        isalert: true,
      })
    }
    isOnUpdate.value = false
    currentTab.value = 1
    resumeChkUpdate()
  })
}

const intervalCheck = ref(2000)

const chkUpdate = async () => {
  try {
    const response = await window.ipcRenderer?.checkUpdate(wsStore.clientID)

    const chkver = response

    appStore.$patch(state => {
      state.updVer = Object.values(chkver).join(".")
    })

    intervalCheck.value = 15000
  }
  catch (error) {

  }
}

const { pause: pauseChkUpdate, resume: resumeChkUpdate } = useIntervalFn(async () => {
// check update
  if (!isOnUpdate.value) {
    pauseChkUpdate()

    await chkUpdate()

    nextTick(() => {
      if (!appStore.isUpdateAvailable)
        resumeChkUpdate()
    })
  }
}, intervalCheck, { immediate: false })

const isChkUpdate = ref(false)

const DoChkUpdate = async () => {
  isChkUpdate.value = true
  try {
    await chkUpdate()
    appStore.showAlert({
      text: appStore.isUpdateAvailable ? 'Update available' : 'The application is the latest',
      isalert: false,
    })
  }
  catch (error) {

  }
  isChkUpdate.value = false
  nextTick(() => {
    if (!appStore.isUpdateAvailable)
      resumeChkUpdate()
  })
}

onMounted(() => {
  wsStore.addBroadCast('setup', msg => {
    const { type, data } = msg.data
    if (type === "config:instpip") {
      if (data === true) {
        processTask('inst-venv')
      }
      else {
        isFailed.value = true
        appStore.showAlert({ isalert: true, text: 'PIP installation Failed!' })
      }
    }
    else if (type === "config:instvenv") {
      if (data === true) {
        processTask('make-env')
      }
      else {
        isFailed.value = true
        appStore.showAlert({ isalert: true, text: 'VirtualEnv installation Failed!' })
      }
    }
    else if (type === "config:makeEnv") {
      if (data === true) {
        processTask('inst-lib')
      }
      else {
        isFailed.value = true
        appStore.showAlert({ isalert: true, text: 'Create virtual environment Failed!' })
      }
    }
    else if (type === "config:insLib" || type === "config:chkLib") {
      if (data === true) {
        showConsole.value = false
        currentTab.value = 1
        isBusy.value = false
        resumeChkUpdate()
      }
      else {
        isFailed.value = true
        appStore.showAlert({ isalert: true, text: 'Failed!' })
      }
    }
    console.log(msg)
  })
  wsStore.addBroadCast('os:conf', msg => {
    const { type, data } = msg.data
    if (type === "os:failPort")
      isLoading.value = false
    else if (type === 'os:conf')
      resumeTes()
  })

  const update_logger = (msg: string) => {
    if (consoleSource.value.length + msg.length > 16000)
      consoleSource.value = consoleSource.value.slice(-16000 + msg.length)

    consoleSource.value += msg
    codeSnippet.value = highlighter.codeToHtml(consoleSource.value, {
      lang: 'ansi',
      theme: 'dracula',
    })
    nextTick(() => {
      if (loggerScrollbar.value && loggerScrollbar.value.$el.scrollHeight)
        loggerScrollbar.value.$el.scrollTop = loggerScrollbar.value.$el.scrollHeight
    })
  }

  wsStore.addBroadCast('app:logger', msg => {
    const { type, data } = msg.data

    if (type === 'api:log' && showConsole.value) {
      const msg = atob(data)

      update_logger(msg)
    }
  })

  wsStore.addBroadCast('app:update', msg => {
    const { type, data } = msg.data

    if (type === 'download:progress') {
      progressUpdate.value.stage = data.stage
      if (data.stage === 1) {
        progressUpdate.value.total = data.totalSize
        progressUpdate.value.loaded = data.loaded
        progressUpdate.value.progress = data.loaded / data.totalSize * 100
      }
    }
  })

  processTask('test-python')

  // processTask('inst-py')

  // showConsole.value = true

  // currentTab.value = 5
  port.value = appStore.appPort ?? 9999

  // resumeChkUpdate()
})
onUnmounted(() => {
  wsStore.removeBroadCast('setup')
  pauseChkUpdate()
})
</script>

<template>
  <VContainer
    fluid
    justify="center"
    class="py-5 fill-height align-center"
    :class="{ 'px-5': !showConsole }"
  >
    <VCard
      class="mx-auto"
      :class="{ 'w-100': showConsole, ' fill-height': showConsole }"
      :loading="isLoading ? 'primary' : false"
      :style="{ width: !showConsole ? '543px' : undefined, height: showConsole ? undefined : '344px' }"
      density="compact"
    >
      <VCardText
        v-if="!isOnUpdate && appStore.isUpdateAvailable && !isBusy"
        class="py-0 px-1 my-1 my-0"
        density="compact"
      >
        <VAlert
          density="compact"
          color="success"
          variant="tonal"
        >
          New PSCnomics version {{ `${appStore.updVer}` }},  <VBtn
            variant="plain"
            color="warning"
            class="ms-4"
            :loading="isOnUpdate"
            @click="updateApp"
          >
            update now
          </VBtn>
        </VAlert>
      </VCardText>

      <template
        #title
        v-bin="{ class: 'pb-0' }"
      >
        <div class="d-flex">
          <VNodeRenderer
            :nodes="layoutConfig.app.logo"
            :style="{ transform: 'translateY(-1px) translateX(-8px) scale(0.35)', maxWidth: '60px', maxHeight: '1px' }"
          />
          <h5 class="text-h3 text-primary hero-title  font-weight-bold text-wrap">
            PSCnomics
          </h5>
          <h6 :style="{ alignSelf: 'end', paddingBlockEnd: '0.2rem', paddingLeft: '0.3rem' }">
            ver. {{ appStore.PYSCAPPVER }}
          </h6>
          <VSpacer />
          <IconBtn
            v-show="!appStore.isUpdateAvailable && !isOnUpdate && !isBusy"
            :loading="isChkUpdate"
            @click.stop="DoChkUpdate"
          >
            <VIcon icon="tabler-world-download" />
            <VTooltip activator="parent">
              Check for update
            </VTooltip>
          </IconBtn>
        </div>
      </template>
      <VWindow
        v-model="currentTab"
        class="window-elec-page"
        :style="{ height: `calc(100% - (70px${appStore.isUpdateAvailable && !isBusy ? ' + 120px' : ''}))` }"
      >
        <VWindowItem :value="0">
          <VCardText class="fill-height d-flex align-center justify-center">
            <div class="d-flex flex-column justify-center align-center">
              <VProgressCircular
                size="70"
                indeterminate
                color="primary"
              />
              <div
                class="mt-2"
                :class="{ 'text-warning': isFailed }"
              >
                {{ loaderText }}
              </div>
            </div>
          </VCardText>
        </VWindowItem>
        <VWindowItem :value="1">
          <VCardText class="fill-height d-flex flex-column align-center justify-center">
            <h5 class="mb-6 text-h6 d-block text-center">
              Please enter the port for Web-API
            </h5>
            <div class="position-relative d-flex align-center flex-wrap justify-center">
              <div>
                <AppTextField
                  v-model.number="port"
                  :style="{ width: '120px' }"
                  label-placeholder="Port"
                  :disabled="isLoading"
                  density="compact"
                />
              </div>
              <VBtn
                class="ml-2"
                :disabled="isLoading || isEmpty(port)"
                @click.stop="() => processTask('runAPI')"
              >
                Run
              </VBtn>
              <VCheckbox
                v-model="chkShowConsole"
                label="Show logger"
              />
            </div>
          </VCardText>
        </VWindowItem>
        <VWindowItem :value="2">
          <VCardText class="px-0 py-0">
            <h5 class="mb-3 mt-2 text-h6 d-block text-center">
              Python Installation
            </h5>

            <VRadioGroup
              v-model.number="instPythonMode"
              class="custom-input-wrapper"
              :disabled="PyInsProcess || isBrowsingPy"
            >
              <VRow class="px-4">
                <VCol cols="12">
                  <VLabel
                    class="custom-input custom-radio rounded cursor-pointer w-100 pb-2"
                    :class="instPythonMode === 0 ? 'active' : ''"
                    :style="{ alignItems: 'start' }"
                  >
                    <div class="mt-n2">
                      <VRadio :value="0" />
                    </div>
                    <div class="flex-grow-1">
                      <div class="d-flex align-center mb-1">
                        <span class="cr-title text-base">
                          Using installed python
                        </span>
                      </div>
                      <AppTextField
                        v-model="pyhtonIntPath"
                        clearable
                        type="text"
                        label-placeholder="Python 3.12 path"
                        color="primary"
                        clear-icon="tabler-circle-x"
                        append-icon="tabler-file-code"
                        :disabled="instPythonMode === 1"
                        @click:append="browsePythonPath"
                        @click:clear="() => pyhtonIntPath = ''"
                      />
                    </div>
                  </VLabel>
                </VCol>
                <VCol cols="12">
                  <VLabel
                    class="custom-input custom-radio rounded cursor-pointer w-100 pb-2"
                    :class="instPythonMode === 1 ? 'active' : ''"
                    :style="{ alignItems: 'start' }"
                  >
                    <div class="mt-n2">
                      <VRadio :value="1" />
                    </div>
                    <div class="flex-grow-1">
                      <div class="d-flex align-center mb-1">
                        <span class="cr-title text-base">
                          Install Fresh Python 3.12.7
                        </span>
                      </div>
                      <p class="text-body-2 mb-0">
                        <VBtn
                          variant="outlined"
                          color="success"
                          :disabled="instPythonMode === 0"
                          @click="InstallPython"
                        >
                          Install
                        </VBtn>
                      </p>
                    </div>
                  </VLabel>
                </VCol>
              </VRow>
            </VRadioGroup>
          </VCardText>
        </VWindowItem>
        <VWindowItem :value="3">
          <VCardText>
            <div class="mx-auto circle-on color-1" />
            <div
              class="ms-auto d-flex align-center justify-center"
              style="margin-block-start: 1.1875rem;"
            >
              <span v-if="StoppingProcess">
                stopping server...
              </span>
              <span
                v-else
                style="z-index: 100;"
              >
                serve for
                <span
                  class="ml-2 text-primary cursor-pointer"
                  @click="openAppTab"
                >
                  {{ `http://localhost:${port}` }}
                </span>
              </span>
            </div>
            <div
              class="d-flex align-center justify-center"
              style="margin-block-start: 1.1875rem;"
            >
              <VBtn
                variant="outlined"
                color="danger"
                :disabled="StoppingProcess"
                @click="stopServe"
              >
                Stop
              </VBtn>
            </div>
          </VCardText>
        </VWindowItem>
        <VWindowItem :value="4">
          <VCard density="compact">
            <VCardText
              ref="cardLogger"
              class="d-flex gap-y-3 flex-column app-card-console my-auto"
            >
              <div class="d-flex align-center justify-space-between">
                <div>
                  serve for
                  <span
                    class="ml-2 text-primary cursor-pointer"
                    @click="openAppTab"
                  >
                    {{ `http://localhost:${port}` }}
                  </span>
                </div>
                <VBtn
                  variant="tonal"
                  color="danger"
                  :disabled="StoppingProcess"
                  @click="stopServe"
                >
                  Stop
                </VBtn>
              </div>
              <div
                class="position-relative fill-height"
                :style="{ maxHeight: 'calc(100vh - 191px)' }"
              >
                <PerfectScrollbar
                  ref="loggerScrollbar"
                  :style="{ borderRadius: '6px', maxBlockSize: '100%' }"
                  :options="{ wheelPropagation: false }"
                >
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <span v-html="codeSnippet" />
                </PerfectScrollbar>
                <IconBtn
                  class="position-absolute app-card-console-copy-icon"
                  color="white"
                  @click="() => { copy() }"
                >
                  <VIcon
                    :icon="copied ? 'tabler-check' : 'tabler-copy'"
                    size="20"
                  />
                </IconBtn>
              </div>
            </VCardText>
          </VCard>
        </VWindowItem>
        <VWindowItem :value="5">
          <div
            class="flex-grow-0 align-content-center justify-center h-100 w-100 gap-3"
            style="padding: 3.125rem;"
          >
            <div>
              <VProgressLinear
                :indeterminate="progressUpdate.stage !== 1"
                :model-value="progressUpdate.stage === 1 ? progressUpdate.progress : 0"
                striped
                :rounded="5"
                :height="5"
                :color="progressUpdate.stage === 1 ? 'success' : (progressUpdate.stage === 2 ? 'primary' : 'default')"
              />
            </div>
            <h5 class="text-truncate text-center mt-2">
              {{ progressUpdate.stage === 0 ? 'preparing...' : (progressUpdate.stage === 1 ? `Downloading : ${(progressUpdate.loaded / 1e6).toFixed(2)} Mb of ${(progressUpdate.total / 1e6).toFixed(2)} Mb` : 'updating...') }}
            </h5>
          </div>
        </VWindowItem>
      </VWindow>
    </VCard>
    <VDialog
      v-model="PyInsProcess"
      persistent
      :loading="PyInsProcess ? 'primary' : ''"
    >
      <VCard title="Installing python 3.12.7">
        <VCardText>
          Click continue after installation finished
        </VCardText>

        <VCardText class="d-flex justify-end gap-3 flex-wrap">
          <VBtn @click="AfterInsPy">
            Continue
          </VBtn>
        </VCardText>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style lang="scss">
@use "@styles/variables/vuetify.scss";
.layout-blank {
  height: 100%;
  .window-elec-page {
    .v-window__container {
      height: 100%;
      .v-window-item {
        height: 100%;
        .v-card {
          height: 100%;
          width: 100%;
          .v-card-text {
            padding: 16px;
            &.app-card-console {
              height: 100%;
            }
            .shiki {
              padding: 0.75rem;
              text-wrap: wrap;
            }
          }
        }
      }
    }

  }
}

.v-card {
  .v-card-item {
    padding-block-end: 0 !important;
  }
}

.hero-title {
  animation: shine 2s ease-in-out infinite alternate;
  background: linear-gradient(to right, #c4c728 0%, #c4c728 30%, #e2770c 47.92%, #ff3739 80%, #ff3739 100%);
  //  stylelint-disable-next-line property-no-vendor-prefix
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: rgba(0, 0, 0, 0%);

  .custom-radio {
    display: flex;
    align-items: flex-start;
    gap: 0.25rem;

    .v-radio {
      margin-block-start: -0.45rem;
    }

    .cr-title {
      font-weight: 500;
      line-height: 1.375rem;
    }
  }
}

code[class*="language-"],
pre[class*="language-"] {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 10px;
}

:not(pre) > code[class*="language-"],
pre[class*="language-"] {
  border-radius: vuetify.$card-border-radius;
}

.app-card-console-copy-icon {
  inset-block-start: 0.2em;
  inset-inline-end: 0.8em;
}

.circle-on {
  width: 40px;
  height: 40px;
  border-radius:50%;
  background-color:rgb(240, 240, 0);
  margin-block-start: 61px;
}
.color-1{
   animation: rombus 3s linear 0s infinite;
}

@keyframes rombus{
   0%{background-color:rgba(240, 240, 0.832); transform: scale(1);}
   25%{background-color:rgba(255, 213, 0.732); transform: scale(.8);}
   50%{background-color:rgba(252, 8, 8, 0.632); transform: scale(.6);}
   75%{background-color:rgba(255, 213, 0.732); transform: scale(.8);}
   100%{background-color:rgba(240, 240, 0.832); transform: scale(1);}
}
</style>
