defmodule Console.Repo.Migrations.NilifyOwnerId do
  use Ecto.Migration

  def change do
    alter table(:services) do
      modify :owner_id, references(:global_services, type: :uuid, on_delete: :nilify_all),
        from: references(:global_services, type: :uuid)
    end
  end
end
