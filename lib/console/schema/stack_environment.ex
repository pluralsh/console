defmodule Console.Schema.StackEnvironment do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack, StackRun}

  schema "stack_environment" do
    field :name,   :string
    field :value,  Piazza.Ecto.EncryptedString
    field :secret, :boolean

    belongs_to :stack, Stack
    belongs_to :run, StackRun

    timestamps()
  end

  @valid ~w(name value secret stack_id run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:run_id)
    |> validate_required(~w(name value)a)
  end
end
