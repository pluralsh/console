defmodule Console.Repo.Migrations.ObservableMetrics do
  use Ecto.Migration

  def change do
    create table(:observable_metrics, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :provider_id, references(:observability_providers, type: :uuid, on_delete: :delete_all)
      add :stack_id,    references(:stacks, type: :uuid, on_delete: :delete_all)
      add :gate_id,     references(:pipeline_gates, type: :uuid, on_delete: :delete_all)
      add :identifier,  :string
      add :action,      :integer

      timestamps()
    end

    alter table(:stack_runs) do
      add :cancellation_reason, :binary
    end
  end
end
