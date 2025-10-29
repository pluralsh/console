defmodule Console.Repo.Migrations.AddAgentRunLanguage do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :language,         :integer
      add :language_version, :string
    end
  end
end
