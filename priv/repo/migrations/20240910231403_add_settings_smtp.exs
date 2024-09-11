defmodule Console.Repo.Migrations.AddSettingsSmtp do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :smtp, :map
    end

    alter table(:watchman_users) do
      add :last_digest_at, :utc_datetime_usec
    end
  end
end
