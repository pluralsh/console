defmodule Console.Repo.Migrations.AddClusterAzs do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :availability_zones, {:array, :string}
    end
  end
end
