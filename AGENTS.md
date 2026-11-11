# NETLAB ACADEMY

Simulador educativo de redes de computadores, em português, com editor de topologias,
motor de simulação, terminal/CLI, cursos, laboratórios avaliados e assistente NETBOT.

## Run

```bash
docker compose -f docker-compose.base44.yml up -d
```

Preview: <http://localhost:3000>. `ps` deve mostrar `db`, `api` e `web` saudáveis; `migrate`
sai com código 0 por desenho.

### Contas de demonstração (semeadas no primeiro arranque)

| Perfil | E-mail | Palavra-passe |
| --- | --- | --- |
| Estudante | `aluno@netlab.pt` | `netlab123` |

A conta de professor de demonstração foi retirada (`seed.js` apaga
`professor@netlab.pt`); o perfil de professor é atribuído pela instituição. A página de
autenticação só tem o botão "Entrar com a conta de estudante de demonstração".

## Arquitetura

- **`api/`** — Express + PostgreSQL. Todo o estado vive na base de dados; nenhum resultado de
  simulação é inventado no cliente.
  - `src/auth.js` — sessões em BD, cookies HttpOnly, scrypt para palavras-passe, rotas de
    recuperação de palavra-passe (o código é devolvido na própria resposta porque não há
    servidor de e-mail neste ambiente).
  - `src/projects.js` — projetos, dispositivos, cabos, anotações, gravação integral da topologia
    (`PUT /api/projects/:id/topology`, usada pelo editor e pelo desfazer/refazer), ping/tracert,
    DHCP, DNS, navegador simulado, CLI e NETBOT.
  - `src/learning.js` — cursos, lições, laboratórios, avaliações, progresso, área do professor.
  - `src/curriculum.js` — currículo progressivo: 5 módulos (40 lições) do zero, com explicações,
    exemplos, testes com `explanation` e `practice` (laboratório "aprender na prática").
  - `src/content.js` — reexporta o currículo e define os 10 laboratórios avaliados.
  - `src/catalog.js` — catálogo de 20 equipamentos (duplicado em `web/src/lib/catalog.js`).
  - `src/engine/` — motor independente da interface: `ip.js` (matemática IPv4), `config.js`
    (normalização de configuração), `topology.js` (grafo físico/L2, VLANs), `ping.js`
    (encaminhamento, rotas, ARP), `services.js` (DHCP/DNS), `cli.js` (modos e comandos),
    `netbot.js` (diagnóstico), `evaluate.js` (critérios dos laboratórios), `pdu.js` (PDU
    simples/complexo com protocolo, TTL, tamanho, sequência e camadas OSI).
- **`web/`** — React 18 + Vite, single origin (Vite faz proxy de `/api`).
  - `src/App.jsx` — router próprio (`src/lib/router.jsx`), gate de autenticação e rotas.
  - `src/pages/` — painel, projetos, cursos, lição, exercícios, avaliações, ajuda, perfil,
    professor e vista pública de projeto partilhado.
  - `src/components/sim/` — `SimulatorPage` (estado do editor), `Workspace` (canvas SVG com
    arrastar, zoom e pan), `DeviceDialog` + `DeviceConfigTabs`, `TerminalTab`, `BrowserTab`,
    `SimulationPanel`, `NetbotPanel`, `PortPicker`. O NETBOT aplica configurações só depois do
    clique em "Aplicar configuração". `OsiGame` é o jogo DESAFIO OSI (4 níveis).
- **`api/db/schema.sql`** — schema idempotente, reaplicado em cada arranque pelo serviço `migrate`.

## Non-obvious things

- **Topologia em percentagem (0–100)** para o mesmo layout servir telemóvel e computador.
  Arrastar é feito com eventos de pointer (`touch-action: none`), com limiar de 6px entre toque
  e arrasto.
- **O editor grava sempre a topologia inteira** (`PUT /topology`). É isso que torna
  desfazer/refazer simples: o cliente guarda instantâneos e reenvia-os. Dispositivos com `id`
  negativo são inseridos; ids que já não existem na BD são reinseridos e os cabos religados pelo
  mapa de ids devolvido.
