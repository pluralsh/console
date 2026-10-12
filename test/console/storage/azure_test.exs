defmodule Console.Storage.AzureTest do
  use ExUnit.Case, async: false
  alias Console.Storage.Azure
  alias Console.Storage.Azure.Credentials.DelegationKey
  alias Console.Schema.AgentRunUpload

  @key %DelegationKey{
    oid: "11111111-1111-1111-1111-111111111111",
    tid: "22222222-2222-2222-2222-222222222222",
    start: "2026-10-11T00:00:00Z",
    expiry: "2026-10-12T00:00:00Z",
    service: "b",
    version: "2020-12-06",
    value: "c2VjcmV0LWRlbGVnYXRpb24ta2V5LXZhbHVlLWZvci10ZXN0cw=="
  }

  describe "#sas/6" do
    test "it matches the signature the azure sdk generates for a user delegation key" do
      sas = Azure.sas("acct", "ctr", "plrl/agents/uploads/abc/run 1.mp4", @key, 3600, ~U[2026-10-11 12:00:00Z])
      query = URI.decode_query(sas)

      # generated with azure-storage-blob 12.19.0 pinned to service version 2020-12-06
      assert query["sig"] == "w4V2dWkHOuhPdrAi2sm5ZjJ0YOqHnxAjud1Njl/1nG0="
      assert query["st"] == "2026-10-11T11:55:00Z"
      assert query["se"] == "2026-10-11T13:00:00Z"
      assert query["skoid"] == @key.oid
      assert query["sp"] == "r"
    end
  end

  describe "workload identity" do
    setup do
      dir = Path.join(System.tmp_dir!(), "azure-wi-#{System.unique_integer([:positive])}")
      File.mkdir_p!(dir)
      token_file = Path.join(dir, "token")
      File.write!(token_file, "federated-jwt\n")

      env = %{"AZURE_TENANT_ID" => "tenant", "AZURE_CLIENT_ID" => "client", "AZURE_FEDERATED_TOKEN_FILE" => token_file}
      previous = Map.new(env, fn {k, _} -> {k, System.get_env(k)} end)
      System.put_env(env)

      waffle = Application.get_all_env(:waffle)
      Application.put_env(:waffle, :storage_account, "acct")
      Application.put_env(:waffle, :container, "ctr")
      path = Application.get_env(:console, :object_store_path)
      Application.put_env(:console, :object_store_path, "plrl")
      Console.Cache.delete(:azure_storage_token)
      Console.Cache.delete({:azure_delegation_key, "acct"})

      on_exit(fn ->
        Enum.each(previous, fn
          {k, nil} -> System.delete_env(k)
          {k, v} -> System.put_env(k, v)
        end)
        Enum.each(~w(storage_account container)a, &Application.delete_env(:waffle, &1))
        Application.put_all_env(waffle: waffle)
        Application.put_env(:console, :object_store_path, path)
        File.rm_rf!(dir)
      end)

      :ok
    end

    test "it uploads, signs and deletes blobs with a federated token" do
      test = self()

      Req.Test.stub(Azure, fn conn ->
        {:ok, body, conn} = Plug.Conn.read_body(conn)
        send(test, {conn.method, conn.host, conn.request_path, Plug.Conn.get_req_header(conn, "authorization"), body})

        case {conn.method, conn.host, conn.request_path} do
          {"POST", "login.microsoftonline.com", "/tenant/oauth2/v2.0/token"} ->
            Req.Test.json(conn, %{"access_token" => "storage-token", "expires_in" => 3600})

          {"POST", "acct.blob.core.windows.net", "/"} ->
            Plug.Conn.send_resp(conn, 200, """
            <?xml version="1.0" encoding="utf-8"?>
            <UserDelegationKey><SignedOid>#{@key.oid}</SignedOid><SignedTid>#{@key.tid}</SignedTid><SignedStart>#{@key.start}</SignedStart><SignedExpiry>#{@key.expiry}</SignedExpiry><SignedService>b</SignedService><SignedVersion>2020-12-06</SignedVersion><Value>#{@key.value}</Value></UserDelegationKey>
            """)

          {"PUT", "acct.blob.core.windows.net", _} -> Plug.Conn.send_resp(conn, 201, "")
          {"DELETE", "acct.blob.core.windows.net", _} -> Plug.Conn.send_resp(conn, 202, "")
        end
      end)

      scope = %AgentRunUpload{id: "abc"}
      file = %Waffle.File{binary: "recording", file_name: "run.mp4"}

      {:ok, "run.mp4"} = Azure.put(Console.Uploads, :original, {file, scope})

      assert_received {"POST", "login.microsoftonline.com", _, [], form}
      assert URI.decode_query(form) |> Map.take(~w(client_id client_assertion scope)) == %{
        "client_id" => "client",
        "client_assertion" => "federated-jwt",
        "scope" => "https://storage.azure.com/.default"
      }
      assert_received {"PUT", _, "/ctr/plrl/agents/uploads/abc/run.mp4", ["Bearer storage-token"], "recording"}

      url = Azure.url(Console.Uploads, :original, {file, scope}, signed: true)
      %URI{host: "acct.blob.core.windows.net", path: "/ctr/plrl/agents/uploads/abc/run.mp4", query: query} = URI.parse(url)
      assert %{"skoid" => oid, "sig" => _} = URI.decode_query(query)
      assert oid == @key.oid
      assert_received {"POST", _, "/", ["Bearer storage-token"], key_info}
      assert key_info =~ "<KeyInfo>"

      assert Azure.delete(Console.Uploads, :original, {file, scope}) == :ok
      assert_received {"DELETE", _, "/ctr/plrl/agents/uploads/abc/run.mp4", ["Bearer storage-token"], _}

      refute_received {"POST", "login.microsoftonline.com", _, _, _}
    end

    test "it reports missing workload identity configuration" do
      System.delete_env("AZURE_FEDERATED_TOKEN_FILE")

      {:error, msg} = Azure.put(Console.Uploads, :original, {%Waffle.File{binary: "x", file_name: "run.mp4"}, %AgentRunUpload{id: "abc"}})
      assert msg =~ "AZURE_FEDERATED_TOKEN_FILE is not set"
    end
  end
end
