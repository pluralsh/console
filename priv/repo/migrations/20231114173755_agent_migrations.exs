defmodule Console.Repo.Migrations.AgentMigrations do
  use Ecto.Migration

  def change do
    create table(:agent_migrations, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :completed, :boolean, default: false

      timestamps()
    end
  end
end
