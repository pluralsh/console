defprotocol Console.AI.Authorizable do
  @moduledoc """
  A protocol implementation for generating the information needed to reconstruct read authorization for
  a given resource.
  """

  @doc """
  Generates a pair of user ids and group ids that are allowed to read the given resource.
  """
  @fallback_to_any true

  @spec authorize(term) :: {list(binary), list(binary)}
  def authorize(resource)
end

defmodule Console.AI.Authorizable.Utils do
  alias Console.Deployments.Policies.Rbac

  def preload(resource), do: Rbac.preload(resource)

  def pluck_bindings(resource, bindings) do
    Enum.reduce(bindings, {[], []}, fn binding, acc ->
      Map.get(resource, binding)
      |> Enum.reduce(acc, fn
        %{group_id: id}, {users, groups} when is_binary(id) -> {users, [id | groups]}
        %{user_id: id}, {users, groups} when is_binary(id) -> {[id | users], groups}
        _, acc -> acc
      end)
    end)
  end

  def merge({users, groups}, {other_users, other_groups}),
    do: {Enum.uniq(users ++ other_users), Enum.uniq(groups ++ other_groups)}

  def recurse(current, resource) do
    Console.AI.Authorizable.authorize(resource)
    |> merge(current)
  end
end

defimpl Console.AI.Authorizable, for: Any do
  def authorize(_), do: {[], []}
end

defimpl Console.AI.Authorizable, for: Console.Schema.DeploymentSettings do
  import Console.AI.Authorizable.Utils


  def authorize(%@for{} = settings) do
    preload(settings)
    |> pluck_bindings([:read_bindings, :write_bindings])
  end
end

defimpl Console.AI.Authorizable, for: Console.Schema.Project do
  import Console.AI.Authorizable.Utils
  alias Console.Deployments.Settings

  def authorize(%@for{} = project) do
    preload(project)
    |> pluck_bindings([:read_bindings, :write_bindings])
    |> recurse(Settings.fetch())
  end
end

defimpl Console.AI.Authorizable, for: Console.Schema.Cluster do
  import Console.AI.Authorizable.Utils

  def authorize(%@for{} = cluster) do
    cluster = preload(cluster)

    cluster
    |> pluck_bindings([:read_bindings, :write_bindings])
    |> recurse(cluster.project)
  end
end

defimpl Console.AI.Authorizable, for: Console.Schema.Service do
  import Console.AI.Authorizable.Utils

  def authorize(%@for{} = service) do
    service = preload(service)

    service
    |> pluck_bindings([:read_bindings, :write_bindings])
    |> recurse(service.cluster)
    |> recurse(service.flow)
  end
end

defimpl Console.AI.Authorizable, for: Console.Schema.Flow do
  import Console.AI.Authorizable.Utils

  def authorize(%@for{} = flow) do
    preload(flow)
    |> pluck_bindings([:read_bindings, :write_bindings])
  end
end

defimpl Console.AI.Authorizable, for: Console.Schema.Stack do
  import Console.AI.Authorizable.Utils

  def authorize(%@for{} = stack) do
    stack = preload(stack)

    stack
    |> pluck_bindings([:read_bindings, :write_bindings])
    |> recurse(stack.project)
  end
end

defimpl Console.AI.Authorizable, for: Console.Schema.PrAutomation do
  import Console.AI.Authorizable.Utils

  def authorize(%@for{} = pr) do
    pr = preload(pr)

    pr
    |> pluck_bindings([:create_bindings, :write_bindings])
    |> recurse(pr.project)
    |> recurse(pr.catalog)
  end
end

defimpl Console.AI.Authorizable, for: Console.Schema.Catalog do
  import Console.AI.Authorizable.Utils

  def authorize(%@for{} = catalog) do
    preload(catalog)
    |> pluck_bindings([:read_bindings, :write_bindings, :create_bindings])
    |> recurse(catalog.project)
  end
end
