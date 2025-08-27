defmodule Console.Repo.Migrations.AddServiceErrorsWarnings do
  use Ecto.Migration

  def change do
    alter table(:service_errors) do
      add :warning, :boolean, default: false
    end
  end
end
