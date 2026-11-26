defmodule Console.GraphQl.Deployments.DevboxWorkloadIdentityQueriesTest do
  use Console.DataCase, async: true

  describe "devbox.workloadIdentity" do
    test "a cluster's box exposes its issuer and trust snippets" do
      cluster = insert(:cluster, allow_agents: true)

      {:ok, %{data: %{"upsertDevbox" => %{"id" => id, "cloudIdentities" => [identity]}}}} = run_query("""
        mutation Upsert($attrs: DevboxAttributes!) {
          upsertDevbox(attributes: $attrs) { id cloudIdentities { name provider roleArn } }
        }
      """, %{"attrs" => %{
        "name" => "dev",
        "cloudIdentities" => [%{"name" => "prod", "provider" => "AWS", "roleArn" => "arn:aws:iam::123456789012:role/dev"}]
      }}, %{cluster: cluster})

      assert identity == %{"name" => "prod", "provider" => "AWS", "roleArn" => "arn:aws:iam::123456789012:role/dev"}

      {:ok, %{data: %{"devbox" => %{"workloadIdentity" => wi}}}} = run_query("""
        query Box($id: ID!) {
          devbox(id: $id) { workloadIdentity { issuerUrl subject audiences snippets { provider format title content } } }
        }
      """, %{"id" => id}, %{cluster: cluster})

      assert wi["issuerUrl"] == Console.WorkloadIdentity.issuer_url("devboxes", id)
      assert wi["subject"] == "devbox:dev"
      assert "sts.amazonaws.com" in wi["audiences"]
      assert Enum.any?(wi["snippets"], & &1["provider"] == "AWS" && &1["format"] == "TERRAFORM")
      assert Enum.any?(wi["snippets"], & &1["provider"] == "GCP")
      assert Enum.any?(wi["snippets"], & &1["provider"] == "AZURE")
      assert Console.WorkloadIdentity.get_enabled_issuer("devboxes", id)
    end

    test "invalid cloud identities are rejected" do
      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Upsert($attrs: DevboxAttributes!) { upsertDevbox(attributes: $attrs) { id } }
      """, %{"attrs" => %{
        "name" => "dev",
        "cloudIdentities" => [%{"name" => "gcp", "provider" => "GCP", "workloadIdentityProvider" => "nope"}]
      }}, %{cluster: insert(:cluster)})
    end
  end

  describe "deleteDevbox" do
    test "it disables the box's issuer" do
      cluster = insert(:cluster, allow_agents: true)
      {:ok, devbox} = Console.Devboxes.upsert_devbox(%{name: "dev"}, cluster)

      {:ok, %{data: %{"deleteDevbox" => _}}} = run_query("""
        mutation Del($id: ID!) { deleteDevbox(id: $id) { id } }
      """, %{"id" => devbox.id}, %{cluster: cluster})

      refute Console.WorkloadIdentity.get_enabled_issuer("devboxes", devbox.id)
    end
  end
end
