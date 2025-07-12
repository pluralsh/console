defmodule Console.Repo.Migrations.AddSessionType do
  use Ecto.Migration

  def change do
    alter table(:agent_sessions) do
      add :type,       :integer
      add :service_id, :string
    end

    alter table(:clusters) do
      add :cpu_util,    :float
      add :memory_util, :float
    end
  end
end
