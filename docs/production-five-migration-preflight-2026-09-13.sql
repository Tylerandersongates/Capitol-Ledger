-- CapitolWonk five-migration preflight: read-only and fail-closed.
-- Run only against a separately approved target with a client that stops on the
-- first error. Never place a connection string in this file or its invocation.
--
-- This gate machine-checks target identity, the frozen successful-migration
-- manifest, the known resolved retry, required relation/column/primary-key
-- shape, namespace safety, index ownership/validity, and aggregate data
-- predicates. The detailed column defaults, constraint definitions, and index
-- definitions printed after the DO block still require a line-by-line manual
-- comparison with the reviewed migration SQL before any deploy command.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

DO $preflight$
DECLARE
  successful_migrations INTEGER;
  distinct_successful_migrations INTEGER;
  matched_successful_migrations INTEGER;
  resolved_rollbacks INTEGER;
  required_tables INTEGER;
  missing_required_columns INTEGER;
  invalid_primary_keys INTEGER;
  unsafe_existing_indexes INTEGER;
  public_tables INTEGER;
  workspace_nullable TEXT;
BEGIN
  IF current_database() IS DISTINCT FROM 'Capitol%20Ledger' THEN
    RAISE EXCEPTION 'STOP: unexpected database target';
  END IF;
  IF current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'STOP: unexpected schema target';
  END IF;
  IF (current_setting('server_version_num')::INTEGER / 10000) IS DISTINCT FROM 17 THEN
    RAISE EXCEPTION 'STOP: expected PostgreSQL major version 17';
  END IF;

  SELECT count(*) INTO required_tables
  FROM pg_class relation
  JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind = 'r'
    AND relation.relname IN (
      '_prisma_migrations', 'User', 'AccountDeletionRequest',
      'OfficialContactMessage', 'PetitionSignature',
      'TeamSubscriptionPause', 'TeamWorkspace',
      'Member', 'Bill', 'Vote', 'MemberVote'
    );
  IF required_tables <> 11 THEN
    RAISE EXCEPTION 'STOP: a required pre-migration base table is missing or has the wrong relation type';
  END IF;

  -- These are the columns directly required by the migration statements and
  -- their referenced keys. The complete definitions printed below remain a
  -- mandatory manual comparison because migration 1 intentionally tolerates
  -- some absent OfficialContactMessage columns and adds them conditionally.
  SELECT count(*) INTO missing_required_columns
  FROM (VALUES
    ('User', 'id', 'text', 'NO'),
    ('AccountDeletionRequest', 'id', 'text', 'NO'),
    ('OfficialContactMessage', 'id', 'text', 'NO'),
    ('OfficialContactMessage', 'memberBioguideId', 'text', 'NO'),
    ('OfficialContactMessage', 'senderKey', 'text', 'NO'),
    ('OfficialContactMessage', 'userId', 'text', 'YES'),
    ('OfficialContactMessage', 'sentAt', 'timestamp', 'NO'),
    ('PetitionSignature', 'id', 'text', 'NO'),
    ('PetitionSignature', 'userId', 'text', 'NO'),
    ('PetitionSignature', 'petitionId', 'text', 'NO'),
    ('PetitionSignature', 'signedAt', 'timestamp', 'NO'),
    ('TeamSubscriptionPause', 'id', 'text', 'NO'),
    ('TeamSubscriptionPause', 'userId', 'text', 'NO'),
    ('TeamSubscriptionPause', 'workspaceId', 'text', 'NO'),
    ('TeamSubscriptionPause', 'status', 'text', 'NO'),
    ('TeamWorkspace', 'id', 'text', 'NO')
  ) expected(table_name, column_name, udt_name, is_nullable)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns actual
    WHERE actual.table_schema = 'public'
      AND actual.table_name::TEXT = expected.table_name
      AND actual.column_name::TEXT = expected.column_name
      AND actual.udt_name::TEXT = expected.udt_name
      AND actual.is_nullable::TEXT = expected.is_nullable
  );
  IF missing_required_columns <> 0 THEN
    RAISE EXCEPTION 'STOP: % required pre-migration columns are missing or have the wrong type/nullability', missing_required_columns;
  END IF;

  SELECT count(*) INTO invalid_primary_keys
  FROM (VALUES
    ('User', 'User_pkey'),
    ('AccountDeletionRequest', 'AccountDeletionRequest_pkey'),
    ('OfficialContactMessage', 'OfficialContactMessage_pkey'),
    ('PetitionSignature', 'PetitionSignature_pkey'),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_pkey'),
    ('TeamWorkspace', 'TeamWorkspace_pkey')
  ) expected(table_name, constraint_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_record
    JOIN pg_class table_record ON table_record.oid = constraint_record.conrelid
    JOIN pg_namespace namespace ON namespace.oid = table_record.relnamespace
    JOIN pg_index backing_index ON backing_index.indexrelid = constraint_record.conindid
    WHERE namespace.nspname = 'public'
      AND table_record.relname::TEXT = expected.table_name
      AND constraint_record.conname::TEXT = expected.constraint_name
      AND constraint_record.contype = 'p'
      AND constraint_record.convalidated
      AND array_length(constraint_record.conkey, 1) = 1
      AND (
        SELECT attribute.attname
        FROM pg_attribute attribute
        WHERE attribute.attrelid = constraint_record.conrelid
          AND attribute.attnum = constraint_record.conkey[1]
      ) = 'id'
      AND backing_index.indisvalid
      AND backing_index.indisready
      AND backing_index.indislive
  );
  IF invalid_primary_keys <> 0 THEN
    RAISE EXCEPTION 'STOP: % required primary keys are missing, invalid, or attached to the wrong table/column', invalid_primary_keys;
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

  -- A genuinely untouched pending migration has no history row. Any prior
  -- attempt at one of the five, including a resolved failure, requires review.
  IF EXISTS (
    SELECT 1 FROM "_prisma_migrations"
    WHERE "migration_name" IN (
      '20260910150000_account_deletion_integrity',
      '20260910151000_account_deletion_cleanup_outbox',
      '20260910152000_team_subscription_pause_workspace_integrity',
      '20260911110000_app_store_server_state',
      '20260912120000_privacy_request_intake'
    )
  ) THEN
    RAISE EXCEPTION 'STOP: an expected-pending migration already has a history row';
  END IF;

  SELECT count(*), count(DISTINCT "migration_name")
    INTO successful_migrations, distinct_successful_migrations
  FROM "_prisma_migrations"
  WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL;

  SELECT count(*) INTO matched_successful_migrations
  FROM "_prisma_migrations" actual
  JOIN (VALUES
    ('20260521150000_initial_capitol_ledger', 'a5ddc29c4dd2b8c19035b575816e65ddbd24929f467a15fb448b8a3caff95d20'),
    ('20260521161000_weekly_brief_delivery_history', '27332d98cec4313aee82ccb1c6fc7e82998bed345985b52a801f5d7efdfac481'),
    ('20260522103000_congress_committees_source_links', 'fcad79cfb1f207859abcd45dd7da1a78a7f4149b3c5a37380597ba64d3113523'),
    ('20260527103000_beta_feedback', '6b55eb641022ef73ea79e7e2a0b4eeca49671ecfd63af75252476c3b392eba71'),
    ('20260527104500_beta_feedback_release_decision', 'b68d67d9d20326fec9fb7ef8e1c5c5ddda239ef585524c0ae6a8ddb9c48b12f0'),
    ('20260528110000_user_first_last_name', 'a8fd86043b2d662509bb6cb49d55f83f0fe78101271c9ef9718e1a88cdb78da4'),
    ('20260614114500_account_subscription_seat_count', '4fea7f8b483d56303115353d18da7dedb4d424f645ca574c5c029e83c8ba9563'),
    ('20260614143000_team_workspace_phase_2', '2b894a446a0d905952c1a17760090b4ef964266cd83873e0ed309364ba8e421a'),
    ('20260618162000_account_gamification_streak_date', 'f0687e13bab49ffd6046e0e9606b661c43ec74c517925fa98013702e7ff44af6'),
    ('20260718154000_account_deletion_requests', '2bce52b4c8c6f77b8ec83a2bbbe7afb2c5da4dd9036f305fa974bd08e9ed4ec1'),
    ('20260728193000_vote_session_identity', 'cf1c98bb34789cd873af51c0990fc98d77ab13eca59301735c3589b9329c437b'),
    ('20260903120000_weekly_brief_daily_editions', 'ca425a4924e5562edcb29d8411d4004356260487d3f2a72c1e97d004d775b53b')
  ) expected(migration_name, checksum)
    ON actual."migration_name" = expected.migration_name
   AND actual."checksum" = expected.checksum
  WHERE actual."finished_at" IS NOT NULL
    AND actual."rolled_back_at" IS NULL
    AND actual."applied_steps_count" = 1;

  IF successful_migrations <> 12
     OR distinct_successful_migrations <> 12
     OR matched_successful_migrations <> 12 THEN
    RAISE EXCEPTION 'STOP: successful migration name/checksum/step manifest differs';
  END IF;

  SELECT count(*) INTO resolved_rollbacks
  FROM "_prisma_migrations"
  WHERE "finished_at" IS NULL AND "rolled_back_at" IS NOT NULL;
  IF resolved_rollbacks <> 1 OR EXISTS (
    SELECT 1 FROM "_prisma_migrations"
    WHERE "finished_at" IS NULL
      AND "rolled_back_at" IS NOT NULL
      AND "migration_name" <> '20260618162000_account_gamification_streak_date'
  ) OR (SELECT count(*) FROM "_prisma_migrations") <> 13 THEN
    RAISE EXCEPTION 'STOP: resolved rollback/history-row baseline differs';
  END IF;

  -- Every new relation and every schema-global index name created by migrations
  -- 2, 4, and 5 must be absent. This also catches a wrong-kind name collision.
  IF EXISTS (
    SELECT 1
    FROM pg_class object_record
    JOIN pg_namespace namespace ON namespace.oid = object_record.relnamespace
    WHERE namespace.nspname = 'public'
      AND object_record.relname IN (
        'AccountDeletionCleanupJob',
        'AccountDeletionCleanupJob_pkey',
        'AccountDeletionCleanupJob_dedupeKey_key',
        'AccountDeletionCleanupJob_status_availableAt_idx',
        'AccountDeletionCleanupJob_deletionRequestId_idx',
        'AppStoreObservationSequence',
        'AppStoreSubscriptionState',
        'AppStoreSubscriptionState_pkey',
        'AppStoreSubscriptionState_userId_key',
        'AppStoreSubscriptionState_appAccountToken_key',
        'AppStoreSubscriptionState_originalTransactionId_key',
        'AppStoreSubscriptionState_environment_appleStatus_idx',
        'AppStoreSubscriptionState_reconciledAt_idx',
        'AppStoreNotificationReceipt',
        'AppStoreNotificationReceipt_pkey',
        'AppStoreNotificationReceipt_notificationUUID_key',
        'AppStoreNotificationReceipt_status_createdAt_idx',
        'AppStoreNotificationReceipt_userId_createdAt_idx',
        'PrivacyRequest',
        'PrivacyRequest_pkey',
        'PrivacyRequest_userId_requestedAt_idx',
        'PrivacyRequest_status_requestedAt_idx',
        'PrivacyRequest_one_active_type_per_user_idx'
      )
  ) THEN
    RAISE EXCEPTION 'STOP: a new migration relation or index namespace already exists';
  END IF;

  -- Migration 1 uses IF NOT EXISTS. If one of its index names is present, it
  -- must at least be a live/ready/valid index on the intended table with the
  -- intended uniqueness. Exact keys and predicates remain a manual comparison.
  SELECT count(*) INTO unsafe_existing_indexes
  FROM (VALUES
    ('OfficialContactMessage', 'OfficialContactMessage_member_sender_sentAt_idx', FALSE),
    ('OfficialContactMessage', 'OfficialContactMessage_userId_idx', FALSE),
    ('OfficialContactMessage', 'OfficialContactMessage_userId_sentAt_idx', FALSE),
    ('PetitionSignature', 'PetitionSignature_userId_petitionId_key', TRUE),
    ('PetitionSignature', 'PetitionSignature_userId_signedAt_idx', FALSE),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_userId_active_key', TRUE),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_userId_status_idx', FALSE),
    ('TeamSubscriptionPause', 'TeamSubscriptionPause_workspaceId_idx', FALSE)
  ) expected(table_name, index_name, is_unique)
  WHERE EXISTS (
    SELECT 1
    FROM pg_class named_object
    JOIN pg_namespace namespace ON namespace.oid = named_object.relnamespace
    WHERE namespace.nspname = 'public' AND named_object.relname::TEXT = expected.index_name
  )
  AND NOT EXISTS (
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
      AND index_state.indisvalid
      AND index_state.indisready
      AND index_state.indislive
  );
  IF unsafe_existing_indexes <> 0 THEN
    RAISE EXCEPTION 'STOP: % existing migration-1 index names have unsafe ownership/type/validity', unsafe_existing_indexes;
  END IF;

  SELECT "is_nullable" INTO workspace_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'TeamSubscriptionPause'
    AND column_name = 'workspaceId';
  IF workspace_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'STOP: TeamSubscriptionPause.workspaceId precondition differs';
  END IF;

  SELECT count(*) INTO public_tables
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  IF public_tables <> 29 THEN
    RAISE EXCEPTION 'STOP: public base-table baseline differs from the reviewed 29-table snapshot';
  END IF;

  IF (SELECT count(*) FROM "AccountDeletionRequest") <> 0 THEN
    RAISE EXCEPTION 'STOP: deletion watermark baseline is no longer zero';
  END IF;
  IF (SELECT count(*) FROM "TeamSubscriptionPause") <> 2 THEN
    RAISE EXCEPTION 'STOP: TeamSubscriptionPause baseline differs from reviewed snapshot';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "OfficialContactMessage" record
    WHERE record."userId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
  ) THEN
    RAISE EXCEPTION 'STOP: OfficialContactMessage user orphan exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "PetitionSignature" record
    WHERE NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
  ) THEN
    RAISE EXCEPTION 'STOP: PetitionSignature user orphan exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "TeamSubscriptionPause" record
    WHERE NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId")
  ) THEN
    RAISE EXCEPTION 'STOP: TeamSubscriptionPause user orphan exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "TeamSubscriptionPause"
    WHERE "workspaceId" IS NULL OR "workspaceId" IN ('', 'team-owner-upgrade')
  ) THEN
    RAISE EXCEPTION 'STOP: null or known-sentinel TeamSubscriptionPause row exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "TeamSubscriptionPause" pause
    WHERE NOT EXISTS (SELECT 1 FROM "TeamWorkspace" workspace WHERE workspace."id" = pause."workspaceId")
  ) THEN
    RAISE EXCEPTION 'STOP: unexpected TeamSubscriptionPause workspace orphan exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "PetitionSignature"
    GROUP BY "userId", "petitionId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'STOP: duplicate petition key exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "TeamSubscriptionPause"
    WHERE "status" = 'active' GROUP BY "userId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'STOP: duplicate active Team pause exists';
  END IF;
