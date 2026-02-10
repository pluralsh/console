defmodule Console.Repo.Migrations.AddWorkbenchSchemas do
  use Ecto.Migration

  def change do
    create table(:workbenches, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :name,          :string
      add :description,   :string
      add :configuration, :map

      add :project_id,       references(:projects, type: :uuid)
      add :skills,           :map
      add :repository_id,    references(:git_repositories, type: :uuid)
      add :agent_runtime_id, references(:agent_runtimes, type: :uuid)

      add :system_prompt, :binary

      add :read_policy_id,  :uuid
      add :write_policy_id, :uuid

      timestamps()
    end

    create unique_index(:workbenches, [:name])
    create index(:workbenches, [:project_id])
    create index(:workbenches, [:read_policy_id])
    create index(:workbenches, [:write_policy_id])
    create index(:workbenches, [:repository_id])
    create index(:workbenches, [:agent_runtime_id])

    create table(:workbench_jobs, primary_key: false) do
      add :id,     :uuid, primary_key: true
      add :status, :integer

      add :started_at,   :utc_datetime_usec
      add :completed_at, :utc_datetime_usec

      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)

      add :prompt, :binary

      add :user_id, references(:watchman_users, type: :uuid, on_delete: :nilify_all)

      timestamps()
    end

    create index(:workbench_jobs, [:workbench_id])
    create index(:workbench_jobs, [:user_id])

    create table(:workbench_job_results, primary_key: false) do
      add :id,               :uuid, primary_key: true
      add :workbench_job_id, references(:workbench_jobs, type: :uuid, on_delete: :delete_all)

      add :working_theory, :binary
      add :conclusion,     :binary
      add :todos,           :map

      timestamps()
    end

    create unique_index(:workbench_job_results, [:workbench_job_id])

    create table(:workbench_job_activities, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :status, :integer
      add :type,   :integer

      add :workbench_job_id, references(:workbench_jobs, type: :uuid, on_delete: :delete_all)
      add :agent_run_id,     references(:agent_runs, type: :uuid, on_delete: :nilify_all)

      add :prompt, :binary
      add :result, :map

      timestamps()
    end

    create index(:workbench_job_activities, [:workbench_job_id])
    create index(:workbench_job_activities, [:agent_run_id])

    create table(:workbench_tools, primary_key: false) do
      add :id, :uuid, primary_key: true

      add :project_id, references(:projects, type: :uuid)

      add :tool,          :integer
      add :categories,    {:array, :integer}
      add :name,          :string

      add :read_policy_id,  :uuid
      add :write_policy_id, :uuid

      add :configuration, :map

      timestamps()
    end

    create unique_index(:workbench_tools, [:name])
    create index(:workbench_tools, [:project_id])
    create index(:workbench_tools, [:read_policy_id])
    create index(:workbench_tools, [:write_policy_id])

    create table(:workbench_tool_associations, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)
      add :tool_id,      references(:workbench_tools, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:workbench_tool_associations, [:workbench_id, :tool_id])
    create index(:workbench_tool_associations, [:workbench_id])
    create index(:workbench_tool_associations, [:tool_id])
  end
end
