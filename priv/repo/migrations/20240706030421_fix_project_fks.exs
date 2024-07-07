defmodule Console.Repo.Migrations.FixProjectFks do
  use Ecto.Migration

  def change do
    alter table(:global_services) do
      modify :project_id, references(:projects, type: :uuid),
        from: references(:projects, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:managed_namespaces) do
      modify :project_id, references(:projects, type: :uuid),
        from: references(:projects, type: :uuid, on_delete: :nilify_all)
    end
  end
end
