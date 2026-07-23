defmodule Console.AI.Tools.Workbench.Integration.Docker.Client do
  @moduledoc false

  alias Console.OCI.{Auth, Client}
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.DockerConnection}

  @default_registry "registry-1.docker.io"

  def build(%WorkbenchTool{configuration: %Configuration{docker: %DockerConnection{} = docker}}, repository_slug)
      when is_binary(repository_slug) do
    docker.url
    |> repository_url(repository_slug)
    |> Client.new(proxy(docker))
    |> Auth.authenticate(docker.provider, docker.auth)
  end

  def build(%WorkbenchTool{}, _),
    do: {:error, "Docker/OCI registry connection is not configured for this workbench tool."}

  def normalize(%_{} = struct) do
    struct
    |> Map.from_struct()
    |> normalize()
  end

  def normalize(map) when is_map(map) do
    Map.new(map, fn {key, value} -> {key, normalize(value)} end)
  end

  def normalize(list) when is_list(list), do: Enum.map(list, &normalize/1)
  def normalize(value), do: value

  defp repository_url(url, repository_slug) do
    registry = registry(url)
    slug = repository_slug |> String.trim() |> String.trim_leading("/")
    "#{registry}/#{slug}"
  end

  defp registry(url) when url in [nil, ""], do: @default_registry

  defp registry("oci://" <> url), do: registry(url)

  defp registry(url) when is_binary(url) do
    url
    |> String.trim()
    |> String.trim_trailing("/")
    |> URI.parse()
    |> case do
      %URI{scheme: scheme, host: host, path: path} when scheme in ["http", "https"] and is_binary(host) ->
        host <> (path || "")

      %URI{path: path} ->
        path
    end
    |> String.trim_leading("/")
    |> String.trim_trailing("/")
  end

  defp proxy(%DockerConnection{auth: %{proxy: proxy}}), do: proxy
  defp proxy(_), do: nil
end