- **Portas são reatribuídas no servidor** quando não vêm no payload (`pickPort`), e os cabos são
  substituídos em bloco na gravação.
- **Categorias (`end` / `switch` / `router` / `ap`) determinam o comportamento**, não o tipo
  concreto. Switches e APs são transparentes ao encaminhamento; routers/firewalls/modem decidem
  por tabela de rotas.
- **`findHostInLan`** procura o next-hop apenas no mesmo domínio L2 (não atravessa routers), por
  isso um gateway em falta produz uma mensagem específica em vez de um falso sucesso.
- **VLANs** são validadas em cada switch do caminho: portas access com VLANs diferentes falham
  com o código `vlan`; trunks usam a lista de VLANs permitidas.
- **CLI**: o modo e a interface ativa fazem parte da configuração guardada (`cliInterface`), para
  que `interface Gig0/0` seguido de `ip address` funcione em pedidos separados.
- **O DHCP** atribui o primeiro endereço livre do pool no domínio de difusão e grava a
  configuração do cliente; o processo DORA é devolvido como eventos.
- **A avaliação dos laboratórios** corre sobre o estado real (equipamentos, cabos, IPs, VLANs,
  pings) e converte os critérios para a escala 0–20.
- **`BASE44_PREVIEW_MODE`**: `web/vite.config.js` só aceita o host público do sandbox quando a
  flag vale exatamente `1`; fora do sandbox mantém a allowlist por omissão.
- **O seed espera pelo schema**: a API pode reiniciar (`node --watch`, `restart: on-failure`) antes
  de o serviço `migrate` terminar, por isso `seedDatabase()` verifica `to_regclass` das tabelas
  `courses`/`progress_records` (até 90 s) antes de escrever. Sem erro `relation "courses" does not exist`.
- **A gravação da topologia bloqueia o projeto** (`SELECT … FOR UPDATE` sobre `projects`) para
  serializar pedidos simultâneos; sem isso, duas gravações inseriam equipamentos com o mesmo nome
  e a segunda falhava com `23505`.
- **O currículo é semeado por módulo**: `seedDatabase()` apaga cursos/avaliações fora da lista
  (as lições saem em cascata), por isso renomear um curso antigo remove-o da base.
- **Máscaras**: aceitam-se `255.255.255.0`, `24`, `/24` e `192.168.1.10/24`; a validação exige bits
  contíguos e devolve mensagens pedagógicas (`maskError`). O cliente tem a mesma lógica em
  `web/src/lib/topology.js`.
- **O NETBOT não inventa configurações**: IP sugerido vem da primeira rede real do segmento
  (ou 192.168.1.0/24 sem contexto), evitando IPs usados e o gateway; DHCP só é dado como
  disponível se existir servidor com o serviço ativo.
- **Área de trabalho**: a "planta" tem `min-width: 1180px` para permitir topologias grandes; o
  editor faz `fitToView` ao abrir, ao redimensionar e ao recolher/abrir painéis. Recolher a
  biblioteca ou o painel usa as classes `sim__body--no-palette` / `sim__body--no-side` (a grelha
  alarga); no telemóvel o painel lateral oculto usa `display:none`, porque um `transform` deixava
  um vazio com a altura do painel. Posições continuam em percentagem (5–95), por isso
  abrir/fechar painéis não move equipamentos.
- **Navegação no mapa**: roda do rato faz zoom centrado no cursor, dois dedos fazem pinch-zoom e
  arrastar o fundo (ferramenta Selecionar ou Navegar) desloca o cenário. `.stage` tem
  `touch-action:none`.
- **Ferramentas no telemóvel**: em `max-width: 760px` a `.sim__bar` é uma doca fixa no fundo e a
  `.tabbar` do shell esconde-se em `.shell--sim` (classe adicionada em `Layout.jsx` para rotas
  `/simulador`); `.sim__body` reserva `padding-bottom` para a doca.
