defmodule Console.Services.RunbooksTest do
  use Console.DataCase, async: false
  use Mimic
  import KubernetesScaffolds
  alias Console.Services.Runbooks

  setup :set_mimic_global

  describe "#datasources" do
    test "it can fetch all datasources for a runbook" do
      runbook = runbook("runbook", [
        runbook_datasource(:prometheus, "prometheus"),
        runbook_datasource(:kubernetes, "kube", resource: "statefulset", name: "name")
      ])

      expect(HTTPoison, :post, fn _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{values: [[1, "1"]]}
        ]}})}}
      end)

      expect(Kazan, :run, fn _ -> {:ok, stateful_set("name", "name")} end)

      {:ok, results} = Runbooks.datasources(runbook)

      grouped = Enum.into(results, %{}, & {&1.name, &1})

      assert grouped["kube"].kubernetes.metadata.name == "name"
      assert length(grouped["prometheus"].prometheus) == 1
    end
  end
end
