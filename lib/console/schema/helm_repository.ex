defmodule Console.Schema.HelmRepository do
  use Piazza.Ecto.Schema
  alias Console.Schema.GitRepository

  defenum Provider, basic: 0, bearer: 1, gcp: 2, azure: 3, aws: 4

  schema "helm_repositories" do
    field :url,         :string
    field :provider,    Provider
    field :health,      GitRepository.Health
    field :pulled_at,   :utc_datetime_usec

    embeds_one :auth, Console.Schema.OCIAuth, on_replace: :update

    field :index,       :map, virtual: true

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :url]) do
    from(h in query, order_by: ^order)
  end

  @valid ~w(url provider health pulled_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:auth)
    |> validate_required([:url])
  end
end
