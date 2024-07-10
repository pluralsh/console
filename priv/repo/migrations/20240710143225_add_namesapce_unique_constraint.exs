defmodule Console.Repo.Migrations.AddNamesapceUniqueConstraint do
  use Ecto.Migration

  def change do
    alter table(:managed_namespaces) do
      add :namespace, :string
    end

    create unique_index(:managed_namespaces, [:name])
  end
end
