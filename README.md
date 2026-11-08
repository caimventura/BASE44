# NETLAB ACADEMY — simulador interativo de redes de computadores

Plataforma educativa em português para aprender redes construindo, configurando e testando
topologias no navegador. Inspirada nas funcionalidades educativas de simuladores de redes, mas
com identidade, interface e motor próprios.

## O que está implementado

**Simulador**
- 20 equipamentos em 3 categorias: PCs, portátil, servidor, impressora, telefone IP, smartphone,
  tablet, câmara IP, sensor IoT; routers, switch, switch multicamada, hub, access point, modem,
  firewall, router wireless; repetidor, bridge e controlador.
- Arrastar e largar, mover, selecionar, duplicar, renomear, eliminar, zoom, navegação, grelha,
  organização automática, anotações móveis, ferramenta de apagar (equipamento/cabo/anotação),
  relatório PNG com configurações e exportação JSON do laboratório.
- Interfaces com nomenclatura Cisco (`FastEthernet0/1`, `GigabitEthernet0/0`, `Wireless0`), LED
  de estado, MAC, velocidade/duplex, porta e equipamento do outro lado do cabo.
- Desfazer e refazer reais (instantâneos da topologia reenviados ao servidor).
- Cabos Ethernet direto/cruzado, fibra, serial, consola e wireless, com portas escolhidas pelo
  utilizador, validação de capacidade e indicadores de estado (verde/vermelho/cinza).
- Configuração por equipamento: IP/máscara/gateway/DNS, DHCP, interfaces e `shutdown`, VLANs e
  trunks, tabela MAC, rotas estáticas, NAT, serviços de servidor, SSID/WPA2/WPA3/canal.
- Terminal de computador (`ipconfig`, `ping`, `tracert`, `nslookup`, `arp -a`) e CLI estilo IOS
  com quatro modos (`enable`, `configure terminal`, `interface`, `ip address`, `show …`,
  `write memory`, entre outros).
- Motor de simulação: caminho físico, sub-redes, ARP, VLANs, gateways, tabelas de rotas,
  latência/TTL, eventos passo a passo e explicação do motivo de cada falha.
- Modo tempo real e modo simulação com pacote animado, controlos de reprodução, velocidade,
  detalhes do pacote (IP, MAC, protocolo, próximo salto, resultado) e lista de eventos.
- **PDU simples** (ICMP Echo entre dois equipamentos) e **PDU complexo** (ICMP/HTTP/HTTPS/FTP/DNS
  com TTL, tamanho, sequência e nome DNS), com encapsulamento OSI e detalhe do pacote.
- DHCP com processo DORA observável e DNS com registos nome → IP.

**Aprendizagem**
- 5 cursos (15 lições) com teoria, listas, exemplos, notas e testes rápidos.
- 10 laboratórios guiados com topologia inicial, instruções, critérios e avaliação automática
  de 0 a 20 valores calculada sobre o estado real.
- 3 avaliações corrigidas no servidor.
- NETBOT: assistente que analisa a topologia e explica endereçamento, VLANs, DHCP, DNS, rotas e
  falhas de comunicação, com recomendações.

**Plataforma**
- Registo, login, recuperação de palavra-passe, perfil e histórico; palavras-passe com scrypt.
- Perfis de estudante e professor, com permissões verificadas no backend.
- Área do professor: estudantes, submissões e publicação de exercícios com critérios.
- Projetos com equipamentos, posições, cabos, configurações, VLANs, rotas e anotações guardados;
  duplicar, eliminar, renomear e partilhar (vista pública de leitura).
- Interface responsiva (computador, tablet e telemóvel) e todo o texto em português.

## Começar

```bash
docker compose -f docker-compose.base44.yml up -d
```

Abrir <http://localhost:3000> e entrar com a conta de demonstração de estudante:
`aluno@netlab.pt` / `netlab123`. A conta de professor de demonstração foi retirada; o perfil de
professor é atribuído pela instituição.

A interface é pensada primeiro para telemóvel: barra de navegação inferior, barras de ferramentas
deslizantes, biblioteca de equipamentos em folha inferior e painéis laterais em bottom sheet.

## Aviso

O NETLAB ACADEMY é um simulador educativo. Não executa sistemas operativos Cisco nem software
oficial de fabricantes e não reproduz integralmente o comportamento de equipamentos físicos.
Todos os resultados são calculados a partir da topologia e da configuração criadas pelo aluno.
