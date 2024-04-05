defmodule Console.Schema.StackFile do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack, StackRun}

  schema "stack_files" do
    field :path,    :string
    field :content, Piazza.Ecto.EncryptedString

    belongs_to :stack, Stack
    belongs_to :run, StackRun
  end

  @valid ~w(path content stack_id run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:run_id)
    |> validate_required(~w(path content)a)
  end
end
