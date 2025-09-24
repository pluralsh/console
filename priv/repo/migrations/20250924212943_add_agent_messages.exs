defmodule Console.Repo.Migrations.AddAgentMessages do
  use Ecto.Migration

  def change do
    execute "CREATE SEQUENCE agent_messages_sequence_number_seq START 1 INCREMENT 1;"

    create table(:agent_messages, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :delete_all)
      add :seq,          :integer, default: fragment("nextval('agent_messages_sequence_number_seq')")
      add :message,      :binary
      add :cost,         :map
      add :metadata,     :map

      timestamps()
    end

    create index(:agent_messages, [:agent_run_id])

    execute "CREATE SEQUENCE agent_prompts_sequence_number_seq START 1 INCREMENT 1;"

    create table(:agent_prompts, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :delete_all)
      add :seq,          :integer, default: fragment("nextval('agent_prompts_sequence_number_seq')")
      add :prompt,       :binary

      timestamps()
    end

    create index(:agent_prompts, [:agent_run_id])
  end
end
