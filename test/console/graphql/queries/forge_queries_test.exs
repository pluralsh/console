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

      expect(Mojito, :post, fn _, _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{installations: as_connection(installations)}})}}
      end)

      {:ok, %{data: %{"installations" => %{"pageInfo" => page_info, "edges" => [edge]}}}} = run_query("""
        query {
          installations(first: 5) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                repository {
                  id
                  name
                  description
                }
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
