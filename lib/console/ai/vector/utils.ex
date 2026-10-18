defmodule Console.AI.Vector.Utils do
  require Logger
  alias Console.Deployments.Settings
  alias Console.Schema.User

  @local_cache Console.conf(:local_cache)
  @reinit_cooldown :timer.minutes(1)

  @spec initialized() :: :ok | Console.error
  def initialized() do
    case Settings.vector_store_initialized() do
      {:ok, _} -> :ok
      err -> err
    end
  end

  @doc """
  If the backing index was removed out from under us (eg the search cluster was replaced),
  recreate it in the background so the store can recover.  The original result is always returned.
  """
  @spec handle_missing_index(term, struct) :: term
  def handle_missing_index({:error, msg} = err, store) when is_binary(msg) do
    if String.contains?(msg, "index_not_found_exception"),
      do: reinit_in_background(store)
    err
  end
  def handle_missing_index(result, _), do: result

  defp reinit_in_background(%{__struct__: mod} = store) do
    if @local_cache.put_new({:vector_reinit, mod}, true, ttl: @reinit_cooldown) do
      Task.Supervisor.start_child(Console.AI.TaskSupervisor, fn ->
        Logger.warning("vector store index not found, recreating it")
        case mod.init(store) do
          :ok -> :ok
          {:error, msg} = err when is_binary(msg) ->
            unless String.contains?(msg, "resource_already_exists_exception"),
              do: Logger.error("failed to recreate vector store index: #{inspect(err)}")
          err -> Logger.error("failed to recreate vector store index: #{inspect(err)}")
        end
      end)
    end
  end

  def vector_authz(_, v) when not is_integer(v) or v < 2, do: []
  def vector_authz(%User{roles: %{admin: true}}, _), do: []
  def vector_authz(%User{} = user, _) do
    user = Console.Services.Rbac.preload(user)
    [user_ids: [user.id], group_ids: group_ids(user)]
  end
  def vector_authz(_, _), do: []

  defp group_ids(%User{groups: [_ | _] = groups}), do: Enum.map(groups, & &1.id)
  defp group_ids(_), do: []
end
