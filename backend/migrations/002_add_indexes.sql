CREATE INDEX experiments_history_created_idx
    ON experiments (created_at DESC, id DESC);

CREATE INDEX experiments_history_status_created_idx
    ON experiments (status, created_at DESC, id DESC);

CREATE INDEX experiments_history_type_created_idx
    ON experiments (experiment_type, created_at DESC, id DESC);
