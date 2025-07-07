defmodule Console.Repo.Migrations.AddPrGovernance do
  use Ecto.Migration

  def change do
    create table(:pr_governance, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :name,          :string
      add :connection_id, references(:scm_connections, type: :uuid, on_delete: :delete_all)
      add :configuration, :map

      timestamps()
    end

    create unique_index(:pr_governance, [:name])

    alter table(:pr_automations) do
      add :governance_id, references(:pr_governance, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:pull_requests) do
      add :governance_id,    references(:pr_governance, type: :uuid, on_delete: :nilify_all)
      add :body,             :binary
      add :approved,         :boolean, default: false
      add :governance_state, :map
    end
  end
end
