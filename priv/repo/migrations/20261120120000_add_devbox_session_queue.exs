defmodule Console.Repo.Migrations.AddDevboxSessionQueue do
  use Ecto.Migration

  def change do
    alter table(:devbox_instance_sessions) do
      add :queued_prompts,      :map
      add :parent_tool_call_id, :string
    end
  end
end
