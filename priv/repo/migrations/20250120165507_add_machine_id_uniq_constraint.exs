defmodule Console.Repo.Migrations.AddMachineIdUniqConstraint do
  use Ecto.Migration

  def change do
    create unique_index(:cluster_registrations, [:machine_id])
  end
end
