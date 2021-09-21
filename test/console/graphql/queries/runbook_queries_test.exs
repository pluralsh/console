defmodule Console.GraphQl.RunbookQueriesTest do
  use Console.DataCase, async: false
  use Mimic
  import KubernetesScaffolds

  setup :set_mimic_global

  @displayxml ~s(
  <root>
    <box pad="small" gap="small">
      <box direction="row" gap="small" align="center">
        <text size="small">Graph of your current cpu usage, you should set a reservation to
          roughly correspond to 60% utilization</text>
        <timeseries datasource="cpu" label="CPU Usage" />
      </box>
      <box direction="row" gap="small" align="center">
        <text size="small">Graph of your current memory usage, you should set a reservation to
          roughly correspond to 80% utilization</text>
        <timeseries datasource="memory" label="Memory Usage" />
      </box>
      <box gap="xsmall">
        <input placeholder="250m" label="CPU Request" name="cpu">
          <valueFrom datasource="statefulset" path="spec.template.spec.containers[0].resources.requests.cpu" />
        </input>
        <input placeholder="1Gi" label="Memory Request" name="memory">
          <valueFrom datasource="statefulset" path="spec.template.spec.containers[0].resources.requests.memory" />
        </input>
        <box direction="row" justify="end">
          <button action="scale" primary="true" />
        </box>
      </box>
    </box>
  </root>)

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

      runbook = put_in(runbook.spec.display, @displayxml)

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
            spec { display }
            data {
              name
              prometheus { values { timestamp value } }
            }
          }
        }
      """, %{"name" => "name", "namespace" => "name"}, %{current_user: insert(:user)})

      assert found["name"] == "runbook"
      assert found["spec"]["display"]["_type"] == "root"
      assert is_list(found["spec"]["display"]["children"])

      [result] = found["data"]

      assert result["name"] == "prometheus"
      [%{"values" => [value]}] = result["prometheus"]

      assert value["value"] == "1"
    end
  end
end
