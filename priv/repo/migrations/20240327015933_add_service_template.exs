defmodule Console.Repo.Migrations.AddServiceTemplate do
  use Ecto.Migration

  def change do
    create table(:service_templates, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :templated,     :boolean, default: true
      add :repository_id, references(:git_repositories, type: :uuid)
      add :contexts,      {:array, :string}

      add :git,       :map
      add :helm,      :map
      add :kustomize, :map

      timestamps()
    end

    alter table(:managed_namespaces) do
      add :service_id, references(:service_templates, type: :uuid, on_delete: :delete_all)
    end
  end
end
