-- CapitolWonk five-migration postflight: read-only and fail-closed.
-- Run only after a separately approved isolated or production migration action
-- with a client that stops on the first error. Never place a connection string
-- in this file or its invocation.
--
-- This gate machine-checks the frozen migration-history delta, relation types,
-- exact new-table column names/basic types/nullability, constraint/index
-- ownership and validity, primary-key columns, foreign-key columns/targets/
-- actions, index key order and predicate presence, sequence parameters, and
-- aggregate integrity. Detailed defaults, CHECK expressions, and exact partial
-- index predicates printed after the DO block still require a line-by-line
-- manual comparison with the reviewed migration SQL before postflight can close.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

DO $postflight$
DECLARE
  successful_migrations INTEGER;
  distinct_successful_migrations INTEGER;
  matched_successful_migrations INTEGER;
  resolved_rollbacks INTEGER;
  required_new_objects INTEGER;
  column_mismatches INTEGER;
  missing_or_invalid_constraints INTEGER;
  missing_or_invalid_foreign_keys INTEGER;
  missing_or_invalid_indexes INTEGER;
  public_tables INTEGER;
  workspace_nullable TEXT;
  five_migration_order TEXT[];
BEGIN
  IF current_database() IS DISTINCT FROM 'Capitol%20Ledger'
     OR current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'STOP: unexpected post-migration target';
  END IF;
  IF (current_setting('server_version_num')::INTEGER / 10000) IS DISTINCT FROM 17 THEN
    RAISE EXCEPTION 'STOP: expected PostgreSQL major version 17';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "_prisma_migrations"
    WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
  ) THEN
    RAISE EXCEPTION 'STOP: unresolved or in-progress migration exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "_prisma_migrations"
    WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'STOP: migration history contains an ambiguous finished-and-rolled-back row';
  END IF;

  SELECT count(*), count(DISTINCT "migration_name")
    INTO successful_migrations, distinct_successful_migrations
  FROM "_prisma_migrations"
  WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL;

  -- Preserve the exact resolved-retry history: the successful
  -- 20260618162000 row has applied_steps_count 0, while the other historical
  -- successes and all five migrations applied by this run must each have 1.
  SELECT count(*) INTO matched_successful_migrations
  FROM "_prisma_migrations" actual
  JOIN (VALUES
    ('20260521150000_initial_capitol_ledger', 'a5ddc29c4dd2b8c19035b575816e65ddbd24929f467a15fb448b8a3caff95d20', 1),
    ('20260521161000_weekly_brief_delivery_history', '27332d98cec4313aee82ccb1c6fc7e82998bed345985b52a801f5d7efdfac481', 1),
    ('20260522103000_congress_committees_source_links', 'fcad79cfb1f207859abcd45dd7da1a78a7f4149b3c5a37380597ba64d3113523', 1),
    ('20260527103000_beta_feedback', '6b55eb641022ef73ea79e7e2a0b4eeca49671ecfd63af75252476c3b392eba71', 1),
    ('20260527104500_beta_feedback_release_decision', 'b68d67d9d20326fec9fb7ef8e1c5c5ddda239ef585524c0ae6a8ddb9c48b12f0', 1),
    ('20260528110000_user_first_last_name', 'a8fd86043b2d662509bb6cb49d55f83f0fe78101271c9ef9718e1a88cdb78da4', 1),
    ('20260614114500_account_subscription_seat_count', '4fea7f8b483d56303115353d18da7dedb4d424f645ca574c5c029e83c8ba9563', 1),
    ('20260614143000_team_workspace_phase_2', '2b894a446a0d905952c1a17760090b4ef964266cd83873e0ed309364ba8e421a', 1),
    ('20260618162000_account_gamification_streak_date', 'f0687e13bab49ffd6046e0e9606b661c43ec74c517925fa98013702e7ff44af6', 0),
    ('20260718154000_account_deletion_requests', '2bce52b4c8c6f77b8ec83a2bbbe7afb2c5da4dd9036f305fa974bd08e9ed4ec1', 1),
    ('20260728193000_vote_session_identity', 'cf1c98bb34789cd873af51c0990fc98d77ab13eca59301735c3589b9329c437b', 1),
    ('20260903120000_weekly_brief_daily_editions', 'ca425a4924e5562edcb29d8411d4004356260487d3f2a72c1e97d004d775b53b', 1),
    ('20260910150000_account_deletion_integrity', '0ad52fea6bc1539b0f10fefd9efd5d512093c3da69c09a6c530452dc9327d64b', 1),
    ('20260910151000_account_deletion_cleanup_outbox', 'dc438284e2ba8afaf6f17f512b2e67a90b9b1d6cbc3c57510094532700e348b3', 1),
    ('20260910152000_team_subscription_pause_workspace_integrity', '08a1501d97991b3c7e6b82294dc648787c6fe16d99cca49451a6dff306b616a4', 1),
    ('20260911110000_app_store_server_state', '79f3b5d15fe0f2517e12de3b90488b9f863a0367070629cd56474bb06e5a64b8', 1),
    ('20260912120000_privacy_request_intake', '3ccb24f3742c58c7dbd84a4c7e4b665472c585eccf042aa16888e943cdc3e1b5', 1)
  ) expected(migration_name, checksum, applied_steps_count)
    ON actual."migration_name" = expected.migration_name
   AND actual."checksum" = expected.checksum
   AND actual."applied_steps_count" = expected.applied_steps_count
  WHERE actual."finished_at" IS NOT NULL
    AND actual."rolled_back_at" IS NULL;

  IF successful_migrations <> 17
     OR distinct_successful_migrations <> 17
     OR matched_successful_migrations <> 17 THEN
    RAISE EXCEPTION 'STOP: complete successful migration name/checksum/step manifest differs';
  END IF;

  SELECT count(*) INTO resolved_rollbacks
  FROM "_prisma_migrations"
  WHERE "finished_at" IS NULL AND "rolled_back_at" IS NOT NULL;
  IF resolved_rollbacks <> 1 OR EXISTS (
    SELECT 1 FROM "_prisma_migrations"
    WHERE "finished_at" IS NULL
      AND "rolled_back_at" IS NOT NULL
      AND (
        "migration_name" <> '20260618162000_account_gamification_streak_date'
        OR "checksum" <> 'f0687e13bab49ffd6046e0e9606b661c43ec74c517925fa98013702e7ff44af6'
        OR "applied_steps_count" <> 0
      )
  ) OR (SELECT count(*) FROM "_prisma_migrations") <> 18 THEN
    RAISE EXCEPTION 'STOP: resolved rollback/history-row postflight differs';
  END IF;

  SELECT array_agg("migration_name" ORDER BY "started_at", "migration_name")
    INTO five_migration_order
  FROM "_prisma_migrations"
  WHERE "migration_name" IN (
    '20260910150000_account_deletion_integrity',
    '20260910151000_account_deletion_cleanup_outbox',
    '20260910152000_team_subscription_pause_workspace_integrity',
    '20260911110000_app_store_server_state',
    '20260912120000_privacy_request_intake'
  )
    AND "finished_at" IS NOT NULL
    AND "rolled_back_at" IS NULL;
  IF five_migration_order IS DISTINCT FROM ARRAY[
    '20260910150000_account_deletion_integrity',
    '20260910151000_account_deletion_cleanup_outbox',
    '20260910152000_team_subscription_pause_workspace_integrity',
    '20260911110000_app_store_server_state',
    '20260912120000_privacy_request_intake'
  ]::TEXT[] THEN
    RAISE EXCEPTION 'STOP: five migrations did not finish in the reviewed order';
  END IF;

  SELECT count(*) INTO required_new_objects
  FROM pg_class relation
  JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND (
      (relation.relname = 'AppStoreObservationSequence' AND relation.relkind = 'S')
      OR (
        relation.relname IN (
          'AccountDeletionCleanupJob', 'AppStoreSubscriptionState',
          'AppStoreNotificationReceipt', 'PrivacyRequest'
        )
        AND relation.relkind = 'r'
      )
    );
  IF required_new_objects <> 5 THEN
    RAISE EXCEPTION 'STOP: expected post-migration tables/sequence are missing or have the wrong relation type';
  END IF;

  -- Exact set comparison for names, basic types, and nullability of all columns
  -- created by migrations 2, 4, and 5. Precision and defaults are printed
  -- later and remain a required manual comparison.
  WITH expected(table_name, column_name, udt_name, is_nullable) AS (VALUES
    ('AccountDeletionCleanupJob', 'id', 'text', 'NO'),
    ('AccountDeletionCleanupJob', 'deletionRequestId', 'text', 'NO'),
    ('AccountDeletionCleanupJob', 'dedupeKey', 'text', 'NO'),
    ('AccountDeletionCleanupJob', 'kind', 'text', 'NO'),
    ('AccountDeletionCleanupJob', 'payload', 'jsonb', 'NO'),
    ('AccountDeletionCleanupJob', 'status', 'text', 'NO'),
    ('AccountDeletionCleanupJob', 'attempts', 'int4', 'NO'),
    ('AccountDeletionCleanupJob', 'availableAt', 'timestamp', 'NO'),
    ('AccountDeletionCleanupJob', 'lastError', 'text', 'YES'),
    ('AccountDeletionCleanupJob', 'createdAt', 'timestamp', 'NO'),
    ('AccountDeletionCleanupJob', 'updatedAt', 'timestamp', 'NO'),
    ('AppStoreSubscriptionState', 'id', 'text', 'NO'),
    ('AppStoreSubscriptionState', 'userId', 'text', 'NO'),
    ('AppStoreSubscriptionState', 'appAccountToken', 'text', 'NO'),
    ('AppStoreSubscriptionState', 'originalTransactionId', 'text', 'YES'),
    ('AppStoreSubscriptionState', 'transactionId', 'text', 'YES'),
    ('AppStoreSubscriptionState', 'environment', 'text', 'YES'),
    ('AppStoreSubscriptionState', 'productId', 'text', 'YES'),
    ('AppStoreSubscriptionState', 'appleStatus', 'int4', 'YES'),
    ('AppStoreSubscriptionState', 'expiresAt', 'timestamp', 'YES'),
    ('AppStoreSubscriptionState', 'signedAt', 'timestamp', 'YES'),
    ('AppStoreSubscriptionState', 'transactionPurchasedAt', 'timestamp', 'YES'),
    ('AppStoreSubscriptionState', 'transactionRevokedAt', 'timestamp', 'YES'),
    ('AppStoreSubscriptionState', 'autoRenewProductId', 'text', 'YES'),
    ('AppStoreSubscriptionState', 'autoRenewStatus', 'int4', 'YES'),
    ('AppStoreSubscriptionState', 'gracePeriodExpiresAt', 'timestamp', 'YES'),
    ('AppStoreSubscriptionState', 'reconciledAt', 'timestamp', 'YES'),
    ('AppStoreSubscriptionState', 'observationVersion', 'int8', 'YES'),
    ('AppStoreSubscriptionState', 'relinkPending', 'bool', 'NO'),
    ('AppStoreSubscriptionState', 'createdAt', 'timestamp', 'NO'),
    ('AppStoreSubscriptionState', 'updatedAt', 'timestamp', 'NO'),
    ('AppStoreNotificationReceipt', 'id', 'text', 'NO'),
    ('AppStoreNotificationReceipt', 'notificationUUID', 'text', 'NO'),
    ('AppStoreNotificationReceipt', 'claimToken', 'text', 'YES'),
    ('AppStoreNotificationReceipt', 'userId', 'text', 'YES'),
    ('AppStoreNotificationReceipt', 'payloadHash', 'text', 'NO'),
    ('AppStoreNotificationReceipt', 'notificationType', 'text', 'NO'),
    ('AppStoreNotificationReceipt', 'subtype', 'text', 'YES'),
    ('AppStoreNotificationReceipt', 'environment', 'text', 'YES'),
    ('AppStoreNotificationReceipt', 'signedAt', 'timestamp', 'YES'),
    ('AppStoreNotificationReceipt', 'status', 'text', 'NO'),
    ('AppStoreNotificationReceipt', 'errorCode', 'text', 'YES'),
    ('AppStoreNotificationReceipt', 'processedAt', 'timestamp', 'YES'),
    ('AppStoreNotificationReceipt', 'createdAt', 'timestamp', 'NO'),
    ('AppStoreNotificationReceipt', 'updatedAt', 'timestamp', 'NO'),
    ('PrivacyRequest', 'id', 'text', 'NO'),
    ('PrivacyRequest', 'userId', 'text', 'NO'),
    ('PrivacyRequest', 'requestType', 'text', 'NO'),
    ('PrivacyRequest', 'detail', 'text', 'YES'),
    ('PrivacyRequest', 'status', 'text', 'NO'),
    ('PrivacyRequest', 'requestedAt', 'timestamp', 'NO'),
    ('PrivacyRequest', 'acknowledgedAt', 'timestamp', 'NO'),
    ('PrivacyRequest', 'resolvedAt', 'timestamp', 'YES'),
    ('PrivacyRequest', 'resolution', 'text', 'YES'),
    ('PrivacyRequest', 'createdAt', 'timestamp', 'NO'),
    ('PrivacyRequest', 'updatedAt', 'timestamp', 'NO')
  ), actual AS (
    SELECT table_name::TEXT, column_name::TEXT, udt_name::TEXT, is_nullable::TEXT
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'AccountDeletionCleanupJob', 'AppStoreSubscriptionState',
        'AppStoreNotificationReceipt', 'PrivacyRequest'
      )
  )
  SELECT count(*) INTO column_mismatches
  FROM (
    (SELECT * FROM expected EXCEPT SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT SELECT * FROM expected)
  ) differences;
  IF column_mismatches <> 0 THEN
    RAISE EXCEPTION 'STOP: new-table column/type/nullability manifest has % differences', column_mismatches;
  END IF;

  SELECT count(*) INTO missing_or_invalid_constraints
  FROM (VALUES
    ('AccountDeletionRequest', 'AccountDeletionRequest_pkey', 'p'),
    ('AccountDeletionRequest', 'AccountDeletionRequest_userId_fkey', 'f'),
    ('OfficialContactMessage', 'OfficialContactMessage_pkey', 'p'),
    ('OfficialContactMessage', 'OfficialContactMessage_userId_fkey', 'f'),
    ('PetitionSignature', 'PetitionSignature_pkey', 'p'),
    ('PetitionSignature', 'PetitionSignature_userId_fkey', 'f'),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_pkey', 'p'),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_userId_fkey', 'f'),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_workspaceId_fkey', 'f'),
    ('AccountDeletionCleanupJob', 'AccountDeletionCleanupJob_pkey', 'p'),
    ('AccountDeletionCleanupJob', 'AccountDeletionCleanupJob_deletionRequestId_fkey', 'f'),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_pkey', 'p'),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_environment_check', 'c'),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_autoRenewStatus_check', 'c'),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_userId_fkey', 'f'),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_pkey', 'p'),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_payloadHash_check', 'c'),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_claimToken_check', 'c'),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_environment_check', 'c'),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_status_check', 'c'),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_userId_fkey', 'f'),
    ('PrivacyRequest', 'PrivacyRequest_pkey', 'p'),
    ('PrivacyRequest', 'PrivacyRequest_userId_fkey', 'f'),
    ('PrivacyRequest', 'PrivacyRequest_requestType_check', 'c'),
    ('PrivacyRequest', 'PrivacyRequest_detail_length_check', 'c'),
    ('PrivacyRequest', 'PrivacyRequest_status_check', 'c'),
    ('PrivacyRequest', 'PrivacyRequest_resolution_check', 'c'),
    ('PrivacyRequest', 'PrivacyRequest_resolution_state_check', 'c')
  ) expected(table_name, constraint_name, constraint_type)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_record
    JOIN pg_class table_record ON table_record.oid = constraint_record.conrelid
    JOIN pg_namespace namespace ON namespace.oid = table_record.relnamespace
    WHERE namespace.nspname = 'public'
      AND table_record.relname::TEXT = expected.table_name
      AND constraint_record.conname::TEXT = expected.constraint_name
      AND constraint_record.contype::TEXT = expected.constraint_type
      AND constraint_record.convalidated
      AND (
        constraint_record.contype <> 'p'
        OR (
          array_length(constraint_record.conkey, 1) = 1
          AND (
            SELECT attribute.attname
            FROM pg_attribute attribute
            WHERE attribute.attrelid = constraint_record.conrelid
              AND attribute.attnum = constraint_record.conkey[1]
          ) = 'id'
          AND EXISTS (
            SELECT 1 FROM pg_index backing_index
            WHERE backing_index.indexrelid = constraint_record.conindid
              AND backing_index.indisvalid
              AND backing_index.indisready
              AND backing_index.indislive
          )
        )
      )
  );
  IF missing_or_invalid_constraints <> 0 THEN
    RAISE EXCEPTION 'STOP: % expected constraints have the wrong owner/type/PK-column/backing-index/validation state', missing_or_invalid_constraints;
  END IF;

  SELECT count(*) INTO missing_or_invalid_foreign_keys
  FROM (VALUES
    ('AccountDeletionRequest', 'AccountDeletionRequest_userId_fkey', ARRAY['userId']::TEXT[], 'User', ARRAY['id']::TEXT[], 'n', 'c'),
    ('OfficialContactMessage', 'OfficialContactMessage_userId_fkey', ARRAY['userId']::TEXT[], 'User', ARRAY['id']::TEXT[], 'c', 'c'),
    ('PetitionSignature', 'PetitionSignature_userId_fkey', ARRAY['userId']::TEXT[], 'User', ARRAY['id']::TEXT[], 'c', 'c'),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_userId_fkey', ARRAY['userId']::TEXT[], 'User', ARRAY['id']::TEXT[], 'c', 'c'),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_workspaceId_fkey', ARRAY['workspaceId']::TEXT[], 'TeamWorkspace', ARRAY['id']::TEXT[], 'c', 'c'),
    ('AccountDeletionCleanupJob', 'AccountDeletionCleanupJob_deletionRequestId_fkey', ARRAY['deletionRequestId']::TEXT[], 'AccountDeletionRequest', ARRAY['id']::TEXT[], 'c', 'c'),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_userId_fkey', ARRAY['userId']::TEXT[], 'User', ARRAY['id']::TEXT[], 'c', 'c'),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_userId_fkey', ARRAY['userId']::TEXT[], 'User', ARRAY['id']::TEXT[], 'n', 'c'),
    ('PrivacyRequest', 'PrivacyRequest_userId_fkey', ARRAY['userId']::TEXT[], 'User', ARRAY['id']::TEXT[], 'c', 'c')
  ) expected(
    table_name, constraint_name, local_columns, referenced_table,
    referenced_columns, delete_action, update_action
  )
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_record
    JOIN pg_class table_record ON table_record.oid = constraint_record.conrelid
    JOIN pg_namespace namespace ON namespace.oid = table_record.relnamespace
    JOIN pg_class referenced_table ON referenced_table.oid = constraint_record.confrelid
    JOIN pg_namespace referenced_namespace ON referenced_namespace.oid = referenced_table.relnamespace
    WHERE namespace.nspname = 'public'
      AND referenced_namespace.nspname = 'public'
      AND table_record.relname::TEXT = expected.table_name
      AND constraint_record.conname::TEXT = expected.constraint_name
      AND referenced_table.relname::TEXT = expected.referenced_table
      AND constraint_record.contype = 'f'
      AND ARRAY(
        SELECT attribute.attname::TEXT
        FROM unnest(constraint_record.conkey) WITH ORDINALITY AS key_column(attnum, position)
        JOIN pg_attribute attribute
          ON attribute.attrelid = constraint_record.conrelid
         AND attribute.attnum = key_column.attnum
        ORDER BY key_column.position
      ) = expected.local_columns
      AND ARRAY(
        SELECT attribute.attname::TEXT
        FROM unnest(constraint_record.confkey) WITH ORDINALITY AS key_column(attnum, position)
        JOIN pg_attribute attribute
          ON attribute.attrelid = constraint_record.confrelid
         AND attribute.attnum = key_column.attnum
        ORDER BY key_column.position
      ) = expected.referenced_columns
      AND constraint_record.confdeltype::TEXT = expected.delete_action
      AND constraint_record.confupdtype::TEXT = expected.update_action
      AND constraint_record.convalidated
  );
  IF missing_or_invalid_foreign_keys <> 0 THEN
    RAISE EXCEPTION 'STOP: % expected foreign keys have the wrong columns/target/actions/validation state', missing_or_invalid_foreign_keys;
  END IF;

  SELECT count(*) INTO missing_or_invalid_indexes
  FROM (VALUES
    ('OfficialContactMessage', 'OfficialContactMessage_member_sender_sentAt_idx', FALSE, ARRAY['memberBioguideId', 'senderKey', 'sentAt']::TEXT[], FALSE),
    ('OfficialContactMessage', 'OfficialContactMessage_userId_idx', FALSE, ARRAY['userId']::TEXT[], FALSE),
    ('OfficialContactMessage', 'OfficialContactMessage_userId_sentAt_idx', FALSE, ARRAY['userId', 'sentAt']::TEXT[], FALSE),
    ('PetitionSignature', 'PetitionSignature_userId_petitionId_key', TRUE, ARRAY['userId', 'petitionId']::TEXT[], FALSE),
    ('PetitionSignature', 'PetitionSignature_userId_signedAt_idx', FALSE, ARRAY['userId', 'signedAt']::TEXT[], FALSE),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_userId_active_key', TRUE, ARRAY['userId']::TEXT[], TRUE),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_userId_status_idx', FALSE, ARRAY['userId', 'status']::TEXT[], FALSE),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_workspaceId_idx', FALSE, ARRAY['workspaceId']::TEXT[], FALSE),
    ('AccountDeletionCleanupJob', 'AccountDeletionCleanupJob_dedupeKey_key', TRUE, ARRAY['dedupeKey']::TEXT[], FALSE),
    ('AccountDeletionCleanupJob', 'AccountDeletionCleanupJob_status_availableAt_idx', FALSE, ARRAY['status', 'availableAt']::TEXT[], FALSE),
    ('AccountDeletionCleanupJob', 'AccountDeletionCleanupJob_deletionRequestId_idx', FALSE, ARRAY['deletionRequestId']::TEXT[], FALSE),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_userId_key', TRUE, ARRAY['userId']::TEXT[], FALSE),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_appAccountToken_key', TRUE, ARRAY['appAccountToken']::TEXT[], FALSE),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_originalTransactionId_key', TRUE, ARRAY['originalTransactionId']::TEXT[], FALSE),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_environment_appleStatus_idx', FALSE, ARRAY['environment', 'appleStatus']::TEXT[], FALSE),
    ('AppStoreSubscriptionState', 'AppStoreSubscriptionState_reconciledAt_idx', FALSE, ARRAY['reconciledAt']::TEXT[], FALSE),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_notificationUUID_key', TRUE, ARRAY['notificationUUID']::TEXT[], FALSE),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_status_createdAt_idx', FALSE, ARRAY['status', 'createdAt']::TEXT[], FALSE),
    ('AppStoreNotificationReceipt', 'AppStoreNotificationReceipt_userId_createdAt_idx', FALSE, ARRAY['userId', 'createdAt']::TEXT[], FALSE),
    ('PrivacyRequest', 'PrivacyRequest_userId_requestedAt_idx', FALSE, ARRAY['userId', 'requestedAt']::TEXT[], FALSE),
    ('PrivacyRequest', 'PrivacyRequest_status_requestedAt_idx', FALSE, ARRAY['status', 'requestedAt']::TEXT[], FALSE),
    ('PrivacyRequest', 'PrivacyRequest_one_active_type_per_user_idx', TRUE, ARRAY['userId', 'requestType']::TEXT[], TRUE)
  ) expected(table_name, index_name, is_unique, key_columns, has_predicate)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_class index_record
    JOIN pg_namespace namespace ON namespace.oid = index_record.relnamespace
    JOIN pg_index index_state ON index_state.indexrelid = index_record.oid
    JOIN pg_class table_record ON table_record.oid = index_state.indrelid
    WHERE namespace.nspname = 'public'
      AND index_record.relname::TEXT = expected.index_name
      AND index_record.relkind = 'i'
      AND table_record.relname::TEXT = expected.table_name
      AND index_state.indisunique = expected.is_unique
      AND ARRAY(
        SELECT attribute.attname::TEXT
        FROM unnest(index_state.indkey::SMALLINT[]) WITH ORDINALITY AS key_column(attnum, position)
        JOIN pg_attribute attribute
          ON attribute.attrelid = index_state.indrelid
         AND attribute.attnum = key_column.attnum
        WHERE key_column.position <= index_state.indnkeyatts
        ORDER BY key_column.position
      ) = expected.key_columns
      AND (index_state.indpred IS NOT NULL) = expected.has_predicate
      AND index_state.indisvalid
      AND index_state.indisready
      AND index_state.indislive
  );
  IF missing_or_invalid_indexes <> 0 THEN
    RAISE EXCEPTION 'STOP: % expected indexes have the wrong owner/type/keys/predicate-presence/flags', missing_or_invalid_indexes;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_sequence sequence_record
    JOIN pg_class relation ON relation.oid = sequence_record.seqrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'AppStoreObservationSequence'
      AND relation.relkind = 'S'
      AND sequence_record.seqtypid = 'int8'::regtype
      AND sequence_record.seqstart = 1
      AND sequence_record.seqincrement = 1
      AND sequence_record.seqmin = 1
      AND sequence_record.seqmax = 9223372036854775807
      AND sequence_record.seqcache = 1
      AND NOT sequence_record.seqcycle
  ) THEN
    RAISE EXCEPTION 'STOP: AppStoreObservationSequence definition differs';
  END IF;

  SELECT "is_nullable" INTO workspace_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'TeamSubscriptionPause'
    AND column_name = 'workspaceId';
  IF workspace_nullable IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'STOP: TeamSubscriptionPause.workspaceId is not nullable';
  END IF;

  SELECT count(*) INTO public_tables
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  IF public_tables <> 33 THEN
    RAISE EXCEPTION 'STOP: expected exactly four new public base tables';
  END IF;

  IF (SELECT count(*) FROM "AccountDeletionRequest") <> 0
     OR (SELECT count(*) FROM "AccountDeletionCleanupJob") <> 0
     OR (SELECT count(*) FROM "AppStoreSubscriptionState") <> 0
     OR (SELECT count(*) FROM "AppStoreNotificationReceipt") <> 0
     OR (SELECT count(*) FROM "PrivacyRequest") <> 0 THEN
    RAISE EXCEPTION 'STOP: a gated/new table is unexpectedly nonempty';
  END IF;
  IF (SELECT count(*) FROM "TeamSubscriptionPause") <> 2
     OR (SELECT count(*) FROM "TeamSubscriptionPause" WHERE "workspaceId" IS NULL) <> 0 THEN
    RAISE EXCEPTION 'STOP: TeamSubscriptionPause total/null baseline differs; zero rewrites not proven';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "OfficialContactMessage" record
    WHERE record."userId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
  ) OR EXISTS (
    SELECT 1 FROM "PetitionSignature" record
    WHERE NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
  ) OR EXISTS (
    SELECT 1 FROM "TeamSubscriptionPause" record
    WHERE NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
  ) OR EXISTS (
    SELECT 1 FROM "TeamSubscriptionPause" pause
    WHERE pause."workspaceId" IS NULL
       OR NOT EXISTS (SELECT 1 FROM "TeamWorkspace" workspace WHERE workspace."id" = pause."workspaceId")
  ) THEN
    RAISE EXCEPTION 'STOP: post-migration orphan/null workspace exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "TeamSubscriptionPause"
    WHERE "workspaceId" IN ('', 'team-owner-upgrade')
  ) THEN
    RAISE EXCEPTION 'STOP: known TeamSubscriptionPause sentinel remains';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "PetitionSignature" GROUP BY "userId", "petitionId" HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM "TeamSubscriptionPause"
    WHERE "status" = 'active' GROUP BY "userId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'STOP: post-migration uniqueness predicate fails';
  END IF;
