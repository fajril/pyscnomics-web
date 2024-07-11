<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useWSStore } from '@/stores/wsStore'
import gifConnected from '@images/pulse.gif'
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

const isBrowsingPy = ref(false)
const isInstallingPy = ref(false)
const instPythonMode = ref(0)
const pyhtonIntPath = ref('')
const PyInsProcess = ref(false)
const StoppingProcess = ref(false)

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
})

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
    console.log('FasiAPI Ready!')
    isLoading.value = false
    linkApp.value = `http://localhost:${port.value}`
    currentTab.value = 3
    appStore.$patch(state => {
      state.appPort = port.value
    })
    window.ipcRenderer?.openUrl(linkApp.value)
  }
  catch (error) {
    console.log(error)
    resumeTes()
  }
}, 1000, { immediate: false })

const processTask = async (_step: string) => {
  step.value = _step
  if (step.value === 'test-python') {
    currentTab.value = 0

    const pyEnv = await window.ipcRenderer?.chkPython()
    if (!pyEnv.env) {
      if (!pyEnv.pyExist) {
        isFailed.value = true
        processTask('inst-py')
      }
      else {
        if (appStore.osConf.os === 'win')
          processTask('test-pip')
        else
          processTask('make-env')
      }
    }
    else {
      currentTab.value = 1
    }
  }
  else if (step.value === 'test-pip') {
    currentTab.value = 0

    const pyPIP = await window.ipcRenderer?.chkPIP()
    if (!pyPIP.pip)
      processTask('inst-pip')
    else
      processTask('make-env')
  }
  else if (step.value === 'inst-pip') {
    currentTab.value = 0
    window.ipcRenderer?.instPIP(wsStore.clientID).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'inst-venv') {
    currentTab.value = 0
    window.ipcRenderer?.instVenv(wsStore.clientID).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'make-env') {
    currentTab.value = 0
    window.ipcRenderer?.makeEnv(wsStore.clientID).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'inst-py') {
    nextTick(() => nextTick(() => currentTab.value = 2))
  }
  else if (step.value === 'inst-lib') {
    currentTab.value = 0
    window.ipcRenderer?.instLib(wsStore.clientID).then(res => {
      console.log(res)
    })
  }
  else if (step.value === 'runAPI') {
    isLoading.value = true

    const resSetPort = await window.ipcRenderer?.setPort(port.value)

    if (resSetPort === true) {
      resumeTes()
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
    window.ipcRenderer?.makeEnv(wsStore.clientID, pyhtonIntPath.value).then(res => {
      console.log(res)
    })
    currentTab.value = 0
  }
  else if (pyInfo.pyVer) {
    appStore.showAlert({ text: `Python ver. ${pyInfo.pyVer}, we need 3.12`, isalert: true })
  }
  isBrowsingPy.value = false
}

const InstallPython = () => {
  isFailed.value = false

  // currentTab.value = 0
  // step.value = 'inst-py312'
  PyInsProcess.value = true
  window.ipcRenderer.instPy().then(msg => {
    console.log('msg')
  })
}

const AfterInsPy = async () => {
  PyInsProcess.value = false

  isBrowsingPy.value = true

  const pyInfo = await window.ipcRenderer.openPy(true)
  if (pyInfo.valid) {
    appStore.showAlert({ text: `Valid Python ver. ${pyInfo.pyVer}`, isalert: false })
    isFailed.value = false
    currentTab.value = 0
    step.value = 'make-env'
    window.ipcRenderer?.makeEnv(wsStore.clientID, pyhtonIntPath.value).then(res => {
      console.log(res)
    })
    currentTab.value = 0
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
    currentTab.value = 1
  }))
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
    else if (type === "config:insLib") {
      if (data === true) {
        currentTab.value = 1
      }
      else {
        isFailed.value = true
        appStore.showAlert({ isalert: true, text: 'Failed!' })
      }
    }
    console.log(msg)
  })

  processTask('test-python')

  // processTask('inst-py')

  // currentTab.value = 3
  port.value = appStore.appPort ?? 8888
})
onUnmounted(() => {
  wsStore.removeBroadCast('setup')
})
</script>

<template>
  <VContainer
    fluid
    justify="center"
    class="py-0 px-10"
  >
    <VRow
      align="center"
      no-gutters
      :style="{ minHeight: '100dvh' }"
    >
      <VCol>
        <VCard
          class="mx-auto"
          :loading="isLoading ? 'primary' : false"
          density="compact"
          :style="{ maxWidth: '480px' }"
        >
          <template
            #title
            class="pb-0"
          >
            <div class="d-flex">
              <VNodeRenderer
                :nodes="layoutConfig.app.logo"
                :style="{ transform: 'translateY(-1px) translateX(-8px) scale(0.35)', maxWidth: '60px', maxHeight: '1px' }"
              />
              <h5 class="text-h3 text-primary hero-title  font-weight-bold text-wrap">
                PySCnomics App
              </h5>
            </div>
          </template>
          <VWindow v-model="currentTab">
            <VWindowItem :value="0">
              <VCardText
                :style="{ height: '260px', alignContent: 'center', display: 'grid' }"
                class="px-0 py-0"
              >
                <div class="d-inline-flex flex-column justify-center align-center">
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
              <VCardText
                :style="{ height: '260px', alignContent: 'center', display: 'grid' }"
                class="px-0 py-0"
              >
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
                </div>
              </VCardText>
            </VWindowItem>
            <VWindowItem :value="2">
              <VCardText
                :style="{ height: '260px' }"
                class="px-0 py-0"
              >
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
                            <H7 class="cr-title text-base">
                              Using installed python
                            </H7>
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
                            <H7 class="cr-title text-base">
                              Install Fresh Python 3.12
                            </H7>
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
              <VCardText
                :style="{ height: '260px' }"
                class="px-0 py-0"
              >
                <VImg
                  :src="gifConnected"
                  class="mx-auto"
                />
                <VLabel
                  class="position-fixed d-flex align-center"
                  :style="{ width: '478px', marginTop: '-92px', justifyContent: 'center' }"
                >
                  {{ StoppingProcess ? `stopping server...` : `serve for http://localhost:${port}` }}
                </VLabel>
                <div
                  class="position-fixed d-flex align-center"
                  :style="{ width: '478px', marginTop: '-56px', justifyContent: 'center' }"
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
          </VWindow>
        </VCard>
      </VCol>
    </VRow>
    <VDialog
      v-model="PyInsProcess"
      persistent
      :loading="PyInsProcess ? 'primary' : ''"
    >
      <VCard title="Installing python 3.12">
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
</style>
