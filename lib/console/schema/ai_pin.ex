defmodule Console.Schema.AiPin do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, AiInsight, ChatThread}

  schema "ai_pins" do
    field :name, :string

    belongs_to :user,    User
    belongs_to :insight, AiInsight
    belongs_to :thread,  ChatThread

    timestamps()
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(p in query, where: p.user_id == ^user_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name user_id insight_id thread_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:thread_id)
    |> foreign_key_constraint(:insight_id)
    |> validate_length(:name, max: 255)
    |> validate_required([:user_id])
  end
end
