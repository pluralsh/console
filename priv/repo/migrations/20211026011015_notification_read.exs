defmodule Console.Repo.Migrations.NotificationRead do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :read_timestamp, :utc_datetime_usec
    end

    alter table(:notifications) do
      add :severity, :integer, default: 0
    end
  end
end
