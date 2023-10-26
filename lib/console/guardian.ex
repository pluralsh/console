defmodule Console.Guardian do
  use Guardian, otp_app: :console
  require Logger
  alias Console.Schema.User
  use Nebulex.Caching

  @ttl :timer.minutes(15)

  def subject_for_token(%User{id: id}, _claims),
    do: {:ok, "user:#{id}"}
  def subject_for_token(_, _), do: {:error, :invalid_argument}

  def resource_from_claims(%{"sub" => "user:" <> id} = claims) do
    case possibly_cached(id, claims) do
      %User{} = user ->
        Logger.info "user #{user.email} logged in"
        {:ok, user}
      res ->
        Logger.info "got unexpected fetch_user result #{inspect(res)}"
        {:error, :not_found}
    end
  end
  def resource_from_claims(_claims), do: {:error, :invalid_token}

  def possibly_cached(id, %{"cached" => true}), do: cached_fetch_user(id)
  def possibly_cached(id, _), do: fetch_user(id)

  # @decorate cacheable(cache: Console.Cache, key: {:login, id}, opts: [ttl: @ttl], match: &allow/1)
  def fetch_user(id) do
    Console.Repo.get(User, id)
    |> Console.Services.Rbac.preload()
  end

  @decorate cacheable(cache: Console.Cache, key: {:login, id}, opts: [ttl: @ttl, match: &allow/1])
  def cached_fetch_user(id), do: fetch_user(id)

  def allow(%User{}), do: true
  def allow(_), do: false
end
