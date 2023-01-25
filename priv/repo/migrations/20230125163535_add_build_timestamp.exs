defmodule Console.Repo.Migrations.AddBuildTimestamp do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :build_timestamp, :utc_datetime_usec
    end
  end
end
