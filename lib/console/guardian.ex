defmodule Console.Guardian do
  use Guardian, otp_app: :console
  import Console.Schema.Stack, only: [is_terminal: 1]
  require Logger
  alias Console.Schema.{User, StackRun}
  alias Console.Deployments.Stacks
  use Nebulex.Caching

  @ttl :timer.minutes(15)

  def subject_for_token(%User{id: id}, _claims),
    do: {:ok, "user:#{id}"}
  def subject_for_token(_, _), do: {:error, :invalid_argument}

  def resource_from_claims(%{"run_id" => run_id} = claims) do
    case Stacks.get_run(run_id) do
      %StackRun{status: s} when not is_terminal(s) ->
        Map.delete(claims, "run_id")
        |> resource_from_claims()
      _ -> {:error, :invalid_token}
    end
  end

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
