defmodule Console.Devboxes.WorkspaceTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Devboxes.{Control, StreamToken, Workspace}

  describe "open_stream/4" do
    test "it mints a short-lived token bound to the stream" do
      inst = instance()

      {:ok, stream} = Workspace.open_stream(inst.id, :terminal, %{}, inst.user)

      assert stream.url =~ "/ext/devbox/streams/#{stream.stream_id}"
      {:ok, claims} = StreamToken.verify(stream.token)
      assert claims["stream_id"] == stream.stream_id
      assert claims["instance"] == inst.id
      assert claims["cluster"] == inst.devbox.cluster_id
      assert claims["kind"] == "terminal"
      assert claims["sub"] == inst.user.id
      assert claims["exp"] <= System.system_time(:second) + StreamToken.ttl()
    end

    test "the token never outlives the gateway's registration" do
      inst = instance()
      soon = Timex.now() |> Timex.shift(seconds: 30)
      expect(Control.Test, :open_stream, fn _, kind, _ -> {:ok, %{stream_id: "s-1", kind: kind, expires_at: soon}} end)

      {:ok, %{token: token}} = Workspace.open_stream(inst.id, :vnc, %{}, inst.user)
      {:ok, %{"exp" => exp}} = StreamToken.verify(token)

      assert exp <= DateTime.to_unix(soon)
    end

    test "previews need a valid port" do
      inst = instance()

      {:error, _} = Workspace.open_stream(inst.id, :preview, %{}, inst.user)
      {:error, _} = Workspace.open_stream(inst.id, :preview, %{port: 70_000}, inst.user)
      {:ok, %{kind: :preview}} = Workspace.open_stream(inst.id, :preview, %{port: 3000}, inst.user)
    end

    test "vnc streams can open an http(s) url in the instance's browser" do
      inst = instance()
      expect(Control.Test, :open_stream, fn _, :vnc, %{url: "http://localhost:3000"} ->
        {:ok, %{stream_id: "s-1", kind: :vnc, expires_at: Timex.now() |> Timex.shift(minutes: 5)}}
      end)

      {:ok, %{kind: :vnc}} = Workspace.open_stream(inst.id, :vnc, %{url: "http://localhost:3000"}, inst.user)
      {:error, _} = Workspace.open_stream(inst.id, :vnc, %{url: "file:///etc/passwd"}, inst.user)
      {:error, _} = Workspace.open_stream(inst.id, :vnc, %{url: "javascript:alert(1)"}, inst.user)
    end

    test "strangers and ended instances get nothing" do
      inst = instance()
      {:error, _} = Workspace.open_stream(inst.id, :terminal, %{}, insert(:user))

      ended = instance(status: :completed)
      {:error, _} = Workspace.open_stream(ended.id, :terminal, %{}, ended.user)
    end
  end

  describe "StreamToken.verify/1" do
    test "it rejects tampered, foreign and expired tokens" do
      inst = instance()
      {:ok, token, _} = StreamToken.mint(inst, %{stream_id: "s", kind: :terminal}, inst.user)
      [h, p, s] = String.split(token, ".")
      {:error, _} = StreamToken.verify("#{h}.#{p}x.#{s}")

      other = Joken.Signer.create("HS256", "another-key")
      {:ok, foreign, _} = Joken.encode_and_sign(%{"aud" => "kas-devbox-streams", "exp" => System.system_time(:second) + 60}, other)
      {:error, _} = StreamToken.verify(foreign)

      {:ok, expired, _} = StreamToken.mint(inst, %{stream_id: "s", kind: :terminal, expires_at: Timex.now() |> Timex.shift(seconds: -5)}, inst.user)
      {:error, _} = StreamToken.verify(expired)
    end
  end

  describe "files and changes" do
    test "readers can list and read, writes need prompt access" do
      inst = instance()

      {:ok, []} = Workspace.list_files(inst.id, nil, %{}, inst.user)
      {:ok, [%{name: "handler.ex"}]} = Workspace.list_files(inst.id, "api", %{query: "handler"}, inst.user)
      {:ok, [%{name: "lib"}]} = Workspace.list_files(inst.id, "api", %{brief: true, ignored: true}, inst.user)
      {:ok, %{entry: %{path: "README.md"}}} = Workspace.read_file(inst.id, "README.md", inst.user)
      {:ok, %{sha256: sha}} = Workspace.write_file(inst.id, "a.txt", "hi", nil, inst.user)
      assert sha == Base.encode16(:crypto.hash(:sha256, "hi"), case: :lower)
      {:ok, []} = Workspace.changes(inst.id, %{}, inst.user)

      {:error, _} = Workspace.write_file(inst.id, "a.txt", "hi", nil, insert(:user))
    end
  end

  defp instance(attrs \\ []) do
    user = insert(:user)
    insert(:devbox_instance, Keyword.merge([user: user, workbench: build(:workbench, read_bindings: [%{user_id: user.id}])], attrs))
  end
end
