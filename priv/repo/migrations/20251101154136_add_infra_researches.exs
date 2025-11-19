defmodule Console.Repo.Migrations.AddInfraResearches do
  use Ecto.Migration

  def change do
    create table(:infra_research, primary_key: false) do
      add :id,       :uuid, primary_key: true
      add :status,   :integer
      add :prompt,   :binary
      add :diagram,  :binary
      add :analysis, :map
      add :user_id,  references(:watchman_users, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:infra_research, [:user_id])

    create table(:research_associations, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :research_id, references(:infra_research, type: :uuid, on_delete: :delete_all)
      add :stack_id,    references(:stacks, type: :uuid, on_delete: :delete_all)
      add :service_id,  references(:services, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:research_associations, [:research_id])
    create index(:research_associations, [:stack_id])
    create index(:research_associations, [:service_id])

    alter table(:chat_threads) do
      add :research_id, references(:infra_research, type: :uuid, on_delete: :delete_all)
    end
  end
end
