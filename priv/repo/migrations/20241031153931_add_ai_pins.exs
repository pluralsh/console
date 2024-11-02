defmodule Console.Repo.Migrations.AddAiPins do
  use Ecto.Migration

  def change do
    create table(:ai_pins, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :name,       :string
      add :user_id,    references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :delete_all)
      add :thread_id,  references(:chat_threads, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:ai_pins, [:user_id])
  end
end
