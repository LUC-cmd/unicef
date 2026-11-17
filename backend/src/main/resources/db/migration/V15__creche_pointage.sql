-- Présence du jour : la crèche note l'arrivée et le départ réels de l'enfant ; la famille en est informée par message.
ALTER TABLE creche_reservation ADD COLUMN arrivee_reelle TIMESTAMPTZ;
ALTER TABLE creche_reservation ADD COLUMN depart_reel TIMESTAMPTZ;
