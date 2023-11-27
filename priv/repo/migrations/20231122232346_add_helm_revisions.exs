defmodule Console.Repo.Migrations.AddHelmRevisions do
  use Ecto.Migration

  def change do
    alter table(:revisions) do
      add :helm, :map
    end
  end
end
