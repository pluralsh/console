defmodule Console.Repo.Migrations.AddStacks do
  use Ecto.Migration

  def change do
    create table(:stacks, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :type,            :integer
      add :status,          :integer
      add :approval,        :boolean
      add :name,            :string
      add :sha,             :string
      add :last_successful, :string
      add :git,             :map
      add :job_spec,        :map
      add :configuration,   :map
      add :repository_id,   references(:git_repositories, type: :uuid)
      add :cluster_id,      references(:clusters, type: :uuid)
      add :read_policy_id,  :uuid
      add :write_policy_id, :uuid

      timestamps()
    end

    create unique_index(:stacks, [:name])
    create index(:stacks, [:repository_id])
    create index(:stacks, [:cluster_id])

    create table(:stack_runs, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :type,            :integer
      add :status,          :integer
      add :approval,        :boolean
      add :approver_id,     references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :approved_at,     :utc_datetime_usec
      add :dry_run,         :boolean
      add :git,             :map
      add :job_spec,        :map
      add :configuration,   :map
      add :repository_id,   references(:git_repositories, type: :uuid)
      add :stack_id,        references(:stacks, type: :uuid, on_delete: :delete_all)
      add :cluster_id,      references(:clusters, type: :uuid)

      timestamps()
    end

    create index(:stack_runs, [:stack_id])
    create index(:stack_runs, [:cluster_id])

    create table(:run_steps, primary_key: false) do
      add :id,     :uuid,   primary_key: true
      add :name,   :string
      add :cmd,    :string
      add :args,   {:array, :string}
      add :status, :integer
      add :stage,  :integer
      add :index,  :integer
      add :run_id, references(:stack_runs, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:run_steps, [:run_id])

    create table(:run_logs, primary_key: false) do
      add :id,      :uuid, primary_key: true
      add :step_id, references(:run_steps, type: :uuid, on_delete: :delete_all)
      add :logs,    :binary

      timestamps()
    end

    create index(:run_logs, [:step_id])

    create table(:stack_environment, primary_key: false) do
      add :id,     :uuid, primary_key: true
      add :name,   :string
      add :value,  :binary
      add :secret, :boolean

      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)
      add :run_id,   references(:stack_runs, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:stack_environment, [:stack_id])
    create index(:stack_environment, [:run_id])

    create table(:stack_files, primary_key: false) do
      add :id,      :uuid, primary_key: true
      add :path,    :string
      add :content, :binary

      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)
      add :run_id,   references(:stack_runs, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:stack_files, [:stack_id])
    create index(:stack_files, [:run_id])

    create table(:stack_outputs, primary_key: false) do
      add :id,       :uuid, primary_key: true
      add :name,     :string
      add :value,    :binary
      add :secret,   :boolean

      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)
      add :run_id,   references(:stack_runs, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:stack_outputs, [:stack_id])
    create index(:stack_outputs, [:run_id])

    create table(:stack_states, primary_key: false) do
      add :id,    :uuid, primary_key: true
      add :plan,  :binary
      add :state, :map

      add :run_id,   references(:stack_runs, type: :uuid, on_delete: :delete_all)
      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:stack_states, [:stack_id])
    create unique_index(:stack_states, [:run_id])

    alter table(:service_errors) do
      add :stack_run_id, references(:stack_runs, type: :uuid, on_delete: :delete_all)
    end

    create index(:service_errors, [:stack_run_id])
  end
end
