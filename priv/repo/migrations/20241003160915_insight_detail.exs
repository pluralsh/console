defmodule Console.Repo.Migrations.InsightDetail do
  use Ecto.Migration

  def change do
    alter table(:upgrade_insight_details) do
      add :client_info, :map
    end

    alter table(:runtime_services) do
      add :instance_count, :integer, default: 1
    end
  end
end
