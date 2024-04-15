defmodule Console.Repo.Migrations.AddStackNotifications do
  use Ecto.Migration

  def change do
    alter table(:router_filters) do
      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)
    end
  end
end
