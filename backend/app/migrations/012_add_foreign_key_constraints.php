<?php

/**
 * Migration 012 - Add Foreign Key Constraints
 *
 * Adds the FOREIGN KEY constraints that were missing from the original
 * schema. Without these, MySQL Workbench EER Diagram shows no
 * relationship lines between tables even though the _id columns exist.
 *
 * FK map
 * ------------------------------------------------------------------
 *  members.user_id             -> users.id
 *  members.dgroup_id           -> dgroups.id
 *  members.ministry_id         -> ministries.id
 *  event_attendances.event_id  -> events.id
 *  event_attendances.user_id   -> users.id
 *  prayer_requests.user_id     -> users.id
 *  ministry_applications.user_id     -> users.id
 *  ministry_applications.ministry_id -> ministries.id
 *  refresh_tokens.user_id      -> users.id
 */
class Add_foreign_key_constraints {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /**
     * Check whether a named FK constraint already exists on a table.
     */
    private function _fk_exists(string $table_name, string $constraint_name): bool
    {
        $stmt = $this->_lava->db->raw(
            "SELECT COUNT(*)
               FROM information_schema.TABLE_CONSTRAINTS
              WHERE TABLE_SCHEMA    = DATABASE()
                AND TABLE_NAME     = :table
                AND CONSTRAINT_NAME = :name
                AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
            ['table' => $table_name, 'name' => $constraint_name]
        );
        return (int) $stmt->fetchColumn() > 0;
    }

    /**
     * Add a FK, silently skipping if it already exists.
     */
    private function _add_fk(
        string $table, string $constraint, string $column,
        string $ref_table, string $ref_col,
        string $on_delete = 'CASCADE', string $on_update = 'CASCADE'
    ): void {
        if ($this->_fk_exists($table, $constraint)) {
            echo "  [skip] FK '{$constraint}' on '{$table}' already exists." . PHP_EOL;
            return;
        }
        $sql = "ALTER TABLE `{$table}`
            ADD CONSTRAINT `{$constraint}`
            FOREIGN KEY (`{$column}`)
            REFERENCES `{$ref_table}` (`{$ref_col}`)
            ON DELETE {$on_delete}
            ON UPDATE {$on_update}";
        $this->_lava->db->raw($sql);
        echo "  [ok]   FK '{$constraint}' added to '{$table}'." . PHP_EOL;
    }

    /**
     * Drop a FK constraint if it exists.
     */
    private function _drop_fk(string $table, string $constraint): void
    {
        if (! $this->_fk_exists($table, $constraint)) {
            echo "  [skip] FK '{$constraint}' on '{$table}' does not exist." . PHP_EOL;
            return;
        }
        $this->_lava->db->raw("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$constraint}`");
        echo "  [ok]   FK '{$constraint}' dropped from '{$table}'." . PHP_EOL;
    }

    /**
     * Purge orphaned child rows that would block FK creation.
     * Logs each deleted row so nothing is deleted silently.
     */
    private function _purge_orphans(
        string $child_table, string $child_col,
        string $parent_table, string $parent_col,
        bool $nullable = false
    ): void {
        $null_clause = $nullable
            ? "AND c.`{$child_col}` IS NOT NULL"
            : '';

        $stmt = $this->_lava->db->raw(
            "SELECT c.id, c.`{$child_col}` AS ref_val
               FROM `{$child_table}` c
               LEFT JOIN `{$parent_table}` p ON c.`{$child_col}` = p.`{$parent_col}`
              WHERE p.`{$parent_col}` IS NULL
                {$null_clause}"
        );
        $orphans = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($orphans)) {
            return;
        }

        foreach ($orphans as $row) {
            echo "  [warn] Orphan in {$child_table}.{$child_col}: "
               . "row id={$row['id']} references {$parent_table}.{$parent_col}={$row['ref_val']} "
               . "(not found) - deleting." . PHP_EOL;
        }

        $ids = implode(',', array_column($orphans, 'id'));
        $this->_lava->db->raw(
            "DELETE FROM `{$child_table}` WHERE id IN ({$ids})"
        );
        echo "  [ok]   Deleted " . count($orphans) . " orphan row(s) from '{$child_table}'." . PHP_EOL;
    }

    // ------------------------------------------------------------------
    // Up
    // ------------------------------------------------------------------

    public function up()
    {
        // ── 1. Purge any orphaned rows that would block FK creation ────

        // members.user_id (NOT NULL) -> users.id
        $this->_purge_orphans('members', 'user_id', 'users', 'id');

        // members.dgroup_id (nullable) -> dgroups.id
        $this->_purge_orphans('members', 'dgroup_id', 'dgroups', 'id', true);

        // members.ministry_id (nullable) -> ministries.id
        $this->_purge_orphans('members', 'ministry_id', 'ministries', 'id', true);

        // event_attendances.event_id -> events.id
        $this->_purge_orphans('event_attendances', 'event_id', 'events', 'id');

        // event_attendances.user_id -> users.id
        $this->_purge_orphans('event_attendances', 'user_id', 'users', 'id');

        // prayer_requests.user_id -> users.id
        $this->_purge_orphans('prayer_requests', 'user_id', 'users', 'id');

        // ministry_applications.user_id -> users.id
        $this->_purge_orphans('ministry_applications', 'user_id', 'users', 'id');

        // ministry_applications.ministry_id -> ministries.id
        $this->_purge_orphans('ministry_applications', 'ministry_id', 'ministries', 'id');

        // refresh_tokens.user_id -> users.id
        $this->_purge_orphans('refresh_tokens', 'user_id', 'users', 'id');

        // ── 2. Add the FK constraints ──────────────────────────────────

        // members
        $this->_add_fk('members', 'fk_members_user', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->_add_fk('members', 'fk_members_dgroup', 'dgroup_id', 'dgroups', 'id', 'SET NULL', 'CASCADE');
        $this->_add_fk('members', 'fk_members_ministry', 'ministry_id', 'ministries', 'id', 'SET NULL', 'CASCADE');

        // event_attendances
        $this->_add_fk('event_attendances', 'fk_eventattend_event', 'event_id', 'events', 'id', 'CASCADE', 'CASCADE');
        $this->_add_fk('event_attendances', 'fk_eventattend_user', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');

        // prayer_requests
        $this->_add_fk('prayer_requests', 'fk_prayerreq_user', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');

        // ministry_applications
        $this->_add_fk('ministry_applications', 'fk_ministryapp_user', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->_add_fk('ministry_applications', 'fk_ministryapp_ministry', 'ministry_id', 'ministries', 'id', 'CASCADE', 'CASCADE');

        // refresh_tokens
        $this->_add_fk('refresh_tokens', 'fk_refreshtok_user', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');
    }

    // ------------------------------------------------------------------
    // Down
    // ------------------------------------------------------------------

    public function down()
    {
        // Drop in reverse dependency order (child tables first)
        $this->_drop_fk('refresh_tokens',         'fk_refreshtok_user');
        $this->_drop_fk('ministry_applications',  'fk_ministryapp_ministry');
        $this->_drop_fk('ministry_applications',  'fk_ministryapp_user');
        $this->_drop_fk('prayer_requests',        'fk_prayerreq_user');
        $this->_drop_fk('event_attendances',      'fk_eventattend_user');
        $this->_drop_fk('event_attendances',      'fk_eventattend_event');
        $this->_drop_fk('members',                'fk_members_ministry');
        $this->_drop_fk('members',                'fk_members_dgroup');
        $this->_drop_fk('members',                'fk_members_user');
    }
}
