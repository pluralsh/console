defmodule Console.GraphQl.PluralQueriesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Plural.Queries
  alias Kube.{Application, ApplicationList}

  describe "installations" do
    test "It will fetch your installations from Plural" do
      body = Jason.encode!(%{
        query: Queries.installation_query(),
        variables: %{first: 5}
      })
      installations = [%{id: "id", repository: %{id: "id2", name: "repo", description: "desc"}}]

      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{installations: as_connection(installations)}})}}
      end)

      {:ok, %{data: %{"installations" => %{"pageInfo" => page_info, "edges" => [edge]}}}} = run_query("""
        query {
          installations(first: 5) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id
                repository { id name description }
              }
            }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert page_info["hasNextPage"]
      assert page_info["endCursor"] == "something"

      assert edge["node"]["id"] == "id"
      assert edge["node"]["repository"]["id"] == "id2"
      assert edge["node"]["repository"]["name"] == "repo"
      assert edge["node"]["repository"]["description"] == "desc"
    end
  end

  describe "repositories" do
    test "it can search repositories" do
      body = Jason.encode!(%{
        query: Queries.search_repositories_query(),
        variables: %{query: "query"}
      })

      repositories = [%{id: "id", name: "repo", description: "a repository"}]
      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{searchRepositories: as_connection(repositories)}})}}
      end)

      {:ok, %{data: %{"repositories" => %{"pageInfo" => page_info, "edges" => [edge]}}}} = run_query("""
        query Repositories($query: String!) {
          repositories(query: $query, first: 20) {
            pageInfo { hasNextPage endCursor }
            edges {
              node { id name description }
            }
          }
        }
      """, %{"query" => "query"}, %{current_user: insert(:user)})

      assert page_info["hasNextPage"]
      assert page_info["endCursor"] == "something"

      assert edge["node"]["id"] == "id"
      assert edge["node"]["name"] == "repo"
      assert edge["node"]["description"] == "a repository"
    end
  end

  describe "recipes" do
    test "it can list recipes for a repo" do
      body = Jason.encode!(%{
        query: Queries.list_recipes_query(),
        variables: %{id: "id"}
      })

      recipes = [%{id: "id", name: "recipe", description: "a recipe"}]
      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{recipes: as_connection(recipes)}})}}
      end)

      {:ok, %{data: %{"recipes" => %{"pageInfo" => page_info, "edges" => [edge]}}}} = run_query("""
        query Recipes($id: ID!) {
          recipes(id: $id, first: 20) {
            pageInfo { hasNextPage endCursor }
            edges {
              node { id name description }
            }
          }
        }
      """, %{"id" => "id"}, %{current_user: insert(:user)})

      assert page_info["hasNextPage"]
      assert page_info["endCursor"] == "something"

      assert edge["node"]["id"] == "id"
      assert edge["node"]["name"] == "recipe"
      assert edge["node"]["description"] == "a recipe"
    end
  end

  describe "recipe" do
    test "it can get a recipe by id" do
      body = Jason.encode!(%{
        query: Queries.get_recipe_query(),
        variables: %{id: "id"}
      })

      recipe = %{
        id: "id",
        name: "name",
        description: "description",
        recipeSections: [
          %{
            id: "id2",
            repository: %{id: "id3"},
            recipeItems: [
              %{
                id: "id4",
                configuration: [%{name: "name", documentation: "some documentation", type: "STRING"}]
              }
            ]
          }
        ]
      }

      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{recipe: recipe}})}}
      end)

      {:ok, %{data: %{"recipe" => found}}} = run_query("""
        query Recipe($id: ID!) {
          recipe(id: $id) {
            id
            name
            description
            recipeSections {
              id
              repository { id }
              recipeItems {
                id
                configuration { name documentation type }
              }
            }
          }
        }
      """, %{"id" => "id"}, %{current_user: insert(:user)})

      assert found["id"] == "id"
      assert found["name"] == "name"
      assert found["description"] == "description"

      [section] = found["recipeSections"]
      assert section["id"] == "id2"
      assert section["repository"]["id"] == "id3"

      [item] = section["recipeItems"]

      assert item["id"] == "id4"
      assert hd(item["configuration"])["name"] == "name"
      assert hd(item["configuration"])["documentation"] == "some documentation"
      assert hd(item["configuration"])["type"] == "STRING"
    end
  end

  describe "applications" do
    test "it can fetch all applications" do
      expect(Kazan, :run, fn _ ->
        {:ok, %ApplicationList{items: [application("app")]}}
      end)

      {:ok, %{data: %{"applications" => [app]}}} = run_query("""
        query {
          applications {
            name
            spec { descriptor { type } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert app["name"] == "app"
      assert app["spec"]["descriptor"]["type"] == "app"
    end
  end

  describe "application" do
    test "it can fetch an application by name" do
      expect(Kazan, :run, fn _ -> {:ok, application("app")} end)

      {:ok, %{data: %{"application" => app}}} = run_query("""
        query App($name: String!) {
          application(name: $name) {
            name
            spec { descriptor { type } }
          }
        }
      """, %{"name" => "app"}, %{current_user: insert(:user)})

      assert app["name"] == "app"
      assert app["spec"]["descriptor"]["type"] == "app"
    end
  end

  defp as_connection(nodes) do
    %{
      pageInfo: %{hasNextPage: true, endCursor: "something"},
      edges: Enum.map(nodes, & %{node: &1})
    }
  end

  defp application(name) do
    %Application{
      metadata: %{
        name: name
      },
      spec: %Application.Spec{
        descriptor: %Application.Descriptor{
          type: name
        }
      }
    }
  end
end
