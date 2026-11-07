defmodule Console.Repo.Migrations.AddRunJobError do
  use Ecto.Migration

  def change do
    alter table(:sentinel_run_jobs) do
      add :error, :string, limit: 2048
    end
  end
end
