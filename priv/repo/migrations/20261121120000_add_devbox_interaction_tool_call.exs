defmodule Console.Repo.Migrations.AddDevboxInteractionToolCall do
  use Ecto.Migration

  def change do
    alter table(:devbox_instance_interactions) do
      add :tool_call, :map
    end
  end
end
