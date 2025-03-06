defmodule Console.Deployments.Flows do
  use Console.Services.Base
  alias Console.PubSub
  import Console.Deployments.Policies
  alias Console.Deployments.Settings
  alias Console.Schema.{Flow, User}

  @type flow_resp :: {:ok, Flow.t} | Console.error

  @spec get!(binary) :: Flow.t
  def get!(id), do: Repo.get!(Flow, id)

  @spec get(binary) :: Flow.t | nil
  def get(id), do: Repo.get(Flow, id)

  @spec get_by_name!(binary) :: Flow.t
  def get_by_name!(name), do: Repo.get_by!(Flow, name: name)

  @spec get_by_name(binary) :: Flow.t | nil
  def get_by_name(name), do: Repo.get_by(Flow, name: name)

  @doc "fetches and determines if the user has access to the given flow"
  @spec accessible(binary, User.t) :: flow_resp
  def accessible(id, %User{} = user) do
    get!(id)
    |> allow(user, :read)
  end

  @doc """
  Either creates a new flow or updates an existing one
  """
  @spec upsert_flow(map, User.t) :: flow_resp
  def upsert_flow(%{name: name} = attrs, %User{} = user) do
    case get_by_name(name) do
      %Flow{} = flow -> update_flow(attrs, flow, user)
      nil -> create_flow(attrs, user)
    end
  end

  @doc """
  Creates a new flow
  """
  @spec create_flow(map, User.t) :: flow_resp
  def create_flow(attrs, %User{} = user) do
    %Flow{}
    |> Flow.changeset(Settings.add_project_id(attrs))
    |> allow(user, :create)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc "Updates an existing flow"
  @spec update_flow(map, Flow.t | binary, User.t) :: flow_resp
  def update_flow(attrs, %Flow{} = flow, %User{} = user) do
    start_transaction()
    |> add_operation(:allow, fn _ ->
      allow(flow, user, :write)
    end)
    |> add_operation(:update, fn %{allow: flow} ->
      Flow.changeset(flow, attrs)
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end

  def update_flow(attrs, id, %User{} = user) when is_binary(id) do
    update_flow(attrs, get!(id), user)
  end

  @doc """
  Deletes an existing flow, will throw if not found
  """
  @spec delete_flow(binary, User.t) :: flow_resp
  def delete_flow(id, %User{} = user) do
    get!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  defp notify({:ok, %Flow{} = flow}, :create, user),
    do: handle_notify(PubSub.FlowCreated, flow, actor: user)
  defp notify({:ok, %Flow{} = flow}, :update, user),
    do: handle_notify(PubSub.FlowUpdated, flow, actor: user)
  defp notify({:ok, %Flow{} = flow}, :delete, user),
    do: handle_notify(PubSub.FlowDeleted, flow, actor: user)
  defp notify(pass, _, _), do: pass
end
