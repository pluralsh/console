defmodule Console.Repo.Migrations.AddWbPolicies do
  use Ecto.Migration

  def change do
    create table(:policies, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string
      add :description, :string, size: 1000
      add :policy,      :binary
      add :project_id,  references(:projects, type: :uuid)

      timestamps()
    end

    create unique_index(:policies, [:name])
    create index(:policies, [:project_id])

    create table(:policy_evaluations, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :policy_ids,  {:array, :uuid}
      add :input,       :map
      add :output,      :map

      timestamps()
    end

    create index(:policy_evaluations, [:policy_ids], using: :gin)

    create table(:workbench_policies, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :policy_id,    references(:policies, type: :uuid, on_delete: :delete_all)
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)
      add :matches,      :map

      timestamps()
    end

    create index(:workbench_policies, [:policy_id])
    create index(:workbench_policies, [:workbench_id])
    create unique_index(:workbench_policies, [:policy_id, :workbench_id])
  end
end
