defmodule Console.Repo.Migrations.AddRuntimeModel do
  use Ecto.Migration

  def change do
    alter table(:agent_runtimes) do
      add :model, :map
    end
  end
end
