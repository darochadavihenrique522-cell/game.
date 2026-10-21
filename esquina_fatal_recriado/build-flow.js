// Gera flows.json para importar no Node-RED.
// Requer: npm install node-red-node-sqlite (instale pela paleta do Node-RED se preferir).
// Deixe este arquivo e schema.sql na mesma pasta e execute: node build-flow.js
const fs = require('fs');
const path = require('path');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const setJsonHeadersCode = "function setJsonHeaders(msg) { msg.headers = Object.assign({}, msg.headers, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return msg; }";
const TAB = 'esquina_fatal_tab';
const nodes = [];
let seq = 0;
const id = () => 'ef_' + (++seq).toString().padStart(4, '0');
const body = (fn) => {
  const source = fn.toString();
  return source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim();
};
const add = (node) => { nodes.push(node); return node; };
const wire = (from, to, port = 0) => { from.wires[port].push(to.id); };

add({ id: TAB, type: 'tab', label: 'Esquina Fatal - Banco e API', disabled: false, info: 'API de gravação das partidas e turnos do jogo Esquina Fatal.' });
add({ id: 'ef_sqlite_db', type: 'sqlitedb', db: 'esquina_fatal.db', mode: 'RWC' });

function functionNode(name, fn, x, y, outputs = 1) {
  return add({
    id: id(), type: 'function', z: TAB, name,
    func: setJsonHeadersCode + '\n' + body(fn), outputs, timeout: 0, noerr: 0,
    initialize: '', finalize: '', libs: [], x, y,
    wires: Array.from({ length: outputs }, () => [])
  });
}
function sqliteNode(name, x, y, mode = 'msg.topic') {
  return add({ id: id(), type: 'sqlite', z: TAB, mydb: 'ef_sqlite_db', sqlquery: mode, sql: '', name, x, y, wires: [[]] });
}
function httpIn(name, method, url, x, y) {
  return add({ id: id(), type: 'http in', z: TAB, name, url, method, upload: false, swaggerDoc: '', x, y, wires: [[]] });
}
function httpResponse(name, x, y) {
  return add({ id: id(), type: 'http response', z: TAB, name, statusCode: '', headers: {}, x, y, wires: [] });
}

