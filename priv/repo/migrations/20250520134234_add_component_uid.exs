defmodule Console.Repo.Migrations.AddComponentUid do
  use Ecto.Migration

  def change do
    alter table(:service_components) do
      add :uid, :string
    end
  end
end
