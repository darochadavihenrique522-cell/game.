PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS partidas (
    id_partida INTEGER PRIMARY KEY,
    jogador TEXT NOT NULL,
    personagem TEXT NOT NULL,
    id_desafiante INTEGER NOT NULL DEFAULT 1,
    id_oponente INTEGER NOT NULL DEFAULT 4,
    id_vencedor INTEGER,
    status TEXT NOT NULL DEFAULT 'Em Andamento',
    hp_player INTEGER NOT NULL DEFAULT 100,
    hp_mendigo INTEGER NOT NULL DEFAULT 100,
    data_inicio TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fim TEXT
);

CREATE TABLE IF NOT EXISTS turnos (
    id_turno INTEGER PRIMARY KEY AUTOINCREMENT,
    id_partida INTEGER NOT NULL,
    numero_turno INTEGER NOT NULL,
    id_personagem_atuante INTEGER NOT NULL,
    tipo_acao TEXT NOT NULL,
    id_item_utilizado INTEGER,
    valor_impacto REAL NOT NULL DEFAULT 0,
    hp_player INTEGER NOT NULL DEFAULT 0,
    hp_mendigo INTEGER NOT NULL DEFAULT 0,
    data_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_partida) REFERENCES partidas(id_partida) ON DELETE CASCADE,
    UNIQUE (id_partida, numero_turno)
);

CREATE INDEX IF NOT EXISTS idx_partidas_data_inicio ON partidas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_turnos_partida_numero ON turnos(id_partida, numero_turno);