function setJsonHeaders(msg) {
  msg.headers = Object.assign({}, msg.headers, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  return msg;
}

// POST /eventos/partida-iniciada
function prepararInicio() {
  const d = msg.payload || {};
  const safeText = (v, fallback, max) => {
    const s = String(v == null ? '' : v).trim().slice(0, max);
    return (s || fallback).replace(/'/g, "''");
  };
  const safeInt = (v, fallback) => {
    const n = Number(v);
    return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
  };
  const idPartida = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const jogador = safeText(d.jogador, 'Skatista', 40);
  const personagem = safeText(d.personagem, jogador.replace(/''/g, "'"), 40);
  const desafiante = safeInt(d.id_desafiante, 1);
  const oponente = safeInt(d.id_oponente, 4);
  const status = 'Em Andamento';
  const hpPlayer = safeInt(d.hp_player, 100);
  const hpMendigo = safeInt(d.hp_mendigo, 100);
  msg.dadosPartida = { id_partida: idPartida, jogador: jogador.replace(/''/g, "'"), personagem: personagem.replace(/''/g, "'"), id_desafiante: desafiante, id_oponente: oponente, status: status, hp_player: hpPlayer, hp_mendigo: hpMendigo };
  msg.topic = "INSERT INTO partidas (id_partida, jogador, personagem, id_desafiante, id_oponente, status, hp_player, hp_mendigo) VALUES (" +
    idPartida + ", '" + jogador + "', '" + personagem + "', " + desafiante + ", " + oponente + ", '" + status + "', " + hpPlayer + ", " + hpMendigo + ")";
  return msg;
}
function responderInicio() {
  setJsonHeaders(msg);
  msg.statusCode = 201;
  msg.payload = { ok: true, id_partida: msg.dadosPartida.id_partida, mensagem: 'Partida registrada.' };
  return msg;
}

// POST /eventos/turno: a validação impede SQL inválido e IDs malformados.
function prepararTurno() {
  const d = msg.payload || {};
  const intOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isSafeInteger(n) ? n : null;
  };
  const idPartida = intOrNull(d.id_partida);
  const numeroTurno = intOrNull(d.numero_turno);
  const personagem = intOrNull(d.id_personagem_atuante);
  if (!idPartida || idPartida < 1 || !numeroTurno || numeroTurno < 1 || personagem === null || personagem < 0) {
    setJsonHeaders(msg);
    msg.statusCode = 400;
    msg.payload = { ok: false, error: 'Campos obrigatórios inválidos: id_partida, numero_turno e id_personagem_atuante.' };
    return [null, msg];
  }
  const safeText = (v) => String(v == null ? '' : v).slice(0, 80).replace(/'/g, "''");
  const item = intOrNull(d.id_item_utilizado);
  const impactoN = Number(d.valor_impacto);
  const impacto = Number.isFinite(impactoN) ? Math.max(0, Math.min(1000000, impactoN)) : 0;
  const hpPlayerN = Number(d.hp_player);
  const hpMendigoN = Number(d.hp_mendigo);
  const hpPlayer = Number.isFinite(hpPlayerN) ? Math.max(0, Math.min(1000000, Math.trunc(hpPlayerN))) : 0;
  const hpMendigo = Number.isFinite(hpMendigoN) ? Math.max(0, Math.min(1000000, Math.trunc(hpMendigoN))) : 0;
  const tipo = safeText(d.tipo_acao || 'Ação');
  msg.dadosTurno = { id_partida: idPartida, numero_turno: numeroTurno };
  msg.topic = "INSERT INTO turnos (id_partida, numero_turno, id_personagem_atuante, tipo_acao, id_item_utilizado, valor_impacto, hp_player, hp_mendigo) VALUES (" +
    idPartida + ", " + numeroTurno + ", " + personagem + ", '" + tipo + "', " + (item === null ? 'NULL' : item) + ", " + impacto + ", " + hpPlayer + ", " + hpMendigo + ")";
  return [msg, null];
}
function responderTurno() {
  setJsonHeaders(msg);
  msg.statusCode = 201;
  msg.payload = { ok: true, id_partida: msg.dadosTurno.id_partida, numero_turno: msg.dadosTurno.numero_turno, mensagem: 'Turno registrado.' };
  return msg;
}

// POST /eventos/partida-finalizada
function prepararFinalizacao() {
  const d = msg.payload || {};
  const idPartida = Number(d.id_partida);
  if (!Number.isSafeInteger(idPartida) || idPartida < 1) {
    setJsonHeaders(msg);
    msg.statusCode = 400;
    msg.payload = { ok: false, error: 'id_partida inválido.' };
    return [null, msg];
  }
  const winnerN = (d.id_vencedor === null || d.id_vencedor === undefined || d.id_vencedor === '') ? null : Number(d.id_vencedor);
  const winner = (winnerN === 1 || winnerN === 4) ? winnerN : null;
  const status = ['Finalizada', 'Abandonada', 'Em Andamento'].indexOf(String(d.status || 'Finalizada')) >= 0 ? String(d.status || 'Finalizada') : 'Finalizada';
  const safeInt = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1000000, Math.trunc(n))) : 0; };
  const hpPlayer = safeInt(d.hp_player);
  const hpMendigo = safeInt(d.hp_mendigo);
  const dateRaw = String(d.data_fim || new Date().toISOString()).slice(0, 40).replace(/'/g, "''");
  msg.dadosFinal = { id_partida: idPartida, id_vencedor: winner, status: status, hp_player: hpPlayer, hp_mendigo: hpMendigo };
  msg.topic = "UPDATE partidas SET id_vencedor=" + (winner === null ? 'NULL' : winner) + ", status='" + status + "', hp_player=" + hpPlayer + ", hp_mendigo=" + hpMendigo + ", data_fim='" + dateRaw + "' WHERE id_partida=" + idPartida;
  return [msg, null];
}
function responderFinalizacao() {
  setJsonHeaders(msg);
  msg.statusCode = 200;
  msg.payload = { ok: true, id_partida: msg.dadosFinal.id_partida, mensagem: 'Partida finalizada.' };
  return msg;
}