END
$postflight$;

SELECT 'MANUAL_COMPARE: exact five rows, timestamps, order, checksum, and step count' AS required_review,
       "migration_name", "checksum", "started_at", "finished_at", "rolled_back_at", "applied_steps_count"
FROM "_prisma_migrations"
WHERE "migration_name" IN (
  '20260910150000_account_deletion_integrity',
  '20260910151000_account_deletion_cleanup_outbox',
  '20260910152000_team_subscription_pause_workspace_integrity',
  '20260911110000_app_store_server_state',
  '20260912120000_privacy_request_intake'
)
ORDER BY "started_at", "migration_name";

SELECT relation.relkind, namespace.nspname AS schema_name, relation.relname AS object_name
FROM pg_class relation
JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relname IN (
    'AppStoreObservationSequence', 'AccountDeletionCleanupJob',
    'AppStoreSubscriptionState', 'AppStoreNotificationReceipt', 'PrivacyRequest'
  )
ORDER BY relation.relname;

-- Compare this complete inventory to the saved preflight inventory as a set.
-- Counts alone cannot detect one old relation disappearing while an unrelated
-- relation is added. Only reviewed migration-created relations may differ.
SELECT 'MANUAL_COMPARE: complete public relation-name/kind inventory' AS required_review,
       relation.relkind, relation.relname, relation.relpersistence
