defmodule Console.Repo.Migrations.AddStackCronTrackRef do
  use Ecto.Migration

  def change do
    alter table(:stack_crons) do
      add :track_ref, :boolean, default: false
    end
  end
end
