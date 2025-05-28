defmodule Console.Repo.Migrations.AddProjectIdServiceContext do
  use Ecto.Migration
  alias Console.Schema.ServiceContext
  alias Console.Deployments.Settings

  def change do
    alter table(:service_contexts) do
      add :project_id, references(:projects, type: :binary_id, on_delete: :delete_all)
    end

    create index(:service_contexts, [:project_id])

    flush()

    default = Settings.default_project!()
    Console.Repo.update_all(ServiceContext, set: [project_id: default.id])
  end
end
