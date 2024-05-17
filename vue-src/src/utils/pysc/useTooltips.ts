import DataTooltip from "./tooltips.json"

export const useTooltip = () => {
  const { t, locale } = useI18n({ useScope: 'global' })

  const getToolTip = (key: string) => {
    const ArrKey = key.split(".")
    let obj = DataTooltip
    let keys = Object.keys(obj)
    for (let i = 0; i < ArrKey.length; i++) {
      const k = Object.keys(obj).indexOf(ArrKey[i])
      if (k != -1) {
        obj = Object.assign({}, obj[ArrKey[i]])
        if (i + 1 === ArrKey.length)
          return obj[locale.value]
      } else
        break
    }
    return undefined
  }
  return {
    getToolTip
  }
}
