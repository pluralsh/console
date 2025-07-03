defmodule Console.Repo.Migrations.AddAgentIdPrs do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :agent_id, :string
    end

    create index(:pull_requests, [:agent_id])
  end
end
