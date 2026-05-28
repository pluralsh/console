defmodule ConsoleWeb.Plugs.GraphQLMultipartSpecTest do
  use ExUnit.Case, async: true
  use Plug.Test

  alias ConsoleWeb.Plugs.GraphQLMultipartSpec

  test "normalizes a single multipart operations object" do
    operations =
      Jason.encode!(%{
        query: "mutation Upload($runId: ID!, $session: Upload, $patch: Upload)",
        operationName: "Upload",
        variables: %{"runId" => "run-id", "session" => nil, "patch" => nil}
      })

    map = Jason.encode!(%{"0" => ["variables.session"], "1" => ["variables.patch"]})

    conn =
      :post
      |> conn("/gql")
      |> Map.put(:params, %{
        "operations" => operations,
        "map" => map,
        "0" => :session,
        "1" => :patch
      })
      |> GraphQLMultipartSpec.call([])

    assert conn.params["query"] ==
             "mutation Upload($runId: ID!, $session: Upload, $patch: Upload)"

    assert conn.params["operationName"] == "Upload"
    assert conn.params["variables"] == %{"runId" => "run-id", "session" => "0", "patch" => "1"}
    refute Map.has_key?(conn.params, "operations")
    refute Map.has_key?(conn.params, "map")
    assert conn.params["0"] == :session
    assert conn.params["1"] == :patch
  end

  test "does not change batched operations" do
    operations = Jason.encode!([%{query: "{ ping }", variables: %{}}])

    conn =
      :post
      |> conn("/gql")
      |> Map.put(:params, %{"operations" => operations, "0" => :upload})
      |> GraphQLMultipartSpec.call([])

    assert conn.params == %{"operations" => operations, "0" => :upload}
  end
end
