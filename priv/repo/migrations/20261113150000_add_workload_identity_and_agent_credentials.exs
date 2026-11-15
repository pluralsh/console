defmodule Console.Repo.Migrations.AddWorkloadIdentityAndAgentCredentials do
  use Ecto.Migration

  def change do
    alter table(:devboxes) do
      add :cloud_identities, :map
    end

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
