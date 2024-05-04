defmodule Console.Repo.Migrations.AddGlobalServiceCascade do
  use Ecto.Migration

  def change do
    alter table(:global_services) do
      add :cascade, :map
    end

    alter table(:managed_namespaces) do
      add :cascade, :map
    end
  end
end
