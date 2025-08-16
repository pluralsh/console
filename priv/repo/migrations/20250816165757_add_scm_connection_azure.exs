defmodule Console.Repo.Migrations.AddScmConnectionAzure do
  use Ecto.Migration

  def change do
    alter table(:scm_connections) do
      add :azure, :map
    end
  end
end
