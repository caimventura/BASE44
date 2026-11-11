// Dados do jogo DESAFIO OSI — MONTA A TORRE.

export const OSI_LAYERS = [
  {
    number: 7,
    name: 'Aplicação',
    fn: 'Serviços que o utilizador usa diretamente: páginas web, correio, nomes.',
    protocols: ['HTTP', 'HTTPS', 'DNS', 'SMTP', 'FTP'],
    equipment: 'Servidores e programas',
  },
  {
    number: 6,
    name: 'Apresentação',
    fn: 'Formato, codificação, compressão e cifra dos dados.',
    protocols: ['TLS', 'JPEG', 'PNG', 'UTF-8'],
    equipment: 'Software de aplicação',
  },
  {
    number: 5,
    name: 'Sessão',
    fn: 'Abre, mantém e fecha a conversa entre dois programas.',
    protocols: ['RPC', 'NetBIOS'],
    equipment: 'Sistemas operativos',
  },
  {
    number: 4,
    name: 'Transporte',
    fn: 'Divide em segmentos, garante entrega e controla o fluxo.',
    protocols: ['TCP', 'UDP'],
    equipment: 'Firewalls com estado',
  },
  {
    number: 3,
    name: 'Rede',
    fn: 'Endereça pacotes com IP e decide o caminho entre redes.',
    protocols: ['IP', 'ICMP', 'ARP (auxiliar)'],
    equipment: 'Routers',
  },
  {
    number: 2,
    name: 'Ligação de dados',
    fn: 'Organiza bits em quadros e usa endereços MAC no segmento local.',
    protocols: ['Ethernet', 'VLAN', 'PPP'],
    equipment: 'Switches',
  },
  {
    number: 1,
    name: 'Física',
    fn: 'Transmite os bits pelo meio: cobre, fibra ou ar.',
    protocols: ['RJ45', 'Fibra', 'Wi-Fi (rádio)'],
    equipment: 'Cabos e conectores',
  },
]

export const layerByNumber = (number) => OSI_LAYERS.find((layer) => layer.number === number)

/** Nível 1 — ordem das camadas (base = 1). */
export const level1 = {
  title: 'Nível 1 — Ordena as sete camadas',
  description: 'Coloca cada camada no lugar certo, da base (1) até ao topo (7).',
  slots: OSI_LAYERS.map((layer) => ({ id: `slot-${layer.number}`, label: `Camada ${layer.number}`, number: layer.number })),
  items: OSI_LAYERS.map((layer) => ({
    id: `layer-${layer.number}`,
    label: `Camada ${layer.number} — ${layer.name}`,
    belongsTo: layer.number,
    hint: layer.fn,
  })),
}

/** Nível 2 — associar cada camada à sua função. */
export const level2 = {
  title: 'Nível 2 — Associa cada camada à sua função',
  description: 'Arrasta (ou toca e escolhe) a função para a camada certa.',
  slots: OSI_LAYERS.map((layer) => ({ id: `slot-${layer.number}`, label: `${layer.number}. ${layer.name}`, number: layer.number })),
  items: OSI_LAYERS.map((layer) => ({
    id: `fn-${layer.number}`,
    label: layer.fn,
    belongsTo: layer.number,
    hint: `${layer.name}: ${layer.fn}`,
  })),
}

/** Nível 3 — protocolos e equipamentos por camada. */
export const level3 = {
  title: 'Nível 3 — Protocolos e equipamentos',
  description: 'Cada protocolo ou equipamento pertence a uma camada. Coloca-o no lugar certo.',
  slots: OSI_LAYERS.map((layer) => ({ id: `slot-${layer.number}`, label: `${layer.number}. ${layer.name}`, number: layer.number })),
  items: [
    { id: 'http', label: 'HTTP', belongsTo: 7, hint: 'O HTTP é um protocolo de aplicação.' },
    { id: 'tls', label: 'TLS', belongsTo: 6, hint: 'O TLS trata da cifra dos dados: apresentação.' },
    { id: 'tcp', label: 'TCP', belongsTo: 4, hint: 'O TCP garante entrega fiável: transporte.' },
    { id: 'ip', label: 'IP', belongsTo: 3, hint: 'O IP endereça pacotes entre redes.' },
    { id: 'ethernet', label: 'Ethernet', belongsTo: 2, hint: 'A Ethernet define quadros e MACs.' },
    { id: 'rj45', label: 'Cabo RJ45', belongsTo: 1, hint: 'O cabo é o meio físico.' },
    { id: 'router', label: 'Router', belongsTo: 3, hint: 'O router decide com base no IP.' },
    { id: 'switch', label: 'Switch', belongsTo: 2, hint: 'O switch usa endereços MAC.' },
    { id: 'dns', label: 'DNS', belongsTo: 7, hint: 'O DNS é um serviço de aplicação.' },
    { id: 'udp', label: 'UDP', belongsTo: 4, hint: 'O UDP é um protocolo de transporte.' },
  ],
}

/** Nível 4 — identificar a camada onde ocorre o problema. */
export const level4 = {
  title: 'Nível 4 — Diagnóstico por camada',
  description: 'Lê o problema e escolhe a camada onde ele acontece.',
  questions: [
    {
      problem: 'O cabo de rede está desligado e a luz da porta está apagada.',
      answer: 1,
      explanation: 'Sem meio físico não há transmissão: o problema está na camada 1 (Física).',
    },
    {
      problem: 'O switch não sabe para que porta enviar o quadro.',
      answer: 2,
      explanation: 'O switch decide com base no MAC: camada 2 (Ligação de dados).',
    },
    {
      problem: 'O computador tem o IP 192.168.1.10 mas nenhuma máscara configurada.',
      answer: 3,
      explanation: 'O endereçamento IP pertence à camada 3 (Rede).',
    },
    {
      problem: 'Os segmentos chegam trocados e repetidos.',
      answer: 4,
      explanation: 'O TCP, na camada 4 (Transporte), ordena e confirma os segmentos.',
    },
    {
      problem: 'O nome www.netlab.local não é resolvido.',
      answer: 7,
      explanation: 'O DNS é um serviço de aplicação: camada 7.',
    },
    {
      problem: 'A imagem chega ao browser com cores erradas por causa da codificação.',
      answer: 6,
      explanation: 'A codificação e o formato fazem parte da camada 6 (Apresentação).',
    },
    {
      problem: 'A chamada de vídeo perde o contexto e desliga-se sozinha.',
      answer: 5,
      explanation: 'Manter a conversa aberta é responsabilidade da camada 5 (Sessão).',
    },
  ],
}

export const LEVELS = [level1, level2, level3, level4]

/** Baralha de forma determinística por tentativa (reiniciar muda a ordem). */
export function shuffle(items, seed = 1) {
  const copy = [...items]
  let state = seed
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648
    const target = state % (index + 1)
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy
}

export function explanationFor(item, slots) {
  const layer = layerByNumber(item.belongsTo)
  return `${layer.number} — ${layer.name}: ${layer.fn}`
}
