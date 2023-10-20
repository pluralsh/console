defmodule Console.Repo.Migrations.AddClusterProviderDeleting do
  use Ecto.Migration

  def change do
    alter table(:cluster_providers) do
      add :deleted_at, :utc_datetime_usec
    end
  end
end
