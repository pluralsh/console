defmodule Console.Deployments.AddOnsTest do
  use Console.DataCase, async: false
  alias Console.Deployments.{AddOns, Git, Services}

  describe "#addons" do
    @tag :skip
    test "it can fetch add-ons in the artifacts repo" do
      deployment_settings(artifact_repository: build(:git_repository, url: "https://github.com/pluralsh/scaffolds.git"))

      {:ok, addons} = AddOns.addons()

      datadog = Enum.find(addons, & &1.name == "datadog")

      assert datadog.global
      assert length(datadog.configuration) == 2
    end
  end

  describe "#install/3" do
    @tag :skip
    test "it can install an add-on from the artifacts repo" do
      admin = admin_user()
      cluster = insert(:cluster)
      deployment_settings(artifact_repository: build(:git_repository, url: "https://github.com/pluralsh/scaffolds.git"))

      {:ok, svc} = AddOns.install(%{
        name: "datadog",
        configuration: [%{name: "apiKey", value: "dd-api-key"}],
        global: %{}
      }, cluster.id, admin)

      assert svc.cluster_id == cluster.id
      assert svc.repository_id == Git.artifacts_repo!().id

      {:ok, secrets} = Services.configuration(svc)
      assert secrets["apiKey"] == "dd-api-key"

      %{global_service: global} = Console.Repo.preload(svc, [:global_service])
      assert global.name == "datadog"
    end
  end
end
