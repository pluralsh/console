defmodule Console.Repo.Migrations.AddUidLastUsedAt do
  use Ecto.Migration

  def change do
    alter table(:upgrade_insight_details) do
      add :last_used_at, :utc_datetime_usec
    end
  end
end
