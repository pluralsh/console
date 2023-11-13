defmodule Console.Repo.Migrations.AddServiceDocsPath do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :docs_path,   :string
      add :sync_config, :map
    end
  end
end
