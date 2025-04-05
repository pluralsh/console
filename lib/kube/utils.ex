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
      uid: meta["uid"],
      namespace: meta["namespace"],
      labels: meta["labels"] || %{},
      annotations: meta["annotations"] || %{},
      creation_timestamp: meta["creationTimestamp"]
    }
  end
  def raw_meta(_), do: nil

  def ns(%{"metadata" => meta}), do: meta["namespace"]
  def ns(%{metadata: %MetaV1.ObjectMeta{namespace: ns}}), do: ns
  def ns(%{namespace: ns}), do: ns

  def identifier(%{"apiVersion" => gv, "kind" => k, "metadata" => %{"name" => n} = meta}) do
    {g, v} = group_version(gv)
    {g, v, k, Map.get(meta, "namespace"), n}
  end
  def identifier(%{api_version: gv, kind: k, metadata: %{name: n} = meta}) do
    {g, v} = group_version(gv)
    {g, v, k, Map.get(meta, :namespace), n}
  end
  def identifier(%{group: g, version: v, kind: k, name: n} = blob),
    do: {g, v, k, Map.get(blob, :namespace), n}

  def fetch(spec) do
    identifier(spec)
    |> for_identifier()
  end

  def for_identifier({g, v, k, ns, n}) do
    Kube.Client.Base.path(g, v, k, ns, n)
    |> Kube.Client.raw()
  end

  def parent(%{"metadata" => %{"ownerReferences" => [_ | _] = owners}}, ns) do
    with %{} = ref <- Enum.find(owners, & &1["controller"]),
         {g, v} <- group_version(ref["apiVersion"]),
         {:ok, res} <- for_identifier({g, v, ref["kind"], ns, ref["name"]}) do
      res
    else
      _ -> nil
    end
  end

  def parent(%{metadata: %MetaV1.ObjectMeta{owner_references: [_ | _] = owners}}, ns) do
    with %MetaV1.OwnerReference{api_version: vsn, kind: k, name: n} <- Enum.find(owners, & &1.controller),
         {g, v} <- group_version(vsn),
         {:ok, res} <- for_identifier({g, v, k, ns, n}) do
      res
    else
      _ -> nil
    end
  end

  def parent(_, _), do: nil

  def api_version(nil, v), do: v
  def api_version(g, v), do: "#{g}/#{v}"

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

  @spec create_secret(binary, binary, %{binary => binary}) :: secret_resp
  def create_secret(ns, name, data) do
    %CoreV1.Secret{
      metadata: %MetaV1.ObjectMeta{namespace: ns, name: name},
      data: Map.new(data, fn {k, v} -> {k, Base.encode64(v)} end)
    }
    |> CoreV1.create_namespaced_secret!(ns)
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

  @doc """
  This is the same inflect logic kubernetes client-go uses
  """
  @spec inflect(binary) :: binary
  def inflect(kind) do
    kind = String.downcase(kind)
    cond do
      String.ends_with?(kind, "endpoints") -> kind
      String.ends_with?(kind, "s") -> "#{kind}es"
      String.ends_with?(kind, "y") -> "#{String.trim_trailing(kind, "y")}ies"
      true -> "#{kind}s"
    end
  end

  def clean(%{metadata: metadata} = pg) do
    metadata = struct(MetaV1.ObjectMeta, Map.take(metadata, ~w(name namespace labels annotations)a))
    clear_status(%{pg | metadata: metadata})
  end

  defp clear_status(%{status: _} = obj), do: Map.put(obj, :status, nil)
  defp clear_status(obj), do: obj
end
