defmodule Console.Repo.Migrations.AddAppNotifications do
  use Ecto.Migration

  def change do
    create table(:app_notifications, primary_key: false) do
      add :id,       :uuid, primary_key: true
      add :user_id,  references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :priority, :integer, default: 0
      add :text,     :binary
      add :read_at,  :utc_datetime_usec

      timestamps()
    end

    create index(:app_notifications, [:user_id])

    create table(:shared_secrets, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :name,       :string
      add :handle,     :string
      add :secret,     :binary
      add :expires_at, :utc_datetime_usec

      timestamps()
    end
  end
end
