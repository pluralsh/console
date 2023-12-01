defmodule Console.Repo.Migrations.AddKustomizeRevisions do
  use Ecto.Migration

  def change do
    alter table(:revisions) do
      add :kustomize, :map
    end
  end
end
