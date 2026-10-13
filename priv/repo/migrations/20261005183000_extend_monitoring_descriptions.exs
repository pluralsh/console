defmodule Console.Repo.Migrations.ExtendMonitoringFieldLengths do
  use Ecto.Migration

  def change do
    alter table(:monitors) do
      modify :description, :string, size: 10_000, from: :string
      modify :prompt, :string, size: 2_048, from: :string
    end

    alter table(:dashboards) do
      modify :description, :string, size: 10_000, from: :string
    end
  end
end
