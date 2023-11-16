defmodule Console.Repo.Migrations.AddJobStatus do
  use Ecto.Migration

  def change do
    alter table(:pipeline_gates) do
      add :status, :map
    end
  end
end
