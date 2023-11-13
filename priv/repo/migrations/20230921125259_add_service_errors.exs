defmodule Console.Repo.Migrations.AddServiceErrors do
  use Ecto.Migration

  def change do
    create table(:service_errors, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :source,     :string
      add :message,    :binary

      timestamps()
    end

    create table(:deploy_tokens, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :token,      :string

      timestamps()
    end

    create index(:service_errors, [:service_id])
    create index(:deploy_tokens, [:cluster_id])
    create unique_index(:deploy_tokens, [:cluster_id, :token])
  end
end
