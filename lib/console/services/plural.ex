defmodule Console.Services.Plural do
  use Console.Services.Base
  alias Console.Schema.{Manifest}
  alias Console.Utils
  alias Console.Plural.{Manifest, Accounts}
  alias Kube.Application
  use Nebulex.Caching

  @type error :: {:error, term}
  @type bin_resp :: {:ok, binary} | error
  @type tool :: :helm | :terraform

  @ttl :timer.hours(1)

  @decorate cacheable(cache: Console.Cache, key: {:app, name}, opts: [ttl: @ttl], match: &allow/1)
  def application(name) do
    Kube.Client.get_application(name)
  end

  def ai(prompt), do: Accounts.ai(prompt)

  def app_icon(%Application{spec: %Application.Spec{descriptor: %{icons: [%{src: src} | _]}}}),
    do: src
  def app_icon(_), do: nil

  defp allow({:ok, _}), do: true
  defp allow(_), do: false


  @doc """
  Gets the current cluster name
  """
  @spec cluster_name() :: binary
  def cluster_name() do
    case Manifest.get() do
      {:ok, %Manifest{cluster: cluster}} -> cluster
      _ -> ""
    end
  end

  @doc """
  Fetches the current project manifest file
  """
  @spec project_manifest() :: Manifest.t
  def project_manifest(), do: Manifest.get()

  @doc """
  Gets the full filename for `tool`
  """
  @spec filename(binary, tool) :: binary
  def filename(repo, :helm), do: vals_filename(repo)
  def filename(repo, :terraform), do: terraform_filename(repo)

  @doc """
  Performs a sequence of path updates for the helm values.yaml file for `repository`
  """
  @spec merge_config(binary, [%{path: binary, value: binary, type: atom}]) :: bin_resp
  def merge_config(repository, paths) do
    with {:ok, vals} <- File.read(filename(repository, :helm)),
         {:ok, map} <- YamlElixir.read_from_string(vals),
         {:ok, map} <- make_updates(map, paths),
         {:ok, doc} <- Utils.Yaml.format(map),
      do: update_configuration(repository, doc, :helm)
  end

  defp make_updates(map, paths) do
    Enum.reduce_while(paths, {:ok, map}, fn %{path: p, value: v, type: t}, {:ok, map} ->
      case Utils.Path.update(map, p, {v, t}) do
        {:ok, map} -> {:cont, {:ok, map}}
        err -> {:halt, err}
      end
    end)
  end


  @doc """
  Updates either the main.tf or values.yaml file for `repository`, depending on the value of `tool`
  """
  @spec update_configuration(binary, binary, tool) :: bin_resp
  def update_configuration(repository, update, tool) do
    with {:ok, _} <- validate(update, tool),
         :ok <- File.write(filename(repository, tool), update),
      do: {:ok, update}
  end

  defp validate(str, :helm), do: YamlElixir.read_from_string(str)
  defp validate(_, _), do: {:ok, nil}

  defp vals_filename(repository) do
    Path.join([Console.workspace(), repository, "helm", repository, "values.yaml"])
  end

  defp terraform_filename(repository) do
    Path.join([Console.workspace(), repository, "terraform", "main.tf"])
  end
end
