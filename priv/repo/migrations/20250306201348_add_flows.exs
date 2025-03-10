defmodule Console.Repo.Migrations.AddFlows do
  use Ecto.Migration

  def change do
    create table(:flows, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string
      add :description, :string
      add :icon,        :string

      add :project_id,      references(:projects, type: :uuid)
      add :read_policy_id,  :uuid
      add :write_policy_id, :uuid

      timestamps()
    end

    create unique_index(:flows, [:name])
    create index(:flows, [:project_id])

    alter table(:services) do
      add :flow_id, references(:flows, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:pipelines) do
      add :flow_id, references(:flows, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:pull_requests) do
      add :flow_id, references(:flows, type: :uuid, on_delete: :nilify_all)
    end
  end
end
