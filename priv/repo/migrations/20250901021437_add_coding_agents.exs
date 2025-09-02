defmodule Console.Repo.Migrations.AddCodingAgents do
  use Ecto.Migration

  def change do
    create table(:agent_runtimes, primary_key: false) do
      add :id,   :uuid, primary_key: true
      add :name, :string
      add :type, :integer
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :create_policy_id, :uuid

      timestamps()
    end

    create index(:agent_runtimes, [:cluster_id])
    create unique_index(:agent_runtimes, [:cluster_id, :type])

    create table(:agent_runs, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :status,        :integer
      add :prompt,        :binary
      add :repository,    :string
      add :runtime_id,    references(:agent_runtimes, type: :uuid, on_delete: :delete_all)
      add :user_id,       references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :flow_id,       references(:flows, type: :uuid, on_delete: :delete_all)
      add :pod_reference, :map

      timestamps()
    end

    alter table(:flows) do
      add :repositories, {:array, :string}
    end

    alter table(:pull_requests) do
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:alerts) do
      add :stacktrace, :map
      add :flow_id, references(:flows, type: :uuid, on_delete: :delete_all)
    end

    alter table(:pr_automations) do
      add :secrets, :map
    end

    create index(:agent_runs, [:runtime_id])
    create index(:agent_runs, [:user_id])
    create index(:agent_runs, [:flow_id])
    create index(:pull_requests, [:agent_run_id])
  end
end
