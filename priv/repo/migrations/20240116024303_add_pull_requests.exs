defmodule Console.Repo.Migrations.AddPullRequests do
  use Ecto.Migration

  def change do
    create table(:pull_requests, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :title,      :string
      add :url,        :string
      add :status,     :integer
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:pull_requests, [:cluster_id])
    create index(:pull_requests, [:service_id])
    create unique_index(:pull_requests, [:url])
  end
end
