PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS partidas (
    id_partida INTEGER PRIMARY KEY,
    jogador TEXT NOT NULL,
    personagem TEXT NOT NULL DEFAULT 'Skatista',
    id_desafiante INTEGER NOT NULL DEFAULT 1,
    id_oponente INTEGER NOT NULL DEFAULT 4,
    id_vencedor INTEGER,
    status TEXT NOT NULL DEFAULT 'Em Andamento'
        CHECK (status IN ('Em Andamento', 'Finalizada', 'Abandonada')),
    hp_player INTEGER NOT NULL DEFAULT 100 CHECK (hp_player >= 0),
    hp_mendigo INTEGER NOT NULL DEFAULT 100 CHECK (hp_mendigo >= 0),
    data_inicio TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    data_fim TEXT
);

CREATE TABLE IF NOT EXISTS turnos (
    id_turno INTEGER PRIMARY KEY AUTOINCREMENT,
    id_partida INTEGER NOT NULL,
    numero_turno INTEGER NOT NULL CHECK (numero_turno > 0),
    id_personagem_atuante INTEGER NOT NULL,
    tipo_acao TEXT NOT NULL,
    id_item_utilizado INTEGER,
    valor_impacto REAL NOT NULL DEFAULT 0 CHECK (valor_impacto >= 0),
    hp_player INTEGER NOT NULL DEFAULT 0 CHECK (hp_player >= 0),
    hp_mendigo INTEGER NOT NULL DEFAULT 0 CHECK (hp_mendigo >= 0),
    data_registro TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (id_partida) REFERENCES partidas(id_partida) ON DELETE CASCADE,
    UNIQUE (id_partida, numero_turno)
);

CREATE INDEX IF NOT EXISTS idx_partidas_data_inicio
    ON partidas(data_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_partidas_jogador
    ON partidas(jogador);
CREATE INDEX IF NOT EXISTS idx_turnos_partida_numero
    ON turnos(id_partida, numero_turno);

CREATE VIEW IF NOT EXISTS vw_estatisticas_jogadores AS
SELECT
    jogador,
    COUNT(*) AS total_partidas,
    SUM(CASE WHEN status = 'Finalizada' AND id_vencedor = 1 THEN 1 ELSE 0 END) AS vitorias,
    SUM(CASE WHEN status = 'Finalizada' AND id_vencedor = 4 THEN 1 ELSE 0 END) AS derrotas,
    MAX(data_inicio) AS ultima_partida
FROM partidas
GROUP BY jogador;
