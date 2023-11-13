defmodule Console.Deployments.AddOns do
  use Console.Services.Base
  use Nebulex.Caching
  alias Console.Schema.User
  alias Console.Deployments.Git
  alias Console.Deployments.{AddOn, Services, Global}

  @local_adapter Console.conf(:local_cache)
  @ttl :timer.minutes(30)

  @doc """
  Lists add-ons defined in the current scaffolds repo
  """
  @spec addons() :: {:ok, [AddOn.t]} | Console.error
  @decorate cacheable(cache: @local_adapter, key: :addons, opts: [ttl: @ttl])
  def addons() do
    artifacts = Git.artifacts_repo!()
    with {:ok, f} <- Git.Discovery.addons(artifacts),
         {:ok, contents} <- tar_stream(f),
      do: {:ok, parse_addons(contents)}
  end

  @doc """
  Installs an addon, and maybe provisions a global service for the addon
  """
  @spec install(map, binary, User.t) :: Services.service_resp
  def install(%{name: name, configuration: config} = attrs, cluster_id, %User{} = user) do
    artifacts = Git.artifacts_repo!()

    with {:ok, addons} <- addons(),
         %AddOn{} = addon <- Enum.find(addons, & &1.name == name) do
      start_transaction()
      |> add_operation(:svc, fn _ ->
        Services.create_service(%{
          name: addon.name,
          namespace: addon.name,
          version: addon.version || "0.1.0",
          repository_id: artifacts.id,
          git: %{ref: "main", folder: "addons/#{name}"},
          configuration: config
        }, cluster_id, user)
      end)
      |> add_operation(:global, fn %{svc: service} ->
        case attrs do
          %{global: attrs} -> Global.create(Map.put_new(attrs, :name, addon.name), service.id, user)
          _ -> {:ok, service}
        end
      end)
      |> execute(extract: :svc)
    else
      nil -> {:error, "no addon #{name} found"}
      err -> err
    end
  end

  defp parse_addons(contents) do
    Enum.map(contents, fn {_, value} ->
      with {:ok, yaml} <- YamlElixir.read_from_string(value),
           {:ok, addon} <- Poison.decode(Jason.encode!(yaml), as: AddOn.spec()) do
        addon
      else
        _ -> nil
      end
    end)
    |> Enum.filter(& &1)
  end

  @doc """
  Streams a tar from an open file and returns a list of file names/contents
  """
  @spec tar_stream(File.t) :: {:ok, [{binary, binary}]} | Console.error()
  def tar_stream(tar_file) do
    try do
      with {:ok, tmp} <- Briefly.create(),
            _ <- IO.binstream(tar_file, 1024) |> Enum.into(File.stream!(tmp)),
           {:ok, res} <- :erl_tar.extract(tmp, [:compressed, :memory]),
        do: {:ok, Enum.map(res, fn {name, content} -> {to_string(name), to_string(content)} end)}
    after
      File.close(tar_file)
    end
  end
end
