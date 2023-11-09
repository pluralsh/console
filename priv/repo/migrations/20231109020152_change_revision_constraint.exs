defmodule Console.Repo.Migrations.ChangeRevisionConstraint do
  use Ecto.Migration

  def up do
    drop constraint(:services, "services_revision_id_fkey")

    alter table(:services) do
      modify :revision_id, references(:revisions, type: :uuid, on_delete: :restrict)
    end
  end

  def down do
    drop constraint(:services, "services_revision_id_fkey")

    alter table(:services) do
      modify :revision_id, references(:revisions, type: :uuid, on_delete: :delete_all)
    end
  end
end
