defmodule Console.Repo.Migrations.AddServiceMesh do
  use Ecto.Migration

  def change do
    alter table(:operational_layouts) do
      add :service_mesh, :integer
    end
  end
end
