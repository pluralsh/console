defmodule Console.Repo.Migrations.AddWorkbenchJobError do
  use Ecto.Migration

  def change do
    alter table(:workbench_jobs) do
      add :error, :binary
    end
  end
end
