defmodule Console.Repo.Migrations.AddKustomize do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :kustomize, :map
      add :helm,      :map
    end
  end
end