END
$preflight$;

SELECT current_database() AS database_name,
       current_schema() AS schema_name,
       current_setting('server_version') AS server_version;

SELECT 'MANUAL_COMPARE: frozen migration history and checksums' AS required_review,
       "migration_name", "checksum", "started_at", "finished_at", "rolled_back_at", "applied_steps_count"
FROM "_prisma_migrations"
ORDER BY "started_at", "migration_name";

SELECT 'MANUAL_COMPARE: columns/types/nullability/defaults against reviewed source' AS required_review,
       table_name, column_name, data_type, udt_name, is_nullable,
       datetime_precision, numeric_precision, numeric_scale, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'User', 'AccountDeletionRequest', 'OfficialContactMessage',
    'PetitionSignature', 'TeamSubscriptionPause', 'TeamWorkspace'
  )
ORDER BY table_name, ordinal_position;

SELECT 'MANUAL_COMPARE: constraint owner/type/definition against reviewed source' AS required_review,
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
    'User', 'AccountDeletionRequest', 'OfficialContactMessage',
    'PetitionSignature', 'TeamSubscriptionPause', 'TeamWorkspace'
  )
ORDER BY table_name, constraint_record.conname;

SELECT 'MANUAL_COMPARE: index table/keys/uniqueness/predicate and validity' AS required_review,
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
    'AccountDeletionRequest', 'OfficialContactMessage',
    'PetitionSignature', 'TeamSubscriptionPause'
  )
ORDER BY table_name, index_name;

-- Record these totals and use the same labels in postflight. The zero-orphan
-- predicates above cannot by themselves prove that migration 1 deleted zero
-- rows; exact table totals must be compared under the approved write window.
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
UNION ALL SELECT 'member_votes', count(*) FROM "MemberVote";

SELECT table_record.relname AS table_name,
       pg_relation_size(table_record.oid) AS table_bytes,
       pg_indexes_size(table_record.oid) AS index_bytes,
       pg_total_relation_size(table_record.oid) AS total_bytes
FROM pg_class table_record
JOIN pg_namespace namespace ON namespace.oid = table_record.relnamespace
WHERE namespace.nspname = 'public'
  AND table_record.relname IN (
    'AccountDeletionRequest', 'OfficialContactMessage',
    'PetitionSignature', 'TeamSubscriptionPause'
  )
  AND table_record.relkind = 'r'
ORDER BY table_name;

ROLLBACK;
