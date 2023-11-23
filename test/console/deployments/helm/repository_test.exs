defmodule Console.Deployments.Helm.RepositoryTest do
  use Console.DataCase
  alias Console.Deployments.Helm.Repository
  alias Kube.HelmRepository

  describe "#charts/1" do
    test "it will fetch charts for a helm repository" do
      repo = %HelmRepository{
        status: %HelmRepository.Status{
          artifact: %HelmRepository.Status.Artifact{url: "https://pluralsh.github.io/console/index.yaml"}
        }
      }

      {:ok, [%{name: "console", charts: [chart | _]}]} = Repository.charts(repo)

      assert chart.name
      assert chart.version
      assert chart.app_version
    end
  end
end
