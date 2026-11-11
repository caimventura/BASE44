export const DEVICE_TYPES = {
  pc: { label: 'Computador', category: 'end' },
  notebook: { label: 'Notebook', category: 'end' },
  server: { label: 'Servidor', category: 'end' },
  phone: { label: 'Celular', category: 'end' },
  printer: { label: 'Impressora', category: 'end' },
  switch: { label: 'Switch', category: 'switch' },
  hub: { label: 'Hub', category: 'switch' },
  router: { label: 'Roteador', category: 'router' },
  router_wifi: { label: 'Roteador Wi-Fi', category: 'router' },
}

export const DEVICE_GROUPS = [
  { title: 'Dispositivos finais', types: ['pc', 'notebook', 'server', 'phone', 'printer'] },
  { title: 'Switches', types: ['switch', 'hub'] },
  { title: 'Roteadores', types: ['router', 'router_wifi'] },
]

export const labelOf = (type) => DEVICE_TYPES[type]?.label ?? type

export const categoryOf = (type) => DEVICE_TYPES[type]?.category ?? 'end'
