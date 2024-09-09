defmodule Console.Repo.Migrations.AddUpgradeInsights do
  use Ecto.Migration

  def change do
    create table(:upgrade_insights, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :cluster_id,      references(:clusters, type: :uuid, on_delete: :delete_all)
      add :name,            :string
      add :version,         :string
      add :description,     :binary
      add :status,          :integer
      add :refreshed_at,    :utc_datetime_usec
      add :transitioned_at, :utc_datetime_usec

      timestamps()
    end

    create table(:upgrade_insight_details, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :insight_id, references(:upgrade_insights, type: :uuid, on_delete: :delete_all)

      add :status,      :integer
      add :used,        :string
      add :replacement, :string

      add :replaced_in, :string
      add :removed_in,  :string

      timestamps()
    end

    create index(:upgrade_insights, [:cluster_id])
    create index(:upgrade_insight_details, [:insight_id])
  end
end
