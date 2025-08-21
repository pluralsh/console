defmodule Console.Repo.Migrations.AddTemplateIdIndex do
  use Ecto.Migration

  def change do
    create index(:revisions, [:template_id])
  end
end
