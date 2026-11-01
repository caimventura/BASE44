# NetSim

Simulador de redes no navegador, feito para o celular: monte a topologia, ligue os cabos,
configure IP e teste a conectividade com ping — como um Packet Tracer simplificado.

- `web/` — React + Vite, servido em <http://localhost:3000>.
- `api/` — Express em 8000, alcançado pelo proxy `/api` do Vite (mesma origem).
- `api/db/schema.sql` — schema idempotente + laboratório de exemplo, aplicado a cada boot.

## Rodar

```bash
docker compose -f docker-compose.base44.yml up -d
```

## Como usar

1. Toque em **PC**, **Switch** ou **Roteador** e depois no mapa para posicionar (no celular não
   precisa arrastar).
2. **Cabo** → toque nos dois dispositivos para ligá-los.
3. Toque em um dispositivo para configurar nome, IP, máscara e gateway (o roteador tem duas
   interfaces).
4. **Ping** → toque no PC de origem e no de destino: o app mostra o caminho e explica o motivo da
   falha (sem cabo, sub-redes diferentes, gateway errado, IP ausente).

O laboratório de exemplo já vem com dois PCs em um switch (192.168.0.0/24) e um roteador levando a
uma segunda sub-rede (10.0.0.0/24), então `PC1 → PC3` funciona de imediato.

## Decisões de simulação

- Switch é transparente: só repassa quadros dentro da mesma sub-rede.
- Roteador tem duas interfaces (`ip`/`mask` e `ip2`/`mask2`); cada uma atende a sub-rede do segmento
  ligado a ela.
- Ping entre sub-redes exige gateway do PC = IP do roteador naquele segmento.
- O caminho é o menor caminho no grafo de cabos (BFS), não há tabela de roteamento real.

## Nada de credenciais externas

Tudo roda no Postgres do próprio compose — nenhum serviço de terceiros.

## Override do sandbox

`web/vite.config.js` aceita o hostname do preview em `allowedHosts` **apenas** quando
`BASE44_PREVIEW_MODE=1`. Sem a variável, o Vite mantém a lista padrão.
