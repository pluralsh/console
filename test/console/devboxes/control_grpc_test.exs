defmodule Console.Devboxes.Control.GrpcTest do
  use Console.DataCase, async: false
  alias Console.Devboxes.Control.Grpc
  alias Console.GRPC.Devbox.Auth
  alias Devbox.V1

  defmodule FakeControl do
    use GRPC.Server, service: Devbox.V1.Control.Service

    def suspend_instance(%V1.InstanceActionRequest{instance_id: id}, stream) do
      send(:persistent_term.get({__MODULE__, :test}), {:headers, GRPC.Stream.get_headers(stream)})
      %V1.InstanceActionResponse{instance_id: id, status: :INSTANCE_STATUS_SUSPENDED}
    end

    def cancel_instance(_, _), do: raise(GRPC.RPCError, status: :unavailable, message: "no tunnel")

    def resume_instance(_, _), do: raise(GRPC.RPCError, status: :unimplemented, message: "nope")

    def get_timeline(%V1.GetTimelineRequest{} = req, _) do
      send(:persistent_term.get({__MODULE__, :test}), {:timeline, req})
      %V1.GetTimelineResponse{}
    end

    def prompt(%V1.PromptRequest{} = req, _) do
      send(:persistent_term.get({__MODULE__, :test}), {:prompt, req})
      %V1.PromptResponse{prompt_id: req.prompt_id, disposition: :PROMPT_DISPOSITION_SENT}
    end
  end

  setup do
    :persistent_term.put({FakeControl, :test}, self())
    {:ok, sock} = :gen_tcp.listen(0, [])
    {:ok, port} = :inet.port(sock)
    :ok = :gen_tcp.close(sock)

    start_supervised!({GRPC.Server.Supervisor, servers: [FakeControl], port: port, start_server: true, max_body_size: 32 * 1024 * 1024})
    start_supervised!({GRPC.Client.Connection, name: Grpc, target: "ipv4:127.0.0.1:#{port}", adapter: Grpc.adapter()}, id: :kas)

    cluster = insert(:cluster)
    inst = insert(:devbox_instance, devbox: build(:devbox, cluster: cluster))
    {:ok, inst: inst, cluster: cluster}
  end

  test "calls are signed for kas and name their cluster", %{inst: inst, cluster: cluster} do
    {:ok, resp} = Grpc.suspend_instance(inst)

    assert resp.instance_id == inst.id
    assert_receive {:headers, headers}
    assert headers["devbox-cluster-id"] == cluster.id
    "Bearer " <> token = headers["authorization"]
    signer = Joken.Signer.create("HS256", Base.decode64!(Console.conf(:kas_devbox_secret)))
    assert {:ok, %{"aud" => "gitlab-kas"}} = Joken.verify(token, signer)
  end

  test "prompts carry their attachments", %{inst: inst} do
    thread = insert(:devbox_instance_session, instance: inst, user: inst.user)
    data = :binary.copy("x", 6 * 1024 * 1024)

    {:ok, _} = Grpc.send_prompt(inst, thread, [%{"type" => "text", "text" => "hi"}], [%{name: "big.log", mime_type: "text/plain", data: data}])

    assert_receive {:prompt, %V1.PromptRequest{attachments: [%V1.PromptAttachment{name: "big.log", mime_type: "text/plain", data: ^data}]}}
  end

  test "timelines resume a suspended box and carry their cursor", %{inst: inst} do
    {:ok, _} = Grpc.get_timeline(inst, "s1", %{limit: 10})
    assert_receive {:timeline, %V1.GetTimelineRequest{session_id: "s1", limit: 10, resume_if_suspended: true, cursor: nil}}

    {:ok, _} = Grpc.get_timeline(inst, "s1", %{before: 40})
    assert_receive {:timeline, %V1.GetTimelineRequest{cursor: {:before_position, 40}}}

    {:ok, _} = Grpc.get_timeline(inst, "s1", %{after: 0})
    assert_receive {:timeline, %V1.GetTimelineRequest{cursor: {:after_position, 0}}}
  end

  test "unavailable maps to not connected", %{inst: inst} do
    assert Grpc.cancel_instance(inst) == {:error, :not_connected}
  end

  test "unimplemented maps to unsupported", %{inst: inst} do
    assert Grpc.resume_instance(inst) == {:error, :unsupported}
  end

  test "push_credential is unsupported until the proto has a control rpc for it", %{inst: inst} do
    assert Grpc.push_credential(inst, %{}) == {:error, :unsupported}
  end

  describe "result/1" do
    test "error details win over the status code" do
      offline = detail(:ERROR_REASON_CLUSTER_OFFLINE, "")
      unsupported = detail(:ERROR_REASON_UNSUPPORTED, "fork isn't supported")
      suspended = detail(:ERROR_REASON_INSTANCE_SUSPENDED, "instance inst-1 is suspended")

      assert Grpc.result({:error, %GRPC.RPCError{status: GRPC.Status.failed_precondition(), message: "x", details: [offline]}}) ==
        {:error, :not_connected}
      assert Grpc.result({:error, %GRPC.RPCError{status: GRPC.Status.failed_precondition(), message: "x", details: [unsupported]}}) ==
        {:error, {:unsupported, "fork isn't supported"}}
      assert Grpc.result({:error, %GRPC.RPCError{status: GRPC.Status.failed_precondition(), message: "x", details: [suspended]}}) ==
        {:error, :suspended}
      assert Grpc.result({:error, %GRPC.RPCError{status: GRPC.Status.internal(), message: "boom"}}) == {:error, "boom"}
    end
  end

  test "without a connection calls are not connected" do
    stop_supervised!(:kas)
    inst = insert(:devbox_instance)
    assert Grpc.suspend_instance(inst) == {:error, :not_connected}
  end

  test "control metadata needs a configured secret" do
    secret = Console.conf(:kas_devbox_secret)
    Application.put_env(:console, :kas_devbox_secret, nil)
    on_exit(fn -> Application.put_env(:console, :kas_devbox_secret, secret) end)

    assert {:error, _} = Auth.control_metadata("cid")
  end

  defp detail(reason, msg) do
    %Google.Protobuf.Any{
      type_url: "type.googleapis.com/devbox.v1.ErrorDetail",
      value: V1.ErrorDetail.encode(%V1.ErrorDetail{reason: reason, message: msg})
    }
  end
end
