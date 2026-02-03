defmodule Console.Schema.HelmRepository do
  use Piazza.Ecto.Schema
  alias Console.Schema.GitRepository

  defenum Provider, basic: 0, bearer: 1, gcp: 2, azure: 3, aws: 4

  schema "helm_repositories" do
    field :url,         :string
    field :provider,    Provider, default: :basic
    field :health,      GitRepository.Health
    field :error,       :string
    field :pulled_at,   :utc_datetime_usec

    embeds_one :auth, Console.Schema.OCIAuth, on_replace: :update

    field :index,       :map, virtual: true

    timestamps()
  end

  def search(query \\ __MODULE__, search) do
    from(h in query, where: ilike(h.url, ^"%#{search}%"))
  end

  def without_urls(query \\ __MODULE__, urls) when is_list(urls) do
    from(h in query, where: h.url not in ^urls)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :url]) do
    from(h in query, order_by: ^order)
  end

  def statistics(query \\ __MODULE__) do
    from(h in query, group_by: h.health, select: %{health: h.health, count: count(h.id, :distinct)})
  end

  @valid ~w(url provider health error pulled_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:auth)
    |> validate_required([:url])
  end
end
