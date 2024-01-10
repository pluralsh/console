defmodule Console.Repo.Migrations.AddAgentMigrationName do
  use Ecto.Migration

  def change do
    alter table(:agent_migrations) do
      add :name, :string
    end

    create unique_index(:agent_migrations, [:name])
  end
end
