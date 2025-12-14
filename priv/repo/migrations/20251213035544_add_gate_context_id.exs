defmodule Console.Repo.Migrations.AddGateContextId do
  use Ecto.Migration

  def change do
    alter table(:pipelines) do
      add :interval,     :string
      add :next_poll_at, :utc_datetime_usec
    end

    alter table(:pipeline_gates) do
      add :context_id, references(:pipeline_contexts, type: :uuid, on_delete: :nilify_all)
    end
  end
end
