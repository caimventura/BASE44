export const DEVICE_TYPES = {
  pc: { label: 'Computador', prefix: 'PC', category: 'end' },
  notebook: { label: 'Notebook', prefix: 'NB', category: 'end' },
  server: { label: 'Servidor', prefix: 'SRV', category: 'end' },
  phone: { label: 'Celular', prefix: 'CEL', category: 'end' },
  printer: { label: 'Impressora', prefix: 'IMP', category: 'end' },
  switch: { label: 'Switch', prefix: 'SW', category: 'switch' },
  hub: { label: 'Hub', prefix: 'HUB', category: 'switch' },
  router: { label: 'Roteador', prefix: 'R', category: 'router' },
  router_wifi: { label: 'Roteador Wi-Fi', prefix: 'RW', category: 'router' },
}

export const isDeviceType = (type) => Object.hasOwn(DEVICE_TYPES, type)

export const categoryOf = (device) => DEVICE_TYPES[device?.type]?.category ?? 'end'