// GET /eventos/partida/:id
function prepararConsultaPartida() {
  const n = Number(msg.req && msg.req.params && msg.req.params.id);
  if (!Number.isSafeInteger(n) || n < 1) {
    setJsonHeaders(msg);
    msg.statusCode = 400;
    msg.payload = { ok: false, error: 'ID da partida inválido.' };
    return [null, msg];
  }
  msg.idConsulta = n;
  msg.topic = 'SELECT * FROM partidas WHERE id_partida=' + n;
  return [msg, null];
}
function responderConsultaPartida() {
  setJsonHeaders(msg);
  const rows = Array.isArray(msg.payload) ? msg.payload : [];
  if (!rows.length) {
    msg.statusCode = 404;
    msg.payload = { ok: false, error: 'Partida não encontrada.' };
  } else {
    msg.statusCode = 200;
    msg.payload = { ok: true, partida: rows[0] };
  }
  return msg;
}

// GET /eventos/partida/:id/turnos
function prepararConsultaTurnos() {
  const n = Number(msg.req && msg.req.params && msg.req.params.id);
  if (!Number.isSafeInteger(n) || n < 1) {
    setJsonHeaders(msg);
    msg.statusCode = 400;
    msg.payload = { ok: false, error: 'ID da partida inválido.' };
    return [null, msg];
  }
  msg.idConsulta = n;
  msg.topic = 'SELECT * FROM turnos WHERE id_partida=' + n + ' ORDER BY numero_turno ASC';
  return [msg, null];
}
function responderConsultaTurnos() {
  setJsonHeaders(msg);
  msg.statusCode = 200;
  msg.payload = { ok: true, id_partida: msg.idConsulta, turnos: Array.isArray(msg.payload) ? msg.payload : [] };
  return msg;
}

function endpointGetPost({ label, method, url, y, prepareFn, responseFn, outputs = 1 }) {
  const input = httpIn(label, method, url, 110, y);
  const prep = functionNode('Validar e preparar: ' + label, prepareFn, 320, y, outputs);
  wire(input, prep);
  const sql = sqliteNode('SQLite: ' + label, 540, y);
  const finish = functionNode('Montar resposta: ' + label, responseFn, 740, y);
  const response = httpResponse('Resposta HTTP: ' + label, 940, y);
  if (outputs === 2) wire(prep, sql, 0); else wire(prep, sql, 0);
  wire(sql, finish);
  wire(finish, response);
  if (outputs === 2) wire(prep, response, 1);
}

// Start writes the initial record and returns the exact ID needed by the page.
endpointGetPost({ label: 'Criar partida', method: 'post', url: '/eventos/partida-iniciada', y: 150, prepareFn: prepararInicio, responseFn: responderInicio });
endpointGetPost({ label: 'Registrar turno', method: 'post', url: '/eventos/turno', y: 290, prepareFn: prepararTurno, responseFn: responderTurno, outputs: 2 });
endpointGetPost({ label: 'Finalizar partida', method: 'post', url: '/eventos/partida-finalizada', y: 430, prepareFn: prepararFinalizacao, responseFn: responderFinalizacao, outputs: 2 });
endpointGetPost({ label: 'Consultar partida', method: 'get', url: '/eventos/partida/:id', y: 570, prepareFn: prepararConsultaPartida, responseFn: responderConsultaPartida, outputs: 2 });
endpointGetPost({ label: 'Consultar turnos', method: 'get', url: '/eventos/partida/:id/turnos', y: 710, prepareFn: prepararConsultaTurnos, responseFn: responderConsultaTurnos, outputs: 2 });

