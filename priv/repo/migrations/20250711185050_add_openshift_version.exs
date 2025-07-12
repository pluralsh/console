defmodule Console.Repo.Migrations.AddOpenshiftVersion do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :openshift_version, :string
      add :node_count,        :integer
      add :pod_count,         :integer
      add :namespace_count,   :integer
      add :cpu_total,         :float
      add :memory_total,      :float
    end
  end
end
