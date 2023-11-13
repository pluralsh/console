defmodule Console.Repo.Migrations.AddEdgePromoted do
  use Ecto.Migration

  def change do
    alter table(:pipeline_edges) do
      add :promoted_at, :utc_datetime_usec
    end
  end
end
