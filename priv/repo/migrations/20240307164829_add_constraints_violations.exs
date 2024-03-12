defmodule Console.Repo.Migrations.AddConstraintsViolations do
  use Ecto.Migration

  def change do
    create table(:policy_constraints, primary_key: false) do
      add :id,              :uuid,  primary_key: true
      add :name,            :string
      add :description,     :string
      add :recommendation,  :binary
      add :cluster_id,      references(:clusters, type: :uuid, on_delete: :delete_all)
      add :ref,             :map
      add :violation_count, :integer

      timestamps()
    end

    create table(:constraint_violations, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :group,     :string
      add :version,   :string
      add :kind,      :string
      add :namespace, :string
      add :name,      :string
      add :message,   :string

      add :constraint_id, references(:policy_constraints, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:policy_constraints, [:cluster_id, :name])
    create index(:policy_constraints, [:cluster_id])
    create index(:constraint_violations, [:constraint_id])
  end
end
