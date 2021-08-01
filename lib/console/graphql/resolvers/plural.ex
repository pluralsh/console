defmodule Console.GraphQl.Resolvers.Plural do
  use Nebulex.Caching
  alias Console.Plural.{Repositories, ExternalToken}
  alias Console.Plural.{Connection, PageInfo}
  alias Console.Services.Plural
  alias Kube.Client

  @ttl :timer.hours(24)

  @decorate cacheable(cache: Console.Cache, key: :external_token, opts: [ttl: @ttl])
  def resolve_external_token(_, _),
    do: ExternalToken.fetch()

  def list_installations(args, _) do
    Repositories.list_installations(args[:first], args[:after])
    |> clean_up_connection()
  end

  def search_repositories(%{query: query}, _) do
    Repositories.search_repositories(query)
    |> clean_up_connection()
  end

  def list_recipes(args, _) do
    Repositories.list_recipes(args[:id], args[:cursor])
    |> clean_up_connection()
  end

  def get_recipe(%{id: id}, _) do
    with {:ok, recipe} <- Repositories.get_recipe(id) do
      sections = Enum.map(recipe.recipeSections, fn section ->
        Map.put(section, :recipe_items, section.recipeItems)
      end)
      {:ok, Map.put(recipe, :recipe_sections, sections)}
    end
  end

  def list_applications(_, _) do
    with {:ok, %{items: items}} <- Client.list_applications(),
      do: {:ok, items}
  end

  def resolve_application(%{name: name}, _), do: Client.get_application(name)

  def resolve_context(_, _) do
    with {:ok, %{configuration: conf}} <- Console.Plural.Context.get() do
      confs = Enum.map(conf, fn {k, map} -> %{repository: k, context: map} end)
      {:ok, confs}
    end
  end

  def install_recipe(%{id: id, context: context}, %{context: %{current_user: user}}) do
    Plural.install_recipe(id, context, user)
  end

  def resolve_configuration(%{metadata: %{name: name}}, first, second),
    do: resolve_configuration(%{name: name}, first, second)
  def resolve_configuration(%{name: name}, _, _) do
    {:ok, %{
      helm: Plural.values_file(name) |> extract_content(),
      terraform: Plural.terraform_file(name) |> extract_content()
    }}
  end

  defp extract_content({:ok, content}), do: content
  defp extract_content(_), do: nil

  def update_configuration(%{repository: repo, content: content} = args, _) do
    tool = args[:tool] || :helm
    with {:ok, conf} <- Console.Deployer.update(repo, content, tool) do
      {:ok, %{configuration: %{tool => conf}}}
    end
  end

  defp clean_up_connection({:ok, %Connection{pageInfo: page_info, edges: edges}}) do
    {:ok, %{page_info: clean_up_page_info(page_info), edges: edges}}
  end

  defp clean_up_page_info(%PageInfo{endCursor: end_c, hasNextPage: has_next}),
    do: %{end_cursor: end_c, has_next_page: has_next}
end
