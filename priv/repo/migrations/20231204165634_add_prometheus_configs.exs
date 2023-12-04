defmodule Console.Repo.Migrations.AddPrometheusConfigs do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :prometheus_connection, :map
      add :loki_connection,       :map
    end

    alter table(:agent_migrations) do
      add :ref,           :string
      add :configuration, :map
    end
  end
end