// Check if the server/API flow is deployed and responding.
const healthIn = httpIn('Verificar API', 'get', '/health', 110, 870);
const healthFn = functionNode('Resposta de saúde', function health() {
  setJsonHeaders(msg);
  msg.statusCode = 200;
  msg.payload = { ok: true, servico: 'Esquina Fatal API', status: 'online' };
  return msg;
}, 350, 870);
const healthRes = httpResponse('Resposta health', 570, 870);
wire(healthIn, healthFn); wire(healthFn, healthRes);

// OPTIONS endpoints handle browser CORS preflight requests (Content-Type: application/json).
function optionsEndpoint(url, y) {
  const input = httpIn('CORS OPTIONS ' + url, 'options', url, 110, y);
  const prep = functionNode('Responder CORS ' + url, function cors() {
    setJsonHeaders(msg);
    msg.statusCode = 204;
    msg.payload = '';
    return msg;
  }, 350, y);
  const res = httpResponse('Resposta OPTIONS ' + url, 590, y);
  wire(input, prep); wire(prep, res);
}
[
  ['/eventos/partida-iniciada', 970],
  ['/eventos/turno', 1030],
  ['/eventos/partida-finalizada', 1090],
  ['/eventos/partida/:id', 1150],
  ['/eventos/partida/:id/turnos', 1210],
  ['/health', 1270]
].forEach(([url, y]) => optionsEndpoint(url, y));

// Initialize tables shortly after Node-RED deploys the flow.
const initInject = add({
  id: id(), type: 'inject', z: TAB, name: 'Criar tabelas do banco',
  props: [{ p: 'payload' }], repeat: '', crontab: '', once: true, onceDelay: '0.5',
  topic: '', payload: '', payloadType: 'date', x: 110, y: 60, wires: [[]]
});
const initPrepare = functionNode('Carregar schema.sql', function loadSchema() {
  msg.topic = '';
  return msg;
}, 300, 60);
// Em modo batch, o nó SQLite executa o SQL que chega em msg.topic.
initPrepare.func = 'msg.topic = ' + JSON.stringify(schema) + ';\nreturn msg;';
const initSql = add({ id: id(), type: 'sqlite', z: TAB, mydb: 'ef_sqlite_db', sqlquery: 'batch', sql: '', name: 'Executar schema.sql', x: 520, y: 60, wires: [[]] });
wire(initInject, initPrepare);
wire(initPrepare, initSql);

// Errors from route/database nodes become JSON responses rather than silent failures.
function responderErro() {
  setJsonHeaders(msg);
  msg.statusCode = 500;
  const text = msg.error && msg.error.message ? msg.error.message : 'Falha desconhecida no fluxo/banco SQLite.';
  msg.payload = { ok: false, error: text };
  return msg;
}
const errorCatch = add({ id: id(), type: 'catch', z: TAB, name: 'Capturar erros do fluxo', scope: null, uncaught: false, x: 110, y: 1370, wires: [[]] });
const errorFn = functionNode('Responder erro em JSON', responderErro, 350, 1370);
const errorResponse = httpResponse('Resposta de erro', 570, 1370);
wire(errorCatch, errorFn); wire(errorFn, errorResponse);

fs.writeFileSync(path.join(__dirname, 'flows.json'), JSON.stringify(nodes, null, 2), 'utf8');
let validFunctions = 0;
for (const node of nodes) {
  if (node.type === 'function') {
    // Same argument names made available by the Node-RED Function node.
    new Function('msg', 'node', 'context', 'flow', 'global', node.func);
    validFunctions++;
  }
}
JSON.parse(fs.readFileSync(path.join(__dirname, 'flows.json'), 'utf8'));
console.log('flows.json criado e validado: ' + nodes.length + ' nós; ' + validFunctions + ' funções JavaScript compiladas.');
