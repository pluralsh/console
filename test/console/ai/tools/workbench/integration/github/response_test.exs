defmodule Console.AI.Tools.Workbench.Integration.Github.ResponseTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.Integration.Github.{Query, Response}

  describe "json/1" do
    test "merges multi-page Tentacat search bodies before encoding" do
      page1 = %{"incomplete_results" => false, "items" => [%{"id" => 1}], "total_count" => 2}
      page2 = %{"incomplete_results" => false, "items" => [%{"id" => 2}], "total_count" => 2}
      fake = %HTTPoison.Response{}

      assert {:ok, json} =
               Response.json({200, [{200, page1, fake}, {200, page2, fake}], fake})

      assert Jason.decode!(json) == %{
               "incomplete_results" => false,
               "items" => [%{"id" => 1}, %{"id" => 2}]
             }
    end

    test "encodes a normal single-page Tentacat body" do
      body = %{"incomplete_results" => false, "items" => [%{"id" => 1}]}
      fake = %HTTPoison.Response{}

      assert {:ok, json} = Response.json({200, body, fake})
      assert Jason.decode!(json) == body
    end

    test "includes manual pagination metadata" do
      body = [%{"id" => 1}]
      next = "https://api.github.com/repos/pluralsh/console/pulls?page=2&per_page=30"
      fake = %HTTPoison.Response{headers: [{"Link", "<#{next}>; rel=\"next\""}]}

      assert {:ok, json} = Response.json({{200, body, fake}, next, nil})

      assert Jason.decode!(json) == %{
               "items" => [%{"id" => 1}],
               "pagination" => %{
                 "has_next_page" => true,
                 "link" => "<#{next}>; rel=\"next\"",
                 "next_page" => "2",
                 "next_url" => next,
                 "per_page" => "30"
               }
             }
    end

    test "bubbles Tentacat transport failures as tool errors" do
      error = %HTTPoison.Error{
        reason: {:tls_alert, {:unknown_ca, ~c"TLS client: certificate verify failed"}}
      }

      assert {:error, message} = Response.json({:error, error})
      assert message =~ "GitHub request failed: TLS unknown_ca:"
      assert message =~ "certificate verify failed"
      refute message =~ "%HTTPoison.Error"
    end
  end

  describe "github query helpers" do
    test "encodes query params with reserved branch characters" do
      assert Query.qp(%{"head" => "pluralsh:agent/prod-4949-grafana-db-storage-1781106200000"}) ==
               "?head=pluralsh%3Aagent%2Fprod-4949-grafana-db-storage-1781106200000"
    end

    test "adds bounded pagination defaults" do
      assert Query.paginated(%{}) == %{page: 1, per_page: 30}
      assert Query.paginated(%{page: 3, per_page: 5}) == %{page: 3, per_page: 5}
    end

    test "normalizes bare pull request head branches to the current owner" do
      assert Query.normalize_head(%{owner: "pluralsh", head: "feature/foo"}) ==
               "pluralsh:feature/foo"

      assert Query.normalize_head(%{owner: "pluralsh", head: "fork:feature/foo"}) ==
               "fork:feature/foo"

      assert Query.normalize_head(%{owner: "pluralsh", head: " "}) == nil
    end
  end
end
