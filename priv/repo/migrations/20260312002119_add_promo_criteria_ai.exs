defmodule Console.Repo.Migrations.AddPromoCriteriaAi do
  use Ecto.Migration

  def change do
    alter table(:promotion_criteria) do
      add :ai, :map
      add :connection_id, references(:scm_connections, type: :uuid, on_delete: :nilify_all)
    end

    create index(:promotion_criteria, [:connection_id])
  end
end
