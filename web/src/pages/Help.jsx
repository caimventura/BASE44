import { PageHeader } from '../components/ui.jsx'
import { Link } from '../lib/router.jsx'
import { BotIcon, CableIcon, TerminalIcon } from '../components/icons.jsx'

const PC_COMMANDS = [
  ['ipconfig', 'Mostra IP, máscara, gateway e MAC da interface.'],
  ['ipconfig /all', 'Configuração detalhada, incluindo DHCP e rede.'],
  ['ipconfig /renew', 'Pede um endereço a um servidor DHCP (DORA).'],
  ['ping <IP>', 'Testa a comunicação com outro equipamento.'],
  ['tracert <IP>', 'Mostra o caminho salto a salto.'],
  ['nslookup <nome>', 'Consulta o servidor DNS.'],
  ['arp -a', 'Tabela ARP com vizinhos ativos.'],
]

const CLI_COMMANDS = [
  ['enable', 'Entra no modo privilegiado (#).'],
  ['configure terminal', 'Entra no modo de configuração global.'],
  ['hostname NOME', 'Define o nome do equipamento.'],
  ['interface Gig0/0', 'Entra na configuração de uma interface.'],
  ['ip address IP MASCARA', 'Define o endereço da interface.'],
  ['no shutdown / shutdown', 'Ativa ou desativa a interface.'],
  ['switchport mode access|trunk', 'Define o modo da porta.'],
  ['switchport access vlan 10', 'Associa a porta a uma VLAN.'],
  ['ip route REDE MASCARA NEXT', 'Adiciona uma rota estática.'],
  ['show ip interface brief', 'Resumo das interfaces.'],
  ['show ip route', 'Tabela de encaminhamento.'],
  ['show vlan brief', 'VLANs e portas associadas.'],
  ['show mac address-table', 'Tabela MAC derivada das ligações.'],
  ['show running-config', 'Configuração ativa.'],
  ['write memory', 'Guarda a configuração em startup-config.'],
  ['ping IP', 'Testa a comunicação a partir do equipamento.'],
]

export default function Help() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Documentação"
        title="Ajuda"
        description="Guia rápido do simulador, comandos suportados e glossário de redes."
      />

      <div className="helpgrid">
        <section className="card">
          <h2>Como usar o simulador</h2>
          <ol className="steps">
            <li>Abra <strong>Equipamentos</strong> e escolha um tipo. Clique no mapa para o colocar.</li>
            <li>Arraste os equipamentos para os posicionar. Use a roda do rato ou os botões de zoom para aproximar.</li>
            <li>Selecione <strong>Cabo</strong>, escolha o tipo e clique primeiro na porta de origem e depois na de destino.</li>
            <li>Clique num equipamento e escolha <strong>Configurar</strong> para definir IP, máscara, gateway, VLANs, rotas e serviços.</li>
            <li>Use o <strong>Terminal</strong> de cada equipamento para executar comandos.</li>
            <li>Mude para o modo <strong>Simulação</strong>, escolha origem e destino e execute um ping para ver o percurso do pacote.</li>
            <li>Guarde o laboratório. Todos os equipamentos, posições, cabos e configurações ficam registados.</li>
          </ol>
          <p className="muted small">
            Ações como desfazer, refazer, organizar, exportar PNG e limpar estão na barra superior.
          </p>
        </section>

        <section className="card">
          <h2><CableIcon width={18} height={18} /> Cabos e estados</h2>
          <ul className="list list--plain">
            <li><span className="dot dot--blue" /> Ethernet direto — equipamentos de categorias diferentes (PC–switch).</li>
            <li><span className="dot dot--sky" /> Ethernet cruzado — equipamentos do mesmo tipo (PC–PC).</li>
            <li><span className="dot dot--amber" /> Fibra ótica — ligações de maior alcance.</li>
            <li><span className="dot dot--violet" /> Serial — apenas entre routers.</li>
            <li><span className="dot dot--slate" /> Consola — gestão de equipamentos.</li>
            <li><span className="dot dot--green" /> Wireless — exige interfaces sem fios e SSID configurado.</li>
          </ul>
          <p className="muted small">
            O ponto no meio do cabo indica o estado: verde ativo, vermelho com falha (porta
            desligada), cinza com equipamento desligado.
          </p>
        </section>

        <section className="card">
          <h2><TerminalIcon width={18} height={18} /> Comandos de computador</h2>
          <table className="table table--tight">
            <tbody>
              {PC_COMMANDS.map(([command, description]) => (
                <tr key={command}>
                  <td className="mono">{command}</td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2><TerminalIcon width={18} height={18} /> CLI de routers e switches</h2>
          <table className="table table--tight">
            <tbody>
              {CLI_COMMANDS.map(([command, description]) => (
                <tr key={command}>
                  <td className="mono">{command}</td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">
            Ambiente educativo inspirado em CLI de rede. Não replica software oficial de nenhum fabricante.
          </p>
        </section>

        <section className="card">
          <h2><BotIcon width={18} height={18} /> NETBOT</h2>
          <p className="muted">
            O assistente lê a topologia atual e responde com dados concretos: endereços, VLANs,
            rotas, serviços e o motivo das falhas de comunicação. Abra-o no simulador pelo botão
            NETBOT. As respostas são geradas por regras determinísticas — não inventa configurações.
          </p>
        </section>

        <section className="card">
          <h2>Glossário</h2>
          <dl className="glossary">
            <div><dt>IP</dt><dd>Identificador lógico de uma interface numa rede.</dd></div>
            <div><dt>Máscara</dt><dd>Define a parte de rede e a parte de host do endereço.</dd></div>
            <div><dt>Gateway</dt><dd>Router que permite sair da sub-rede local.</dd></div>
            <div><dt>VLAN</dt><dd>Rede lógica isolada dentro de switches.</dd></div>
            <div><dt>Trunk</dt><dd>Porta que transporta várias VLANs entre equipamentos.</dd></div>
            <div><dt>ARP</dt><dd>Resolve um IP no MAC correspondente dentro da LAN.</dd></div>
            <div><dt>DHCP</dt><dd>Distribui endereços IP automaticamente (DORA).</dd></div>
            <div><dt>DNS</dt><dd>Traduz nomes em endereços IP.</dd></div>
            <div><dt>NAT</dt><dd>Traduz endereços privados em públicos.</dd></div>
          </dl>
        </section>
      </div>

      <section className="card noticecard">
        <div>
          <h3>Aviso educativo</h3>
          <p className="muted">
            O NETLAB ACADEMY é um simulador educativo. Não executa sistemas operativos Cisco nem
            qualquer software oficial de fabricantes, e não reproduz integralmente o comportamento
            de equipamentos físicos. Todos os resultados são calculados a partir da topologia e da
            configuração criadas por si.
          </p>
        </div>
        <Link className="btn btn--primary btn--tiny" to="/simulador">Abrir simulador</Link>
      </section>
    </div>
  )
}
