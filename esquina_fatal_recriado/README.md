# Esquina Fatal — versão com imagens incorporadas

**Para abrir o jogo sem imagens quebradas, abra `EsquinaFatal_arquivo_unico.html` ou o `index.html` desta pasta.** O fundo e os dois personagens já estão incorporados dentro do próprio HTML, então não dependem da pasta `assets`. Para usar a versão original em pastas separadas, mantenha a pasta `assets` junto do HTML.

# Esquina Fatal — interface de batalha pixel art

Esta versão atualiza a interface para se aproximar da referência enviada: skatepark noturno em pixel art, personagens nas laterais, HUDs com nível e barra de HP e painel inferior com **Soco Direto**, **Combo** e **Itens**. O combate continua conectado às rotas do Node-RED que registram partidas e turnos.

## Arquivos

- `index.html`: interface, lógica do jogo e integração HTTP.
- `assets/arena-noite.jpg`: fundo pixel art do skatepark à noite.
- `assets/skatista.png`: sprite do skatista com skate.
- `assets/mendigo.png`: sprite do inimigo.
- `flows.json`: fluxo importável para o Node-RED.
- `build-flow.js`: gerador do fluxo.
- `schema.sql`: tabelas SQLite usadas pelo fluxo.

**Importante:** mantenha a pasta `assets` na mesma pasta do `index.html`; as imagens são carregadas desses arquivos.

## Instalação / atualização

1. Baixe e extraia o ZIP completo. Mantenha a estrutura de pastas que veio dentro dele.
2. No Node-RED, confira se o pacote `node-red-node-sqlite` está instalado em **Menu → Manage palette → Install**.
3. Importe `flows.json` em **Menu → Import**. Antes de implantar, desative os fluxos antigos que usam as mesmas rotas `/eventos/...`, para evitar rotas duplicadas.
4. Clique em **Deploy** e espere a inicialização do banco.
5. Abra `http://localhost:1880/health`. O fluxo deve responder com `"ok": true` e `"status": "online"`.
6. Abra `index.html` no navegador e inicie uma partida.

O jogo continua jogável se o Node-RED estiver indisponível, mas os eventos não serão gravados no banco. O JavaScript da página chama estas rotas: `POST /eventos/partida-iniciada`, `POST /eventos/turno` e `POST /eventos/partida-finalizada`.

## Controles

Use os botões da tela. Também há atalhos de teclado: `1` Soco Direto, `2` Manobra Única, `3` Combo, `4` Itens e `5` Habilidade Especial. Na mochila, `Esc` volta para os botões da batalha.

## Banco de dados

O fluxo usa o arquivo SQLite `esquina_fatal.db` relativo à pasta de execução/configuração do Node-RED. O fluxo cria as tabelas quando implantado. Caso seu Node-RED já tenha outras rotas `/eventos/...` ativas, desative-as antes de implantar o fluxo incluído.

## Verificação

O HTML foi validado quanto à sintaxe JavaScript, IDs duplicados e existência dos arquivos de imagem. A execução real e a gravação no banco dependem de importar e implantar o fluxo no Node-RED do seu computador.