FROM pg_class relation
JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
ORDER BY relation.relkind, relation.relname;

SELECT 'MANUAL_COMPARE: columns/types/nullability/defaults against migration SQL' AS required_review,
       table_name, column_name, data_type, udt_name, is_nullable,
       datetime_precision, numeric_precision, numeric_scale, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'AccountDeletionRequest', 'OfficialContactMessage', 'PetitionSignature',
    'TeamSubscriptionPause', 'AccountDeletionCleanupJob',
    'AppStoreSubscriptionState', 'AppStoreNotificationReceipt', 'PrivacyRequest'
  )
ORDER BY table_name, ordinal_position;

SELECT 'MANUAL_COMPARE: exact PK/FK/CHECK definitions; CHECK expressions' AS required_review,
       table_record.relname AS table_name,
       constraint_record.conname,
       constraint_record.contype,
       constraint_record.convalidated,
       pg_get_constraintdef(constraint_record.oid) AS definition
FROM pg_constraint constraint_record
JOIN pg_class table_record ON table_record.oid = constraint_record.conrelid
JOIN pg_namespace namespace ON namespace.oid = table_record.relnamespace
WHERE namespace.nspname = 'public'
  AND table_record.relname IN (
    'AccountDeletionRequest', 'OfficialContactMessage', 'PetitionSignature',
    'TeamSubscriptionPause', 'AccountDeletionCleanupJob',
    'AppStoreSubscriptionState', 'AppStoreNotificationReceipt', 'PrivacyRequest'
  )
