defmodule Console.Repo.Migrations.AddCriticismToResult do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_results) do
      add :criticism, :binary
    end
  end
end
