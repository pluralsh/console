defmodule Console.AI.Tools.Workbench.Integration.Github.ResponseTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.Integration.Github.Response

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
  end
end
