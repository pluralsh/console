defmodule Console.Schema.HelmRepository do
  use Piazza.Ecto.Schema
  alias Console.Schema.GitRepository

  defenum Provider, basic: 0, bearer: 1, gcp: 2, azure: 3, aws: 4

  schema "helm_repositories" do
    field :url,         :string
    field :provider,    Provider
    field :health,      GitRepository.Health
    field :pulled_at,   :utc_datetime_usec

    field :index,       :map, virtual: true

    timestamps()
  end

  @valid ~w(url provider health pulled_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:url])
  end
end
