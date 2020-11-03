defmodule Watchman.GraphQl.KubernetesMutationsTest do
  use Watchman.DataCase, async: true
  use Mimic
  import Watchman.KubernetesScaffolds

  describe "deletePod" do
    test "it can delete a pod" do
      expect(Kazan, :run, fn _ -> {:ok, status()} end)

      {:ok, %{data: %{"deletePod" => status}}} = run_query("""
        mutation Del($namespace: String!, $name: String!) {
          deletePod(namespace: $namespace, name: $name) { status message }
        }
      """, %{"namespace" => "ns", "name" => "name"}, %{current_user: insert(:user)})

      assert status["status"] == "Success"
    end
  end
end