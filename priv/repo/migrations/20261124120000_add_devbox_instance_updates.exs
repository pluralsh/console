defmodule Console.Repo.Migrations.AddDevboxInstanceUpdates do
  use Ecto.Migration

  def change do
    alter table(:devboxes) do
      add :revision,       :integer
      add :update_mode,    :integer, default: 0
      add :runtime_image,  :string
      add :daemon_version, :string
    end

    create table(:devbox_update_campaigns, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :devbox_id,       references(:devboxes, type: :uuid, on_delete: :delete_all), null: false
      add :user_id,         references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :force,           :boolean, default: false, null: false
      add :status,          :integer, default: 0, null: false
      add :reason,          :string
      add :starts_at,       :utc_datetime_usec, null: false
      add :notice_minutes,  :integer
      add :deadline_at,     :utc_datetime_usec
      add :expires_at,      :utc_datetime_usec, null: false
      add :max_concurrency, :integer, default: 5, null: false
      add :completed_at,    :utc_datetime_usec

      timestamps()
    end

    create index(:devbox_update_campaigns, [:devbox_id])
    create index(:devbox_update_campaigns, [:status])

    alter table(:devbox_instances) do
      add :daemon_version,     :string
      add :rebase_state,       :integer
      add :rebase_error,       :string, size: 2000
      add :rebase_revision,    :string
      add :rebase_attempts,    :integer, default: 0
      add :rebase_requested_at, :utc_datetime_usec
      add :last_rebased_at,    :utc_datetime_usec
      add :update_deadline_at, :utc_datetime_usec
      add :update_campaign_id, references(:devbox_update_campaigns, type: :uuid, on_delete: :nilify_all)
    end

    create index(:devbox_instances, [:update_campaign_id])
  end
end
