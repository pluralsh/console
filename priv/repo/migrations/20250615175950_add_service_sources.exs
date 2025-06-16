defmodule Console.Repo.Migrations.AddServiceSources do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :sources,   :map
      add :renderers, :map
    end
  end
end
