defmodule Console.Repo.Migrations.AddLeaders do
  use Ecto.Migration

  def change do
    create table(:leaders, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :heartbeat, :utc_datetime_usec
      add :ref,       :binary
      add :name,      :string

      timestamps()
    end

    create unique_index(:leaders, [:name])
  end
end
