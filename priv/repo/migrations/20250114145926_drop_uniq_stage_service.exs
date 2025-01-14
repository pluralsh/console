defmodule Console.Repo.Migrations.DropUniqStageService do
  use Ecto.Migration

  def change do
    drop unique_index(:stage_services, [:service_id])
    create index(:stage_services, [:service_id])
  end
end
