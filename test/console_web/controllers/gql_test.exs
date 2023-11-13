defmodule ConsoleWeb.GqlTest do
  use ConsoleWeb.ConnCase, async: true

  @document """
    query {
      builds(first: 5) {
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
      user = insert(:user)
      builds = insert_list(3, :build)

      %{"data" => %{"builds" => found}} =
        conn
        |> add_auth_headers(user)
        |> post("/gql", %{query: @document, variables: %{}})
        |> json_response(200)

      assert from_connection(found)
             |> ids_equal(builds)
    end

    test "it can handle access tokens", %{conn: conn} do
      user = insert(:user)
      token = insert(:access_token, user: user)
      builds = insert_list(3, :build)

      %{"data" => %{"builds" => found}} =
        conn
        |> add_auth_headers(token)
        |> post("/gql", %{query: @document, variables: %{}})
        |> json_response(200)

      assert from_connection(found)
             |> ids_equal(builds)
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
