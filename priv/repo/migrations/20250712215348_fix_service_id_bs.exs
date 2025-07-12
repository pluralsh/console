defmodule Console.Repo.Migrations.FixServiceIdBs do
  use Ecto.Migration

  def change do
    alter table(:agent_sessions) do
      remove :service_id
    end

    alter table(:agent_sessions) do
      add :service_id, references(:services, type: :uuid, on_delete: :nilify_all)
    end
  end
end
