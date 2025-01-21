defmodule ConsoleWeb.GqlTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  @document """
    query {
      serviceDeployments(first: 5) {
        edges {
          node {
            id
          }
        }
      }
    }
  """

  describe "POST /gql" do
    test "It can process graphql documents", %{conn: conn} do
      user = admin_user()
      services = insert_list(3, :service)

      %{"data" => %{"serviceDeployments" => found}} =
        conn
        |> add_auth_headers(user)
        |> post("/gql", %{query: @document, variables: %{}})
        |> json_response(200)

      assert from_connection(found)
             |> ids_equal(services)
    end

    test "it can handle access tokens", %{conn: conn} do
      user = admin_user()
      token = insert(:access_token, user: user)
      services = insert_list(3, :service)

      %{"data" => %{"serviceDeployments" => found}} =
        conn
        |> add_auth_headers(token)
        |> post("/gql", %{query: @document, variables: %{}})
        |> json_response(200)

      assert from_connection(found)
             |> ids_equal(services)
    end

    test "it can correctly authorize bootstrap tokens", %{conn: conn} do
      user = insert(:user)
      token = insert(:bootstrap_token, user: user)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      expect(Console.Features, :available?, fn :cd -> true end)

      %{"data" => %{"createCluster" => result}} =
        conn
        |> add_auth_headers(token)
        |> post("/gql", %{query: """
        mutation Create($name: String!) {
          createCluster(attributes: {name: $name}) {
            id
            handle
            deployToken
            project { id }
          }
        }
        """, variables: %{"name" => "edge-1"}})
        |> json_response(200)

      assert result["project"]["id"] == token.project_id

      %{"errors" => [_ | _]} =
        conn
        |> add_auth_headers(token)
        |> post("/gql", %{query: """
        mutation Delete($id: ID!) {
          deleteCluster(id: $id) {
            id
          }
        }
        """, variables: %{"id" => result["id"]}})
        |> json_response(200)
    end
  end

  describe "POST /ext/gql" do
    test "it can serve deploy operator facing gql endpoints", %{conn: conn} do
      cluster = insert(:cluster)

      %{"data" => %{"clusterServices" => []}} =
        conn
        |> add_auth_headers(cluster)
        |> post("/ext/gql", %{query: "query { clusterServices { id } }", variables: %{}})
        |> json_response(200)
    end
  end
end
