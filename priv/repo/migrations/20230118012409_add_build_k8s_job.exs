defmodule Console.Repo.Migrations.AddBuildK8sJob do
  use Ecto.Migration

  def change do
    alter table(:builds) do
      add :job_name, :string
    end
  end
end