- **Cabos**: `CABLE_TYPES` em `web/src/lib/catalog.js` tem `color` e `dash` no estilo Packet
  Tracer (direto preto contínuo, cruzado azul tracejado, fibra laranja, serial vermelho, consola
  azul-claro, wireless verde tracejado). O mapa usa `info.dash`; ao selecionar um cabo aparece a
  etiqueta do tipo com amostra de cor no mapa e no painel inferior.
- **Estado ligado/desligado**: o ponto do equipamento só fica verde se existir pelo menos um cabo;
  sem cabos fica cinzento (`node__status--idle`). No separador Interfaces, a etiqueta mostra
  `ligada` / `sem cabo` / `admin down` conforme os cabos reais, não o estado administrativo.
  O modal de configuração abre alinhado ao topo no telemóvel para não ficar fora do ecrã.
- **Interfaces com nomes Cisco**: `catalog.js` guarda `name` (usado nos cabos e na CLI, ex.
  `Gig0/0`) e `label` (nome completo, ex. `GigabitEthernet0/0`). NÃO renomear `name`: os cabos
  guardados referenciam-no. O switch tem 24 portas Fast Ethernet + 2 Gigabit; portas antigas
  `Fa0/1..8` continuam válidas.
- **PDU**: `POST /api/projects/:id/pdu` recebe `{from, to, kind: 'simple'|'complex', protocol,
  ttl, size, sequence, hostname}`. O simples é um ICMP Echo; o complexo valida o serviço no
  destino (HTTP/HTTPS/FTP/DNS) e expira o TTL no router correto.
- **Ligação router↔switch**: a interface do router sem IP aparece a tracejado âmbar (não verde)
  e o ping explica que falta rota; uma interface em `shutdown` que serve a rede de destino é
  reportada como `link-down` em vez de "falta de rota".
- **Exportação**: o PNG é um relatório (cabeçalho, topologia com portas, tabela de endereçamento);
  o JSON exporta o laboratório inteiro para backup offline — não há custo nem serviços externos.
- **Registo público cria sempre estudantes**: `POST /api/auth/register` ignora `role` no corpo.
  O perfil de professor é atribuído pela instituição na base de dados:
  `UPDATE users SET role = 'teacher' WHERE email = '…';` (sem isso, um cliente HTTP podia
  registar-se como professor e ler as submissões de todos os alunos).
- **A porta wireless é partilhada**: todos os clientes associados usam a mesma `Wlan0` do
  router/access point (`freePort` com `cable: 'wireless'` não procura porta livre). As portas de
  cobre continuam a ser exclusivas. O access point tem `Eth0` + `Wlan0`.
- **DHCP a partir do terminal**: `ipconfig /renew` aplica a lease à configuração da sessão da CLI
  (a API persiste-a), para o endereço não desaparecer ao fechar o diálogo.
- **Sem serviços externos nem credenciais**: não há secrets.

## Verify

```bash
curl -s http://localhost:3000/api/health            # {"ok":true,"database":"up"}
curl -s -c /tmp/c -H 'Content-Type: application/json' \
  -d '{"email":"aluno@netlab.pt","password":"netlab123"}' \
  http://localhost:3000/api/auth/login
curl -s -b /tmp/c http://localhost:3000/api/dashboard
```

Testes de motor já executados nesta base (podem ser repetidos com um script Node no contentor
`api`):

- dois PCs na mesma sub-rede → ping OK; laboratório 1 avalia 20/20;
- LAN com switch, VLANs (mesma VLAN comunica, VLANs diferentes falham com código `vlan`);
- DHCP DORA num servidor + cliente (`ipconfig /renew`);
- dois routers com rotas estáticas → ping entre redes OK, tracert com 4 saltos, laboratório 9 = 20;
- CLI: `show ip route`, `interface` + `ip address`, `no shutdown`, `ip route`, `write memory`;
- validações: IP inválido recusado com 400, porta em `shutdown` explicada no ping;
- desfazer: repor instantâneo com dispositivo eliminado volta a criá-lo e religa os cabos.

Na interface: entrar com a conta de demonstração, abrir **Simulador**, configurar um PC, executar
um ping no modo Simulação e ver os detalhes do pacote. Criar e apagar um dispositivo é o teste
mais rápido de ciclo completo.
