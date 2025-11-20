defmodule Console.Repo.Migrations.AddStackCronTrackRef do
  use Ecto.Migration

  def change do
    alter table(:stack_crons) do
      add :track_ref, :string
    end
  end
end
