defmodule Kube.Utils do
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Kazan.Apis.Apps.V1, as: AppsV1
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  @type error :: {:error, term}
  @type secret_resp :: {:ok, CoreV1.Secret.t} | error
  @type statefulset_resp :: {:ok, AppsV1.StatefulSet.t} | error

  @kubeconf :kubeconfig

  def raw_meta(%{"metadata" => meta}) do
    %MetaV1.ObjectMeta{
      name: meta["name"],
      namespace: meta["namespace"],
      labels: meta["labels"] || %{},
      annotations: meta["annotations"] || %{},
      creation_timestamp: meta["creationTimestamp"]
    }
  end
  def raw_meta(_), do: nil

  def identifier(%{"apiVersion" => gv, "kind" => k, "metadata" => %{"name" => n} = meta}) do
    {g, v} = group_version(gv)
    {g, v, k, Map.get(meta, "namespace"), n}
  end
  def identifier(%{api_version: gv, kind: k, metadata: %{name: n} = meta}) do
    {g, v} = group_version(gv)
    {g, v, k, Map.get(meta, :namespace), n}
  end

  def group_version(api_version) do
    case String.split(api_version, "/") do
      [g, v] -> {g, v}
      [v] -> {nil, v}
    end
  end

  def save_kubeconfig(val), do: Process.put(@kubeconf, val)
  def kubeconfig(), do: Process.get(@kubeconf)

  def run(query) do
    case kubeconfig() do
      %Kazan.Server{} = server -> Kazan.run(query, server: server)
      _ -> Kazan.run(query)
    end
  end

  @spec metadata(binary) :: MetaV1.ObjectMeta.t
  def metadata(name, other \\ %{}), do: struct(MetaV1.ObjectMeta, Map.merge(%{name: name}, other))

  @spec get_secret(binary, binary) :: secret_resp
  def get_secret(ns, name) do
    CoreV1.read_namespaced_secret!(ns, name)
    |> Kazan.run()
  end

  @spec delete_secret(binary, binary) :: secret_resp
  def delete_secret(ns, name) do
    %MetaV1.DeleteOptions{}
    |> CoreV1.delete_namespaced_secret!(ns, name)
    |> Kazan.run()
  end

  @spec copy_secret(binary, binary, binary) :: secret_resp
  def copy_secret(ns, name, new_name) do
    with {:ok, secret} <- get_secret(ns, name) do
      put_in(secret.metadata.name, new_name)
      |> clean()
      |> CoreV1.create_namespaced_secret!(ns)
      |> Kazan.run()
    end
  end

  @spec get_statefulset(binary, binary) :: statefulset_resp
  def get_statefulset(ns, name) do
    AppsV1.read_namespaced_stateful_set!(ns, name)
    |> Kazan.run()
  end

  def clean(%{metadata: metadata} = pg) do
    metadata = struct(MetaV1.ObjectMeta, Map.take(metadata, ~w(name namespace labels annotations)a))
    clear_status(%{pg | metadata: metadata})
  end

  defp clear_status(%{status: _} = obj), do: Map.put(obj, :status, nil)
  defp clear_status(obj), do: obj
end
