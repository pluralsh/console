defmodule Console.Repo.Migrations.AddGlobalServiceParentId do
  use Ecto.Migration

  def change do
    alter table(:global_services) do
      add :parent_id, :uuid
    end

    alter table(:managed_namespaces) do
      add :parent_id, :uuid
    end
  end
end
