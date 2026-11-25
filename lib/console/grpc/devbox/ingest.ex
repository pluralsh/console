defmodule Console.GRPC.Devbox.Ingest do
  @moduledoc """
  `devbox.v1.Ingest`: what devbox gateways report, relayed by KAS.  Every call is authenticated with
  `Console.GRPC.Devbox.Auth` and scoped to the cluster KAS verified.
  """
  use GRPC.Server, service: Devbox.V1.Ingest.Service
  alias Console.Devboxes.Ingest
  alias Console.GRPC.Devbox.{Auth, Proto}
  alias Console.Schema.{DevboxInstance, PullRequest}
  alias Devbox.V1

  def register_gateway(req, stream) do
    cluster = Auth.authenticate!(stream)
    with {:ok, resp} <- Ingest.register_gateway(Proto.to_map(req), cluster) do
      %V1.RegisterGatewayResponse{
        cluster_id: resp.cluster_id,
        heartbeat_interval_seconds: resp.heartbeat_interval_seconds,
        instances: Enum.map(resp.instances, &summary/1)
      }
    end
    |> reply!()
  end

  def heartbeat(req, stream) do
    cluster = Auth.authenticate!(stream)
    with {:ok, %{unknown_instance_ids: ids}} <- Ingest.heartbeat(Proto.to_map(req), cluster) do
      %V1.HeartbeatResponse{unknown_instance_ids: ids}
    end
    |> reply!()
  end

  def upsert_instance_index(req, stream) do
    cluster = Auth.authenticate!(stream)
    with {:ok, %{sessions_applied: s, interactions_applied: i}} <- Ingest.upsert_instance_index(Proto.to_map(req), cluster) do
      %V1.UpsertInstanceIndexResponse{sessions_applied: s, interactions_applied: i}
    end
    |> reply!()
  end

  def push_instance_deltas(%V1.PushInstanceDeltasRequest{deltas: deltas}, stream) do
    cluster = Auth.authenticate!(stream)
    Ingest.publish_instance_deltas(Proto.to_map(deltas), cluster)
    %V1.PushInstanceDeltasResponse{}
  end

  def report_instance_status(req, stream) do
    cluster = Auth.authenticate!(stream)
    attrs = Proto.to_map(req) |> drop_zero(:template_revision) |> drop_zero(:generation) |> drop_zero(:rebase_revision)
    with {:ok, %DevboxInstance{status: status}} <- Ingest.report_instance_status(attrs, cluster) do
      %V1.ReportInstanceStatusResponse{status: Proto.enum(status, V1.InstanceStatus)}
    end
    |> reply!()
  end

  def report_snapshot(req, stream) do
    cluster = Auth.authenticate!(stream)
    with {:ok, _} <- Ingest.report_snapshot(Proto.to_map(req) |> drop_zero(:size_bytes), cluster) do
      %V1.ReportSnapshotResponse{}
    end
    |> reply!()
  end

  def get_instance_credentials(%V1.GetInstanceCredentialsRequest{instance_id: id, devbox_id: devbox_id, credentials: selectors}, stream) do
    cluster = Auth.authenticate!(stream)
    with {:ok, creds} <- credentials(id, devbox_id, Proto.to_map(selectors), cluster) do
      %V1.GetInstanceCredentialsResponse{credentials: Enum.map(creds, &credential/1)}
    end
    |> reply!()
  end

  defp credentials("", devbox_id, selectors, cluster) when devbox_id not in [nil, ""],
    do: Ingest.get_devbox_credentials(devbox_id, selectors, cluster)
  defp credentials(id, _, selectors, cluster), do: Ingest.get_instance_credentials(id, selectors, cluster)

  def update_agent_credential(req, stream) do
    cluster = Auth.authenticate!(stream)
    with {:ok, %{applied: applied, current: current}} <- Ingest.update_agent_credential(Proto.to_map(req), cluster) do
      %V1.UpdateAgentCredentialResponse{applied: applied, current: current && credential(current)}
    end
    |> reply!()
  end

  def report_pull_request(req, stream) do
    cluster = Auth.authenticate!(stream)
    with {:ok, %{pull_request: %PullRequest{id: id}, created: created}} <- Ingest.report_observed_pull_request(Proto.to_map(req), cluster) do
      %V1.ReportPullRequestResponse{pull_request_id: id, created: created}
    end
    |> reply!()
  end

  def devbox_pull_request(%V1.DevboxPullRequestRequest{instance_id: id, thread_id: tid} = req, stream) do
    cluster = Auth.authenticate!(stream)
    with {:ok, %PullRequest{} = pr} <- Ingest.devbox_pull_request(Proto.to_map(req), id, Proto.to_map(tid), cluster) do
      %V1.DevboxPullRequestResponse{pull_request_id: pr.id, url: pr.url, number: pr_number(pr)}
    end
    |> reply!()
  end

  defp summary(inst) do
    %V1.InstanceSummary{
      instance_id: inst.instance_id,
      devbox_id: inst.devbox_id,
      status: Proto.enum(inst.status, V1.InstanceStatus),
      leases: Enum.map(inst.leases, &lease/1),
      lease_generation: inst.lease_generation || 0
    }
  end

  @doc false
  def lease(lease) do
    %V1.Lease{
      kind: Proto.enum(lease.kind, V1.LeaseKind),
      holder: lease[:holder] && %V1.Principal{user_id: Proto.str(lease.holder[:user_id])},
      expires_at: Proto.timestamp(lease.expires_at)
    }
  end

  @doc false
  def credential(cred) do
    %V1.InstanceCredential{
      kind: Proto.enum(cred.kind, V1.CredentialKind),
      host: Proto.str(cred[:host]),
      identity: Proto.str(cred[:identity]),
      token: Proto.str(cred[:token]),
      header_name: Proto.str(cred[:header_name]),
      header_format: Proto.str(cred[:header_format]),
      expires_at: Proto.timestamp(cred[:expires_at]),
      refresh_after: Proto.timestamp(cred[:refresh_after]),
      codex_mode: Proto.enum(cred[:codex_mode], V1.CodexCredentialMode),
      credential_id: Proto.str(cred[:credential_id]),
      version: cred[:version] || 0,
      bundle_json: cred[:bundle_json] || "",
      refresh_lease_holder: !!cred[:refresh_lease_holder],
      lease_expires_at: Proto.timestamp(cred[:lease_expires_at]),
      metadata: Proto.struct(cred[:metadata])
    }
  end

  defp pr_number(%PullRequest{url: url}) do
    case Regex.run(~r{/(\d+)/?$}, url || "") do
      [_, n] -> String.to_integer(n)
      _ -> 0
    end
  end

  defp drop_zero(attrs, key) do
    case attrs do
      %{^key => 0} -> Map.delete(attrs, key)
      _ -> attrs
    end
  end

  defp reply!(%_{} = resp), do: resp
  defp reply!({:error, err}), do: raise(GRPC.RPCError, status: status(err), message: message(err))

  defp status(%{extensions: %{code: "UNSUPPORTED"}}), do: :unimplemented
  defp status(%{extensions: %{code: "CLUSTER_OFFLINE"}}), do: :unavailable
  defp status(%Ecto.Changeset{}), do: :invalid_argument
  defp status(:not_found), do: :not_found
  defp status("clusters can only" <> _), do: :permission_denied
  defp status(_), do: :failed_precondition

  defp message(%{message: msg}) when is_binary(msg), do: msg
  defp message(%Ecto.Changeset{} = cs), do: inspect(Ecto.Changeset.traverse_errors(cs, fn {msg, _} -> msg end))
  defp message(msg) when is_binary(msg), do: msg
  defp message(err), do: inspect(err)
end
