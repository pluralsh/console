defmodule Console.Logs.Query do
  alias Console.Repo
  alias Console.Logs.Time
  alias Console.Schema.{User, Project, Cluster, Service}
  alias Console.Deployments.Policies

  @default_limit 200

  @type t :: %__MODULE__{time: Time.t}
  @type direction :: :gte | :lte | :gt | :lt

  defstruct [:project_id, :cluster_id, :service_id, :query, :limit, :resource, :time, :facets, :namespaces]

  def new(args) do
    %__MODULE__{
      project_id: args[:project_id],
      cluster_id: args[:cluster_id],
      service_id: args[:service_id],
      query: args[:query],
      limit: args[:limit],
      time: Time.new(args[:time]),
      facets: args[:facets]
    }
  end

  @spec opposite(direction) :: direction
  def opposite(:gte), do: :lte
  def opposite(:lte), do: :gte
  def opposite(:gt), do: :lte
  def opposite(:lt), do: :gte

  @spec add_duration(direction, Timex.t, Timex.Duration.t) :: Timex.t
  def add_duration(dir, ts, dur) when dir in ~w(lt lte)a, do: Timex.add(ts, dur)
  def add_duration(dir, ts, dur) when dir in ~w(gt gte)a, do: Timex.subtract(ts, dur)

  def limit(%__MODULE__{limit: l}) when is_integer(l), do: l
  def limit(_), do: @default_limit

  def preload(%__MODULE__{resource: %Service{} = svc} = query),
    do: %{query | resource: Repo.preload(svc, [:cluster])}
  def preload(q), do: q

  def accessible(%__MODULE__{project_id: project_id} = q, %User{} = user) when is_binary(project_id),
    do: check_access(Project, project_id, user, q)
  def accessible(%__MODULE__{cluster_id: id} = q, %User{} = user) when is_binary(id),
    do: check_access(Cluster, id, user, q)
  def accessible(%__MODULE__{service_id: id} = q, %User{} = user) when is_binary(id),
    do: check_access(Service, id, user, q)
  def accessible(_, _), do: {:error, "forbidden"}

  defp check_access(model, id, user, query) do
    Console.Repo.get!(model, id)
    |> Policies.allow(user, :read)
    |> case do
      {:ok, resource} ->
        {:ok, preload(%{query | resource: resource})}
      err -> err
    end
  end
end
