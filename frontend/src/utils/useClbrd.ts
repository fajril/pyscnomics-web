import * as XLSX from 'xlsx'

// Clipboard
export interface TdataSheet {
  name: string
  header: Array<string>
  data: Array<Array<any>>
}

export const useClpbrd = () => {
  function b64toBlob(imgUrl: string, contentType: string | null = null, sliceSize: number | null = null) {
    contentType = contentType || 'image/png'
    sliceSize = sliceSize || 512

    const b64Data = imgUrl.replace(`data:${contentType};base64,`, '')

    const byteCharacters = atob(b64Data)
    const byteArrays = []
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize)
      const byteNumbers = Array.from({ length: slice.length })
      for (let i = 0; i < slice.length; i++)
        byteNumbers[i] = slice.charCodeAt(i)

      const byteArray = new Uint8Array(byteNumbers)

      byteArrays.push(byteArray)
    }

    return new Blob(byteArrays, { type: contentType })
  }
  const { copy, copied } = useClipboardItems()

  const copyImage = (imgUrl: string, mime: string) => {
    copy([new ClipboardItem({
      [mime]: b64toBlob(imgUrl, mime, 512),
    })]).then(() => {
      console.log("success")
    }).catch(reason => {
      console.log(reason)
    })
  }

  const copyText = (text: string) => {
    copy([new ClipboardItem({
      'text/plain': new Blob(
        [text],
        { type: "text/plain" },
      ),
    })])
  }

  const saved = ref(false)

  const saveText = (downloadTagRef: any, textSource: string, nameFile: string) => {
    if (downloadTagRef) {
      const blob = new Blob([textSource], { type: "text/plain" })
      const href = URL.createObjectURL(blob)

      downloadTagRef.href = href

      downloadTagRef.setAttribute('download', `${nameFile}.txt`)
      downloadTagRef.click()

      saved.value = true
      useTimeoutFn(() => saved.value = false, 2000)
    }
  }

  const saveImage = (downloadTagRef: any, imgUrl: string, mime: string, nameFile: string) => {
    if (downloadTagRef) {
      const blob = b64toBlob(imgUrl, mime, 512)
      const href = URL.createObjectURL(blob)

      downloadTagRef.href = href

      downloadTagRef.setAttribute('download', `${nameFile}.${mime.split(/\//).slice(1)}`)
      downloadTagRef.click()

      saved.value = true
      useTimeoutFn(() => saved.value = false, 2000)
    }
  }

  const saveTable = (downloadTagRef: any, data: Array<TdataSheet>, nameFile: string) => {
    if (downloadTagRef && !isEmpty(data) && data.length) {
      const wb = XLSX.utils.book_new()

      data.forEach(sh => {
        const ws = XLSX.utils.json_to_sheet(sh.data, { header: sh.header })

        XLSX.utils.book_append_sheet(wb, ws, sh.name)
      })

      function s2ab(s) {
        const buf = new ArrayBuffer(s.length)
        const view = new Uint8Array(buf)
        for (let i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF

        return buf
      }
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' })

      const href = URL.createObjectURL(new Blob([s2ab(wbout)], { type: 'application/octet-stream' }))

      downloadTagRef.href = href

      downloadTagRef.setAttribute('download', `${nameFile}.xlsx`)
      downloadTagRef.click()
      saved.value = true
      useTimeoutFn(() => saved.value = false, 2000)
    }
  }

  return {
    copied,
    copyImage,
    copyText,
    saved,
    saveImage,
    saveTable,
    saveText,
  }
}
