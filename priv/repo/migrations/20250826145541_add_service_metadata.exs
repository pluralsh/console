defmodule Console.Repo.Migrations.AddServiceMetadata do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :metadata, :map
    end
  end
end
