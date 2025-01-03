defmodule Console.Buffers.ClusterAuditTest do
  use Console.DataCase, async: false
  alias Console.Repo
  alias Console.Schema.ClusterAuditLog
  alias Console.Buffers.ClusterAudit

  describe "it will buffer audit writes" do
    test "buffering" do
      cluster = insert(:cluster)
      user = insert(:user)

      {:ok, pid} = ClusterAudit.start()

      ClusterAudit.audit(pid, audit(cluster, user))
      ClusterAudit.audit(pid, audit(cluster, user))
      ClusterAudit.audit(pid, audit(cluster, user))
      ClusterAudit.audit(pid, audit(cluster, user))

      :ok = ClusterAudit.flush(pid)

      audits = Repo.all(ClusterAuditLog)
      assert length(audits) == 4
    end
  end

  def audit(cluster, user) do
    %{cluster_id: cluster.id, actor_id: user.id, path: "/v1/namespaces", method: "GET"}
  end
end
