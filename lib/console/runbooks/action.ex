defprotocol Console.Runbooks.Action do
  @spec enact(struct, Console.Runbooks.Actor.t) :: {:ok | :error, any}
  def enact(action, struct)
end

defmodule Console.Runbooks.Actor do
  alias Console.Runbooks.Action, as: ActionImpl
  alias Kube.Runbook.{Action, ConfigurationAction}

  defstruct [:ctx, :repo, :actor]

  @type t :: %__MODULE__{}

  def build(repo, ctx, actor), do: %__MODULE__{ctx: ctx, repo: repo, actor: actor}

  def enact(%Action{configuration: %ConfigurationAction{} = act}, actor) do
    ActionImpl.enact(act, actor)
  end
end


defimpl Console.Runbooks.Action, for: Kube.Runbook.ConfigurationAction do
  alias Console.Services.Plural
  alias Console.Runbooks.Actor
  alias Kube.{Runbook, StatefulSetResize}

  def enact(%{updates: updates, stateful_sets: ss}, %Actor{ctx: ctx, repo: repo, actor: actor}) do
    with {:ok, vals} <- Plural.values_file(repo),
         {:ok, map} <- YamlElixir.read_from_string(vals),
         map <- make_updates(updates, map, ctx),
         {:ok, doc} <- Ymlr.document(map),
         :ok <- maybe_resize(ss, repo, ctx),
         {:ok, _, build} <- Console.Deployer.update(repo, String.trim_leading(doc, "---\n"), :helm, nil, actor),
      do: {:ok, build}
  end

  defp make_updates(updates, values, map) do
    Enum.reduce(updates, values, fn %Runbook.PathUpdate{path: path, value_from: from}, acc ->
      case map[from] do
        nil -> acc
        val -> Console.put_path(acc, path, val)
      end
    end)
  end

  defp maybe_resize([statefulset | rest], repo, ctx) do
    resize = %StatefulSetResize{
      spec: %StatefulSetResize.Spec{
        name: statefulset.name,
        persistent_volume: statefulset.persistent_volume,
        size: ctx[statefulset.value_from]
      }
    }

    namespace = Console.namespace(repo)
    name = "resize-#{statefulset.name}-#{statefulset.persistent_volume}"

    with {:val, val} when not is_nil(val) <- {:val, ctx[statefulset.value_from]},
         {:ok, _} <- Kube.Client.create_statefulset_resize(namespace, name, resize),
         :ok <- poll_resize(namespace, name) do
      maybe_resize(rest, repo, ctx)
    else
      {:val, _} -> {:error, "#{statefulset.value_from} not set"}
      error -> error
    end
  end
  defp maybe_resize(_, _, _), do: :ok

  defp poll_resize(namespace, name, attempts \\ 0)
  defp poll_resize(_, _, attempts) when attempts >= 3,
    do: {:error, "statefulset resize in hung state"}

  defp poll_resize(namespace, name, attempts) do
    case Kube.Client.get_statefulset_resize(namespace, name) do
      {:ok, _} ->
        :timer.sleep(300)
        poll_resize(namespace, name, attempts + 1)
      _ -> :ok
    end
  end
end