ORDER BY table_name, constraint_record.conname;

SELECT 'MANUAL_COMPARE: exact index definitions, especially partial predicates' AS required_review,
       table_record.relname AS table_name,
       index_record.relname AS index_name,
       index_state.indisunique,
       index_state.indisvalid,
       index_state.indisready,
       index_state.indislive,
       pg_get_indexdef(index_record.oid) AS definition
FROM pg_class index_record
JOIN pg_namespace namespace ON namespace.oid = index_record.relnamespace
JOIN pg_index index_state ON index_state.indexrelid = index_record.oid
JOIN pg_class table_record ON table_record.oid = index_state.indrelid
WHERE namespace.nspname = 'public'
  AND table_record.relname IN (
    'OfficialContactMessage', 'PetitionSignature', 'TeamSubscriptionPause',
    'AccountDeletionCleanupJob', 'AppStoreSubscriptionState',
    'AppStoreNotificationReceipt', 'PrivacyRequest'
  )
ORDER BY table_name, index_name;

SELECT schemaname, sequencename, data_type, start_value, min_value, max_value,
       increment_by, cycle, cache_size, last_value
FROM pg_sequences
WHERE schemaname = 'public' AND sequencename = 'AppStoreObservationSequence';

-- Compare every shared label to the immediate preflight record. Exact
-- OfficialContactMessage and PetitionSignature totals are the evidence that
-- migration 1 performed zero orphan deletions; the SQL cannot infer that from
-- a zero postflight orphan count alone.
SELECT 'public_tables' AS metric, count(*)::BIGINT AS value
FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL SELECT 'account_deletion_requests', count(*) FROM "AccountDeletionRequest"
UNION ALL SELECT 'official_contact_messages', count(*) FROM "OfficialContactMessage"
UNION ALL SELECT 'petition_signatures', count(*) FROM "PetitionSignature"
UNION ALL SELECT 'team_subscription_pauses', count(*) FROM "TeamSubscriptionPause"
UNION ALL SELECT 'team_pause_null_workspace', count(*) FROM "TeamSubscriptionPause" WHERE "workspaceId" IS NULL
UNION ALL SELECT 'official_contact_user_orphans', count(*) FROM "OfficialContactMessage" record
  WHERE record."userId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
