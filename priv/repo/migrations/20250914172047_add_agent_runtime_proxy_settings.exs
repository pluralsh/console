defmodule Console.Repo.Migrations.AddAgentRuntimeProxySettings do
  use Ecto.Migration

  def change do
    alter table(:agent_runtimes) do
      add :ai_proxy, :boolean
      add :default,  :boolean, default: false
    end

    create table(:agent_prompt_history, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :delete_all)
      add :prompt,   :binary

      timestamps()
    end

    create unique_index(:agent_runtimes, [:default], where: "\"default\"")
    create index(:agent_prompt_history, [:agent_run_id])

    drop unique_index(:agent_runtimes, [:cluster_id, :type])
    create unique_index(:agent_runtimes, [:cluster_id, :name])
  end
end
