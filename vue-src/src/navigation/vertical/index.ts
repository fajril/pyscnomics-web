export default [
  {
    title: 'Dashboard',
    to: { name: 'dashboard' },
    icon: { icon: 'tabler-smart-home' },
    fixed: true
  },
  { heading: 'Project', fixed: true },
  {
    control: 'cases', fixed: true
  },
  { heading: 'Configuration' },
  {
    title: 'GenFisTitle',
    icon: { icon: 'tabler-settings-dollar' },
    to: { name: 'pysc-conf' },
  },
  {
    title: 'CR/GS',
    icon: { icon: 'tabler-basket-dollar' },
    to: { name: 'pysc-crgs' },
  },
  {
    title: 'Producer',
    icon: { icon: 'tabler-package' },
    to: { name: 'pysc-prod' },
  },
  {
    title: 'Costs',
    icon: { icon: 'tabler-file-dollar' },
    children: [
      {
        title: 'Tangible',
        icon: { icon: 'tabler-circle-1-filled', size: '21' },
        to: { name: 'pysc-tangi' },
      },
      {
        title: 'Intangible',
        icon: { icon: 'tabler-circle-2-filled', size: '21' },
        to: { name: 'pysc-intangi' },
      },
      {
        title: 'Opex',
        icon: { icon: 'tabler-circle-3-filled', size: '21' },
        to: { name: 'pysc-opex' },
      },
      {
        title: 'ASR',
        icon: { icon: 'tabler-circle-4-filled', size: '21' },
        to: { name: 'pysc-asr' },
      },
    ]
  },
  { heading: 'Summary' },
  {
    title: 'Cashflow',
    icon: { icon: 'tabler-table-filled' },
    to: { name: 'pysc-ecocf' },
  },
  {
    title: 'Economic Summary',
    icon: { icon: 'tabler-list-details' },
    to: { name: 'pysc-ecosum' },
  },
  { heading: 'Analysis' },
  {
    title: 'Sensitivity',
    icon: { icon: 'tabler-analyze' },
    to: { name: 'pysc-sens' },
  },
  {
    title: 'Uncertainty',
    icon: { icon: 'tabler-dice' },
    to: { name: 'pysc-monte' },
  },
  {
    title: 'Optimization',
    icon: { icon: 'tabler-settings-automation' },
  },
]
