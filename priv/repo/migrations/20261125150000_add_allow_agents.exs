defmodule Console.Repo.Migrations.AddAllowAgents do
  use Ecto.Migration

  def up do
    alter table(:clusters) do
      add :allow_agents, :boolean
    end

    alter table(:projects) do
      add_if_not_exists :allow_agents, :boolean, default: false
    end

    flush()

    # clusters already running agent workloads keep them
    execute """
    UPDATE clusters SET allow_agents = true
    WHERE id IN (SELECT cluster_id FROM agent_runtimes WHERE cluster_id IS NOT NULL)
       OR id IN (SELECT cluster_id FROM devboxes WHERE cluster_id IS NOT NULL)
    """
  end

  def down do
    alter table(:clusters) do
      remove :allow_agents
    end

    alter table(:projects) do
      remove_if_exists :allow_agents, :boolean
    end
  end
end
