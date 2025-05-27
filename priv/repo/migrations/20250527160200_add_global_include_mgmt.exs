defmodule Console.Repo.Migrations.AddGlobalIncludeMgmt do
  use Ecto.Migration

  def change do
    alter table(:global_services) do
      add :mgmt, :boolean
    end
  end
end
