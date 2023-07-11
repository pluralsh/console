defmodule Console.Services.Plural do
  use Console.Services.Base
  alias Console.Deployer
  alias Console.Schema.{User, Manifest}
  alias Console.Utils
  alias Console.Services.{Builds}
  alias Console.Plural.{Repositories, Users, Recipe, Installation, OIDCProvider, Manifest, Context, Accounts}
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

  @doc "fetch the contents of the main.tf file of `repository`"
  @spec terraform_file(binary) :: bin_resp
  def terraform_file(repository) do
    terraform_filename(repository)
    |> Deployer.file()
  end

  @doc "fetches the contents of the helm values.yaml file for `repository`"
  @spec values_file(binary) :: bin_resp
  def values_file(repository) do
    vals_filename(repository)
    |> Deployer.file()
  end

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

  @doc """
  Updates global smtp configuration
  """
  @spec update_smtp(map) :: {:ok, map} | error
  def update_smtp(smtp) do
    with {:ok, context} <- Context.get() do
      Console.Deployer.exec(fn storage ->
        with {:ok, _} <- Context.write(%{context | smtp: smtp}),
             {:ok, _} <- storage.revise("update workspace smtp configuration"),
             {:ok, _} <- storage.push(),
          do: {:ok, smtp}
      end)
    end
  end

  @doc """
  Calls plural api to install a recipe, enable oidc if relevant, and trigger a build to deploy it
  """
  @spec install_recipe(binary, map, boolean, User.t) :: Builds.build_resp
  def install_recipe(id, context, oidc, %User{} = user) do
    with {:ok, recipe} <- Repositories.get_recipe(id),
         {:ok, _} <- Repositories.install_recipe(id),
         :ok <- configure_oidc(recipe, context, oidc),
         :ok <- oidc_dependencies(recipe.recipeDependencies, context, oidc) do
      Builds.create(%{
        type: :install,
        repository: recipe.repository.name,
        message: "Installed bundle #{recipe.name} for repository #{recipe.repository.name}",
        context: %{
          configuration: context,
          bundle: %{repository: recipe.repository.name, name: recipe.name},
        },
      }, user)
    end
  end

  @doc """
  Similar to #install_recipe/4, except does the same process for the stack with `name`
  """
  @spec install_stack(binary, %{configuration: map}, boolean, User.t) :: Builds.build_resp
  def install_stack(name, %{configuration: ctx} = context, oidc, %User{} = user) do
    with {:ok, [recipe | _] = recipes} <- Repositories.install_stack(name),
         {:ok, _} <- oidc_for_stack(recipes, ctx, oidc) do
      repos = Enum.map(recipes, & &1.repository.name)
      Builds.create(%{
        type: :install,
        repository: recipe.repository.name,
        message: "Installed stack #{name} with repositories #{Enum.join(repos, ", ")}",
        context: %{
          configuration: ctx,
          domains: Map.get(context, :domains, []),
          buckets: Map.get(context, :buckets, []),
          bundles: Enum.map(recipes, & %{name: &1.name, repository: &1.repository.name}),
        },
      }, user)
    end
  end

  defp oidc_for_stack([_ | _] = recipes, context, oidc) do
    Enum.reduce(recipes, short_circuit(), fn recipe, circuit ->
      short(circuit, recipe.id, fn ->
        with :ok <- configure_oidc(recipe, context, oidc),
          do: oidc_dependencies(recipe.recipeDependencies, context, oidc)
      end)
    end)
    |> execute()
  end

  defp configure_oidc(
    %Recipe{
      repository: %{name: name},
      oidcSettings: %{authMethod: method} = oidc_settings
    },
    context,
    true) do
    with {:ok, %{id: me}} <- Users.me(),
         {:ok, %{id: inst_id} = installation} <- Repositories.get_installation(name),
         {:ok, manifest} <- Manifest.get(),
         {:ok, _} <- Repositories.upsert_oidc_provider(inst_id, merge_provider(%{
           redirectUris: format_urls(oidc_settings, context[name], manifest),
           authMethod: method,
           bindings: [%{userId: me}]
         }, installation)),
      do: :ok
  end
  defp configure_oidc(_, _, _), do: :ok

  defp format_urls(%{uriFormats: [_ | _] = uris} = settings, ctx, man),
    do: Enum.map(uris, &format_url(&1, settings, ctx, man))
  defp format_urls(%{uriFormat: uri} = settings, ctx, man),
    do: [format_url(uri, settings, ctx, man)]

  defp format_url(uri, oidc_settings, ctx, manifest) do
    uri = format_oidc(:domain, uri, oidc_settings, ctx)
    format_oidc(:subdomain, uri, oidc_settings, manifest)
  end

  defp format_oidc(:domain, uri, %{domainKey: key}, ctx) when is_binary(key),
    do: String.replace(uri, "{domain}", get_in(ctx, [key]))
  defp format_oidc(:subdomain, uri, %{subdomain: true}, %Manifest{network: %Manifest.Network{subdomain: sub}}),
    do: String.replace(uri, "{subdomain}", sub)
  defp format_oidc(_, uri, _, _), do: uri

  defp oidc_dependencies([recipe | rest], context, true) do
    case configure_oidc(recipe, context, true) do
      :ok -> oidc_dependencies(rest, context, true)
      err -> err
    end
  end
  defp oidc_dependencies(_, _, _), do: :ok

  defp merge_provider(attrs, %Installation{oidcProvider: %OIDCProvider{redirectUris: uris, bindings: bindings}}) do
    bindings = Enum.map(bindings, fn
      %{user: %{id: id}} -> %{userId: id}
      %{group: %{id: id}} -> %{groupId: id}
    end)

    attrs
    |> Map.put(:redirectUris, Enum.uniq(attrs.redirectUris ++ uris))
    |> Map.put(:bindings, Enum.uniq(bindings ++ attrs.bindings))
  end
  defp merge_provider(attrs, _), do: attrs


  defp validate(str, :helm), do: YamlElixir.read_from_string(str)
  defp validate(_, _), do: {:ok, nil}

  defp vals_filename(repository) do
    Path.join([Console.workspace(), repository, "helm", repository, "values.yaml"])
  end

  defp terraform_filename(repository) do
    Path.join([Console.workspace(), repository, "terraform", "main.tf"])
  end
end
