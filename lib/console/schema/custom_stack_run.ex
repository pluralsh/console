defmodule Console.Schema.CustomStackRun do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack, Configuration}

  schema "custom_stack_runs" do
    field :name,          :string
    field :documentation, :string

    embeds_many :commands, Command, on_replace: :delete do
      field :cmd,  :string
      field :args, {:array, :string}
      field :dir,  :string
    end

    embeds_many :configuration, Configuration, on_replace: :delete

    belongs_to :stack, Stack

    timestamps()
  end

  def for_stack(query \\ __MODULE__, id) do
    from(cr in query, where: cr.stack_id == ^id or is_nil(cr.stack_id))
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name documentation stack_id)a)
    |> cast_embed(:configuration)
    |> cast_embed(:commands, with: &command_changeset/2)
    |> unique_constraint([:stack_id, :name])
    |> foreign_key_constraint(:stack_id)
    |> validate_required([:name])
  end

  def command_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(cmd args dir)a)
    |> validate_required([:cmd])
  end
end
