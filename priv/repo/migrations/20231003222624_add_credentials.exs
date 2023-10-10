defmodule Console.Repo.Migrations.AddCredentials do
  use Ecto.Migration

  def change do
    create table(:provider_credentials, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :provider_id, references(:cluster_providers, type: :uuid, on_delete: :delete_all)
      add :name,        :string
      add :kind,        :string
      add :namespace,   :string

      timestamps()
    end

    alter table(:git_repositories) do
      add :https_path, :string
      add :url_format, :string
    end

    create index(:provider_credentials, [:provider_id])
    create unique_index(:provider_credentials, [:provider_id, :name])
  end
end
