defmodule Console.Repo.Migrations.AddPinUniq do
  use Ecto.Migration

  def change do
    create unique_index(:ai_pins, [:user_id, :insight_id])
    create unique_index(:ai_pins, [:user_id, :thread_id])
  end
end
