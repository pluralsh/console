defmodule Console.GraphQl.RunbookQueriesTest do
  use Console.DataCase, async: false
  use Mimic
  import KubernetesScaffolds

  setup :set_mimic_global

  describe "runbooks" do
    test "it can fetch a list of runbooks" do
      user = insert(:user)

      expect(Kazan, :run, fn _ -> {:ok, %{items: [runbook("runbook")]}} end)

      {:ok, %{data: %{"runbooks" => [book]}}} = run_query("""
        query Runbooks($namespace: String!) {
          runbooks(namespace: $namespace) {
            name
            spec { name }
          }
        }
      """, %{"namespace" => "runbook"}, %{current_user: user})

      assert book["name"] == "runbook"
      assert book["spec"]["name"] == "runbook"
    end
  end

  describe "runbook" do
    test "it can fetch a runbook and its datasources" do
      runbook = runbook("runbook", [
        runbook_datasource(:prometheus, "prometheus"),
      ])

      expect(Kazan, :run, fn _ -> {:ok, runbook} end)

      expect(HTTPoison, :post, fn _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{values: [[1, "1"]]}
        ]}})}}
      end)

      {:ok, %{data: %{"runbook" => found}}} = run_query("""
        query Runbook($name: String!, $namespace: String!) {
          runbook(name: $name, namespace: $namespace) {
            name
            data {
              name
              prometheus { values { timestamp value } }
            }
          }
        }
      """, %{"name" => "name", "namespace" => "name"}, %{current_user: insert(:user)})

      assert found["name"] == "runbook"

      [result] = found["data"]

      assert result["name"] == "prometheus"
      [%{"values" => [value]}] = result["prometheus"]

      assert value["value"] == "1"
    end
  end
end
