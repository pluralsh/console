defmodule Console.Repo.Migrations.AddInfraResearchPublish do
  use Ecto.Migration

  def change do
    alter table(:infra_research) do
      add :published, :boolean, default: false
    end

    create index(:infra_research, [:published])
  end
end
