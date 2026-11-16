defmodule Console.Repo.Migrations.AddDevboxes do
  use Ecto.Migration

  def change do
    create table(:devboxes, primary_key: false) do
      add :id,                   :uuid, primary_key: true
      add :name,                 :string, null: false
      add :cluster_id,           references(:clusters, type: :uuid, on_delete: :delete_all), null: false
      add :image,                :string
      add :resolved_image,       :string
      add :template_revision,    :string
      add :status,               :integer, default: 0
      add :resources,            :map
      add :http_allowlist,       :map
      add :allowed_repositories, {:array, :string}
      add :agents,               :map
      add :idle_policy,          :map
      add :conditions,           :map
      add :max_instances,        :integer
      add :browser,              :boolean, default: false
      add :cloud_identities,     :map
      add :autonomy,             :map
      add :last_heartbeat_at,    :utc_datetime_usec

      timestamps()
    end

    create unique_index(:devboxes, [:cluster_id, :name], name: :devboxes_cluster_id_name_uniq_index)

    create table(:devbox_scm_connections, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :devbox_id,     references(:devboxes, type: :uuid, on_delete: :delete_all), null: false
      add :connection_id, references(:scm_connections, type: :uuid, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:devbox_scm_connections, [:devbox_id, :connection_id])

    create table(:workbench_devboxes, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all), null: false
      add :devbox_id,    references(:devboxes, type: :uuid, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:workbench_devboxes, [:workbench_id, :devbox_id])
    create index(:workbench_devboxes, [:devbox_id])

    create table(:devbox_instances, primary_key: false) do
      add :id,                     :uuid, primary_key: true
      add :name,                   :string
      add :workbench_id,           references(:workbenches, type: :uuid, on_delete: :delete_all), null: false
      add :devbox_id,              references(:devboxes, type: :uuid, on_delete: :delete_all), null: false
      add :user_id,                references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :agent,                  :integer
      add :requested_model,        :string
      add :repositories,           {:array, :string}
      add :config_options,         :map
      add :agent_billing,          :map
      add :max_running_threads,    :integer, default: 4
      add :status,                 :integer, default: 0
      add :status_reason,          :text
      add :actor_ref,              :string
      add :template_revision,      :string
      add :image_digest,           :string
      add :restore_fidelity,       :integer
      add :foreground_state,       :integer, default: 0
      add :agent_connections,      :map
      add :idle_state,             :map
      add :viewers,                :map
      add :viewer_lease_until,     :utc_datetime_usec
      add :keep_awake_until,       :utc_datetime_usec
      add :keep_awake_by_id,       references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :awake_since,            :utc_datetime_usec
      add :index_revision,         :bigint, default: 0
      add :status_generation,      :bigint, default: 0
      add :lease_generation,       :bigint, default: 0
      add :running_threads,        :integer, default: 0
      add :waiting_threads,        :integer, default: 0
      add :checkouts,              :map
      add :started_at,             :utc_datetime_usec
      add :suspended_at,           :utc_datetime_usec
      add :completed_at,           :utc_datetime_usec
      add :last_activity_at,       :utc_datetime_usec
      add :credentials_revoked_at, :utc_datetime_usec

      timestamps()
    end

    create index(:devbox_instances, [:workbench_id])
    create index(:devbox_instances, [:devbox_id])
    create index(:devbox_instances, [:status])

    create table(:devbox_snapshots, primary_key: false) do
      add :id,                :uuid, primary_key: true
      add :name,              :string
      add :workbench_id,      references(:workbenches, type: :uuid, on_delete: :delete_all), null: false
      add :devbox_id,         references(:devboxes, type: :uuid, on_delete: :nothing), null: false
      add :instance_id,       references(:devbox_instances, type: :uuid, on_delete: :nilify_all)
      add :user_id,           references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :tag_ref,           :string
      add :fidelity,          :integer
      add :size_bytes,        :bigint
      add :status,            :integer, default: 0
      add :error,             :text
      add :template_revision, :string

      timestamps()
    end

    create index(:devbox_snapshots, [:workbench_id])
    create index(:devbox_snapshots, [:devbox_id])
    create index(:devbox_snapshots, [:instance_id])

    alter table(:devbox_instances) do
      add :snapshot_id, references(:devbox_snapshots, type: :uuid, on_delete: :nilify_all)
    end

    create table(:devbox_instance_sessions, primary_key: false) do
      add :id,                    :uuid, primary_key: true
      add :instance_id,           references(:devbox_instances, type: :uuid, on_delete: :delete_all), null: false
      add :acp_session_id,        :string
      add :kind,                  :integer, default: 0
      add :parent_id,             references(:devbox_instance_sessions, type: :uuid, on_delete: :nilify_all)
      add :parent_acp_session_id, :string
      add :agent,                 :integer
      add :title,                 :string
      add :user_title,            :string
      add :cwd,                   :string
      add :worktree_repos,        {:array, :string}
      add :worktree_path,         :string
      add :status,                :integer, default: 0
      add :imported,              :boolean, default: false
      add :user_id,               references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :last_activity_at,      :utc_datetime_usec
      add :entity_count,          :integer, default: 0
      add :foreground_state,      :integer, default: 0
      add :stop_reason,           :string
      add :error,                 :map
      add :background_work,       :map
      add :config_options,        :map
      add :available_commands,    :map
      add :usage,                 :map
      add :billing,               :string
      add :revision,              :bigint, default: 0

      timestamps()
    end

    create unique_index(:devbox_instance_sessions, [:instance_id, :acp_session_id])
    create index(:devbox_instance_sessions, [:parent_id])

    create table(:devbox_instance_interactions, primary_key: false) do
      add :id,               :uuid, primary_key: true
      add :instance_id,      references(:devbox_instances, type: :uuid, on_delete: :delete_all), null: false
      add :session_id,       references(:devbox_instance_sessions, type: :uuid, on_delete: :delete_all)
      add :external_id,      :string, null: false
      add :jsonrpc_id,       :string
      add :tool_call_id,     :string
      add :kind,             :integer
      add :title,            :string
      add :message,          :text
      add :options,          :map
      add :requested_schema, :map
      add :url,              :text
      add :state,            :integer, default: 0
      add :answered_by_id,   references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :answered_by_policy, :string
      add :answered_at,      :utc_datetime_usec
      add :review,           :map
      add :response,         :map
      add :expires_at,       :utc_datetime_usec
      add :revision,         :bigint, default: 0

      timestamps()
    end

    create unique_index(:devbox_instance_interactions, [:instance_id, :external_id])
    create index(:devbox_instance_interactions, [:session_id])
    create index(:devbox_instance_interactions, [:state])

    alter table(:pull_requests) do
      add :devbox_id,                  references(:devboxes, type: :uuid, on_delete: :nilify_all)
      add :devbox_instance_id,         references(:devbox_instances, type: :uuid, on_delete: :nilify_all)
      add :devbox_instance_session_id, references(:devbox_instance_sessions, type: :uuid, on_delete: :nilify_all)
      add :source,                     :integer
      add :metadata,                   :map
    end

    create index(:pull_requests, [:devbox_id])
    create index(:pull_requests, [:devbox_instance_id])
    create index(:pull_requests, [:devbox_instance_session_id])

    create table(:workload_identity_issuers, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :scope_type,  :string, null: false
      add :scope_id,    :uuid, null: false
      add :enabled,     :boolean, default: true, null: false
      add :disabled_at, :utc_datetime_usec

      timestamps()
    end

    create unique_index(:workload_identity_issuers, [:scope_type, :scope_id])

    create table(:workload_identity_keys, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :issuer_id,    references(:workload_identity_issuers, type: :uuid, on_delete: :delete_all), null: false
      add :kid,          :string, null: false
      add :private_jwk,  :binary, null: false
      add :public_jwk,   :map, null: false
      add :state,        :integer, null: false, default: 0
      add :activated_at, :utc_datetime_usec
      add :retired_at,   :utc_datetime_usec
      add :expires_at,   :utc_datetime_usec

      timestamps()
    end

    create unique_index(:workload_identity_keys, [:kid])
    create index(:workload_identity_keys, [:issuer_id, :state])

    create table(:agent_credentials, primary_key: false) do
      add :id,                :uuid, primary_key: true
      add :user_id,           references(:watchman_users, type: :uuid, on_delete: :delete_all), null: false
      add :provider,          :integer, null: false
      add :kind,              :integer, null: false
      add :label,             :string
      add :secret,            :binary, null: false
      add :metadata,          :map
      add :status,            :integer, null: false, default: 0
      add :version,           :bigint, null: false, default: 1
      add :failure_count,     :integer, null: false, default: 0
      add :default_billing,   :boolean, null: false, default: false
      add :linked_at,         :utc_datetime_usec
      add :expires_at,        :utc_datetime_usec
      add :last_refreshed_at, :utc_datetime_usec
      add :last_used_at,      :utc_datetime_usec
      add :warned_at,         :map
      add :lease_holder_id,   references(:devbox_instances, type: :uuid, on_delete: :nilify_all)
      add :lease_expires_at,  :utc_datetime_usec

      timestamps()
    end

    create unique_index(:agent_credentials, [:user_id, :provider])
    create index(:agent_credentials, [:expires_at])
  end
end
