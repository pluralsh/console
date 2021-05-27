defmodule Console.Repo.Migrations.AddBuildPings do
  use Ecto.Migration

  def change do
    alter table(:builds) do
      add :pinged_at, :utc_datetime_usec
    end
  end
end
