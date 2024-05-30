defmodule Console.Schema.TerraformState do
  use Piazza.Ecto.Schema
  alias Console.Schema.Stack

  schema "terraform_states" do
    field :state, :binary

    field :lock_id, :string, virtual: true

    embeds_one :lock, Lock, on_replace: :update, primary_key: false do
      field :id,        :string
      field :operation, :string
      field :info,      :string
      field :who,       :string
      field :version,   :string
      field :created,   :string
      field :path,      :string
    end

    belongs_to :stack, Stack

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(state lock_id stack_id)a)
    |> cast_embed(:lock, with: &lock_changeset/2)
    |> unique_constraint(:stack_id)
  end

  def lock_changeset(model, attrs) do
    cast(model, attrs, ~w(id operation info who version created path)a)
  end
end
