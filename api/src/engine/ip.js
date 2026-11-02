const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

export const isValidIpv4 = (value) =>
  typeof value === 'string' && IPV4_PATTERN.test(value.trim())

export const octets = (value) => value.trim().split('.').map(Number)

export const ipToInt = (ip) =>
  octets(ip).reduce((total, part) => total * 256 + part, 0)

export const intToIp = (value) => {
  const safe = Math.max(0, Math.min(0xffffffff, Math.floor(value)))
  return [24, 16, 8, 0].map((shift) => (safe >>> shift) & 255).join('.')
}

/** Máscara válida = bits contíguos a 1 seguidos de zeros. */
export function isValidMask(value) {
  if (!isValidIpv4(value)) return false
  const bits = octets(value)
    .map((part) => part.toString(2).padStart(8, '0'))
    .join('')
  return /^1*0*$/.test(bits)
}


/** Aceita "255.255.255.0", "24", "/24" ou "192.168.1.10/24". */
export function parseMaskInput(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return { mask: '', prefix: null }
  const slash = raw.match(/\/(\d{1,2})$/)
  if (slash) {
    const prefix = Number(slash[1])
    return prefix >= 0 && prefix <= 32 ? { mask: maskFromPrefix(prefix), prefix } : { mask: raw, prefix: null }
  }
  if (/^\d{1,2}$/.test(raw)) {
    const prefix = Number(raw)
    return prefix >= 0 && prefix <= 32 ? { mask: maskFromPrefix(prefix), prefix } : { mask: raw, prefix: null }
  }
  return { mask: raw, prefix: isValidMask(raw) ? prefixLength(raw) : null }
}

/** Mensagem pedagógica quando a máscara não serve. */
export function maskError(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'Indica a máscara: por exemplo 255.255.255.0 (ou /24).'
  const { mask } = parseMaskInput(raw)
  if (!isValidIpv4(mask)) return 'Máscara inválida: são quatro números entre 0 e 255 separados por pontos.'
  if (!isValidMask(mask)) return 'Máscara inválida: os bits de rede devem ser contínuos (ex.: 255.255.255.0).'
  return ''
}

export function networkOf(ip, mask) {
  if (!isValidIpv4(ip) || !isValidIpv4(mask)) return null
  const address = octets(ip)
  const maskBits = octets(mask)
  return address.map((part, index) => part & maskBits[index]).join('.')
}

export function prefixLength(mask) {
  if (!isValidIpv4(mask)) return 0
  return octets(mask)
    .map((part) => part.toString(2).padStart(8, '0'))
    .join('')
    .split('')
    .filter((bit) => bit === '1').length
}

export const maskFromPrefix = (prefix) => {
  const bits = '1'.repeat(Math.max(0, Math.min(32, prefix))).padEnd(32, '0')
  return bits.match(/.{8}/g).map((group) => parseInt(group, 2)).join('.')
}

export function sameSubnet(ipA, maskA, ipB, maskB = maskA) {
  const netA = networkOf(ipA, maskA)
  const netB = networkOf(ipB, maskB || maskA)
  return netA !== null && netB !== null && netA === netB
}

export const subnetLabel = (ip, mask) => {
  const network = networkOf(ip, mask)
  return network ? `${network}/${prefixLength(mask)}` : 'sub-rede indefinida'
}

export const inRange = (value, start, end) => {
  const number = ipToInt(value)
  return number >= ipToInt(start) && number <= ipToInt(end)
}

export const nextIp = (ip) => intToIp(ipToInt(ip) + 1)

/** MAC determinístico por equipamento/interface — nunca aleatório entre pedidos. */
export function macOf(deviceId, interfaceName) {
  const hex = (value, size) => value.toString(16).toUpperCase().padStart(size, '0')
  const suffix = [...String(interfaceName)].reduce((total, char) => total + char.charCodeAt(0), 0)
  return `00:1A:2B:${hex(deviceId % 256, 2)}:${hex(suffix % 256, 2)}:01`
}

export function isValidMac(value) {
  return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(String(value ?? '').trim())
}

/** Soma de verificação simples usada para latências estáveis por par. */
export const stableJitter = (fromId, toId) => ((fromId * 37 + toId * 91) % 3) + 1
