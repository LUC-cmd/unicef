-- Code secret choisi par la famille (haché) : le numéro et le code famille figurent sur la carte et ne suffisent pas.
CREATE TABLE famille_acces (
    famille_id       BIGINT PRIMARY KEY REFERENCES famille (id) ON DELETE CASCADE,
    code_secret_hash VARCHAR(100),
    essais_rates     INT NOT NULL DEFAULT 0,
    bloque_jusqu     TIMESTAMPTZ
);
