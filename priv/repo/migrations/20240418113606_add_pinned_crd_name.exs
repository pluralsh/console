defmodule Console.Repo.Migrations.AddPinnedCrdName do
  use Ecto.Migration

  def change do
    alter table(:pinned_custom_resources) do
      add :name, :string
    end

    create unique_index(:pinned_custom_resources, [:name, :cluster_id])
  end
end
