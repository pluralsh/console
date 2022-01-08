defmodule Console.Services.Plural do
  alias Console.Schema.{User, Manifest}
  alias Console.Services.{Builds}
  alias Console.Plural.{Repositories, Users, Recipe, Installation, OIDCProvider, Manifest, Context}

  def terraform_file(repository) do
    terraform_filename(repository)
    |> File.read()
  end

  def values_file(repository) do
    vals_filename(repository)
    |> File.read()
  end

  def update_configuration(repository, update, tool) do
    with {:ok, _} <- validate(update, tool),
         :ok <- File.write(filename(repository, tool), update),
      do: {:ok, update}
  end

  def update_smtp(smtp) do
    Console.Deployer.exec(fn storage ->
      with {:ok, _} <- storage.reset(),
           {:ok, context} <- Context.get(),
           {:ok, _} <- Context.write(%{context | smtp: smtp}),
           {:ok, _} <- storage.revise("update workspace smtp configuration"),
           {:ok, _} <- storage.push(),
        do: {:ok, smtp}
    end)
  end

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

  def configure_oidc(
    %Recipe{
      repository: %{name: name},
      oidcSettings: %{authMethod: method} = oidc_settings
    },
    context,
    true) do
    with {:ok, %{id: me}} <- Users.me(),
         {:ok, %{id: inst_id} = installation} <- Repositories.get_installation(name),
         {:ok, url} <- format_url(oidc_settings, context[name]),
         {:ok, _} <- Repositories.upsert_oidc_provider(inst_id, merge_provider(%{
           redirectUris: [url],
           authMethod: method,
           bindings: [%{userId: me}]
         }, installation)),
      do: :ok
  end
  def configure_oidc(_, _, _), do: :ok

  def format_url(%{uriFormat: uri} = oidc_settings, ctx) do
    with {:ok, manifest} <- Manifest.get() do
      uri = format_oidc(:domain, uri, oidc_settings, ctx)
      {:ok, format_oidc(:subdomain, uri, oidc_settings, manifest)}
    end
  end

  defp format_oidc(:domain, uri, %{domainKey: key}, ctx) when is_binary(key),
    do: String.replace(uri, "{domain}", get_in(ctx, [key]))
  defp format_oidc(:subdomain, uri, %{subdomain: true}, %Manifest{network: %Manifest.Network{subdomain: sub}}),
    do: String.replace(uri, "{subdomain}", sub)
  defp format_oidc(_, uri, _, _), do: uri

  def oidc_dependencies([recipe | rest], context, true) do
    case configure_oidc(recipe, context, true) do
      :ok -> oidc_dependencies(rest, context, true)
      err -> err
    end
  end
  def oidc_dependencies(_, _, _), do: :ok

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

  def cluster_name() do
    case Manifest.get() do
      {:ok, %Manifest{cluster: cluster}} -> cluster
      _ -> ""
    end
  end

  def project_manifest(), do: Manifest.get()

  def filename(repo, :helm), do: vals_filename(repo)
  def filename(repo, :terraform), do: terraform_filename(repo)

  def validate(str, :helm), do: YamlElixir.read_from_string(str)
  def validate(_, _), do: {:ok, nil}

  defp vals_filename(repository) do
    Path.join([Console.workspace(), repository, "helm", repository, "values.yaml"])
  end

  defp terraform_filename(repository) do
    Path.join([Console.workspace(), repository, "terraform", "main.tf"])
  end
end
