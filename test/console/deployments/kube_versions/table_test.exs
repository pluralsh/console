defmodule Console.Deployments.KubeVersions.TableTest do
  use Console.DataCase, async: true
  alias Console.Deployments.KubeVersions.Table

  describe "extended versions" do
    test "that we can get the extended versions" do
      versions = Table.extended_versions()

      assert is_binary(versions[:eks])
      assert is_binary(versions[:aks])
      assert is_binary(versions[:gke])
    end
  end
end
