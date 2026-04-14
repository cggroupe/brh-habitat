-- Fix audit v5 : index manquant sur brh_message_threads.participant_id
CREATE INDEX IF NOT EXISTS idx_brh_message_threads_participant
  ON brh_message_threads(participant_id);
