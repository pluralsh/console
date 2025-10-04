defmodule Console.Repo.Migrations.AddServiceComponentLengths do
  use Ecto.Migration

  def change do
    alter table(:service_components) do
      modify :name, :string, size: 1_000
    end

    alter table(:service_component_children) do
      modify :name, :string, size: 1_000
    end
  end
end
