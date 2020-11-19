defmodule Watchman.Guardian do
  use Guardian, otp_app: :watchman
  use Nebulex.Caching
  alias Watchman.Schema.User

  @ttl Nebulex.Time.expiry_time(15, :minute)

  def subject_for_token(%User{id: id}, _claims),
    do: {:ok, "user:#{id}"}
  def subject_for_token(_, _), do: {:error, :invalid_argument}

  def resource_from_claims(%{"sub" => "user:" <> id}) do
    case fetch_user(id) do
      %User{} = user -> {:ok, user}
      _ -> {:error, :not_authorized}
    end
  end
  def resource_from_claims(_claims), do: {:error, :not_authorized}

  @decorate cacheable(cache: Watchman.Cache, key: {:login, id}, opts: [ttl: @ttl], match: &allow/1)
  def fetch_user(id) do
    Watchman.Repo.get(User, id)
    |> Watchman.Services.Rbac.preload()
  end

  def allow(%User{} = user), do: {true, user}
  def allow(_), do: false
end