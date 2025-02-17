defmodule Console.Repo.Migrations.StackPolicyViolations do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :policy_engine, :map
    end

    alter table(:stack_runs) do
      add :policy_engine, :map
    end

    create table(:stack_policy_violations, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :run_id,          references(:stack_runs, type: :uuid, on_delete: :delete_all)
      add :policy_id,       :string
      add :policy_url,      :string
      add :policy_module,   :string
      add :title,           :string
      add :description,     :string
      add :resolution,      :string
      add :severity,        :integer


      timestamps()
    end

    create table(:stack_violation_causes, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :violation_id, references(:stack_policy_violations, type: :uuid, on_delete: :delete_all)
      add :resource,     :string
      add :start,        :integer
      add :end,          :integer
      add :lines,        :map
      timestamps()
    end

    create index(:stack_policy_violations, [:run_id])
    create index(:stack_violation_causes, [:violation_id])
  end
end