UNION ALL SELECT 'petition_user_orphans', count(*) FROM "PetitionSignature" record
  WHERE NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
UNION ALL SELECT 'team_pause_user_orphans', count(*) FROM "TeamSubscriptionPause" record
  WHERE NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
UNION ALL SELECT 'team_pause_workspace_orphans', count(*) FROM "TeamSubscriptionPause" pause
  WHERE pause."workspaceId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "TeamWorkspace" workspace WHERE workspace."id" = pause."workspaceId")
UNION ALL SELECT 'team_pause_known_sentinels', count(*) FROM "TeamSubscriptionPause"
  WHERE "workspaceId" IN ('', 'team-owner-upgrade')
UNION ALL SELECT 'duplicate_petition_keys', count(*) FROM (
  SELECT 1 FROM "PetitionSignature" GROUP BY "userId", "petitionId" HAVING count(*) > 1
) duplicate_groups
UNION ALL SELECT 'duplicate_active_team_pause_users', count(*) FROM (
  SELECT 1 FROM "TeamSubscriptionPause" WHERE "status" = 'active' GROUP BY "userId" HAVING count(*) > 1
) duplicate_groups
UNION ALL SELECT 'members', count(*) FROM "Member"
UNION ALL SELECT 'bills', count(*) FROM "Bill"
UNION ALL SELECT 'votes', count(*) FROM "Vote"
UNION ALL SELECT 'member_votes', count(*) FROM "MemberVote"
UNION ALL SELECT 'account_deletion_cleanup_jobs', count(*) FROM "AccountDeletionCleanupJob"
UNION ALL SELECT 'app_store_subscription_states', count(*) FROM "AppStoreSubscriptionState"
UNION ALL SELECT 'app_store_notification_receipts', count(*) FROM "AppStoreNotificationReceipt"
UNION ALL SELECT 'privacy_requests', count(*) FROM "PrivacyRequest";

ROLLBACK;
