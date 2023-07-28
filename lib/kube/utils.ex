defmodule Kube.Utils do
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Kazan.Apis.Apps.V1, as: AppsV1
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  @type error :: {:error, term}
  @type secret_resp :: {:ok, CoreV1.Secret.t} | error
  @type statefulset_resp :: {:ok, AppsV1.StatefulSet.t} | error

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
