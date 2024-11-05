export default [
  {
    title: 'Home',
    to: { name: 'dashboard' },
    icon: { icon: 'tabler-smart-home' },
    fixed: true,
  },
  {
    control: 'cases', fixed: true,
  },
  { heading: 'Configuration' },
  {
    title: 'GenTitle',
    icon: { icon: 'tabler-settings-dollar' },
    to: { name: 'pysc-conf' },
  },
  {
    title: 'Lifting',
    icon: { icon: 'tabler-package' },
    to: { name: 'pysc-prod' },
  },
  {
    title: 'Costs',
    icon: { icon: 'tabler-file-dollar' },
    divider: true,
    children: [
      {
        title: 'Capital',
        icon: { icon: 'tabler-circle-1-filled', size: '21' },
        to: { name: 'pysc-cost-capital' },
      },
      {
        title: 'Intangible',
        icon: { icon: 'tabler-circle-2-filled', size: '21' },
        to: { name: 'pysc-cost-intang' },
      },
      {
        title: 'Opex',
        icon: { icon: 'tabler-circle-3-filled', size: '21' },
        to: { name: 'pysc-cost-opex' },
      },
      {
        title: 'ASR',
        icon: { icon: 'tabler-circle-4-filled', size: '21' },
        to: { name: 'pysc-cost-asr' },
      },
      {
        title: 'LBT',
        icon: { icon: 'tabler-circle-5-filled', size: '21' },
        to: { name: 'pysc-cost-lbt' },
      },
      {
        title: 'Cost of Sales',
        icon: { icon: 'tabler-circle-6-filled', size: '21' },
        to: { name: 'pysc-cost-cos' },
        cosNav: true,
        access: [1, 3, 4, 6],
      },
    ],
  },
  {
    title: 'FisTitle',
    icon: { icon: 'tabler-user-dollar' },
    to: { name: 'pysc-fis' },
    access: [1, 2, 3, 4, 5, 6],
  },
  {
    title: 'CR/GS',
    icon: { icon: 'tabler-basket-dollar' },
    to: { name: 'pysc-crgs' },
    access: [1, 2, 3, 4, 5, 6],
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
    to: { name: 'pysc-optim' },
    access: [1, 2, 3, 4, 5, 6],
  },
]
