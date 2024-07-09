defmodule Console.Repo.Migrations.DropParentIdFkey do
  use Ecto.Migration

  def change do
    alter table(:services) do
      modify :parent_id, :uuid, from: references(:services, type: :uuid, on_delete: :nilify_all)
    end
  end
end
