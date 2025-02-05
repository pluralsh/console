defmodule Console.Repo.Migrations.AddLogResponseCode do
  use Ecto.Migration

  def change do
    alter table(:cluster_audit_logs) do
      add :response_code, :integer
    end
  end
end
