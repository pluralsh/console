defmodule Console.Schema.Revision do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, ServiceConfiguration}

  schema "revisions" do
    field :version, :string
    field :sha,     :string

    embeds_one :git, Service.Git, on_replace: :update
    belongs_to :service, Service
    has_many :configuration, ServiceConfiguration

    timestamps()
  end

  def for_service(query \\ __MODULE__, service_id) do
    from(r in query, where: r.service_id == ^service_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(r in query, order_by: ^order)
  end

  @valid ~w(version sha)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> cast_assoc(:configuration)
    |> validate_required(~w(version)a)
  end
end
