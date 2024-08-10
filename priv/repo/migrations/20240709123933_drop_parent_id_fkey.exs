defmodule Console.Repo.Migrations.DropParentIdFkey do
  use Console.Migration

  @disable_ddl_transaction true

  def change do
    drop_if_exists constraint(:services, :services_parent_id_fkey)
    alter table(:services) do
      modify :parent_id, :uuid
    end
  end
end
