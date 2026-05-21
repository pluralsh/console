defmodule Console.AI.Tools.Workbench.SavedPrompt do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :title,    :string
    field :category, :string
  end

  @json_schema Console.priv_file!("tools/workbench/saved_prompt.json") |> Jason.decode!()

  def name(), do: "saved_prompt"
  def json_schema(), do: @json_schema
  def description(), do: "Generate a useful title and category for a saved prompt"

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:title, :category])
    |> validate_required([:title, :category])
    |> validate_length(:title, max: 255)
    |> validate_length(:category, max: 255)
  end

  def implement(%__MODULE__{} = model), do: {:ok, model}
end
