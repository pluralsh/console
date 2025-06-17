defmodule Console.Repo.Migrations.AddSourcesServiceTemplate do
  use Ecto.Migration

  def change do
    alter table(:service_templates) do
      add :sources,   :map
      add :renderers, :map
    end
  end
end
