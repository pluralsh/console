defmodule Console.Repo.Migrations.AddHelmRepositories do
  use Ecto.Migration

  def change do
    create table(:helm_repositories, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :url,       :string
      add :status,    :integer
      add :provider,  :integer
      add :auth,      :map
      add :pulled_at, :utc_datetime_usec
      add :health,    :integer

      timestamps()
    end

    create unique_index(:helm_repositories, [:url])

    alter table(:policy_constraints) do
      add :enforcement, :integer
    end

    alter table(:service_templates) do
      modify :repository_id, references(:git_repositories, type: :uuid, on_delete: :delete_all),
        from: references(:git_repositories, type: :uuid)
    end

    alter table(:global_services) do
      modify :template_id, references(:service_templates, type: :uuid),
        from: references(:service_templates, type: :uuid, on_delete: :delete_all)
    end

    alter table(:managed_namespaces) do
      modify :service_id, references(:service_templates, type: :uuid),
        from: references(:service_templates, type: :uuid, on_delete: :delete_all)
    end
  end
end
