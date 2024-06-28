defmodule Console.Schema.StackDefinition do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack, RunStep}

  schema "stack_definitions" do
    field :name,        :string
    field :description, :string

    embeds_one :configuration, Stack.Configuration, on_replace: :update

    embeds_many :steps, Step, on_replace: :delete do
      field :stage,            RunStep.Stage
      field :cmd,              :string
      field :args,             {:array, :string}
      field :require_approval, :boolean
    end

    timestamps()
  end

  @valid ~w(name description)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:configuration)
    |> cast_embed(:steps, with: &step_changeset/2)
  end

  def step_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(stage cmd args require_approval)a)
    |> validate_required(~w(stage cmd args)a)
  end
end
