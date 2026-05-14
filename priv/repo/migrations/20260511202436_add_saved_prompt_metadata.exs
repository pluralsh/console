defmodule Console.Repo.Migrations.AddSavedPromptMetadata do
  use Ecto.Migration

  def change do
    alter table(:workbench_prompts) do
      add :title,    :string
      add :category, :string
    end
  end
end
