defmodule Console.Repo.Migrations.AddProjects do
  use Ecto.Migration
  alias Console.Deployments.Settings

  def change do
    create table(:projects, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string
      add :description, :string
      add :default,     :boolean

      add :read_policy_id,  :uuid
      add :write_policy_id, :uuid

      timestamps()
    end

    alter table(:clusters) do
      add :project_id, references(:projects, type: :uuid)
    end

    alter table(:stacks) do
      add :project_id, references(:projects, type: :uuid)
    end

    alter table(:pipelines) do
      add :project_id, references(:projects, type: :uuid)
    end

    alter table(:global_services) do
      add :project_id, references(:projects, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:managed_namespaces) do
      add :project_id, references(:projects, type: :uuid, on_delete: :nilify_all)
    end

    create unique_index(:projects, [:name])
    create unique_index(:projects, [:default])
    create constraint(:projects, :null_or_true, check: "\"default\"") # only one default row
    create index(:clusters, [:project_id])
    create index(:stacks, [:project_id])
    create index(:pipelines, [:project_id])
    create index(:global_services, [:project_id])
    create index(:managed_namespaces, [:project_id])

    flush()

    {:ok, _} = Settings.create_default_project()
  end
end
