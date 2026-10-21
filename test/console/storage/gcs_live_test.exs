defmodule Console.Storage.GCSLiveTest do
  @moduledoc """
  Runs against fake-gcs-server from `make testup` / `make test-full`. Excluded unless `GCS_TEST_URL` is set.
  """
  use Console.DataCase, async: false
  alias Console.Schema.AgentRunUpload
  alias Console.Uploads

  @moduletag :gcs
  @bucket "console-gcs-test"

  defmodule Identity do
    @email "signer@test.iam.gserviceaccount.com"
    def email, do: @email

    def init(key), do: key

    def call(conn, key) do
      {:ok, body, conn} = Plug.Conn.read_body(conn)

      cond do
        conn.request_path == "/computeMetadata/v1/instance/service-accounts/default/token" ->
          json(conn, %{"access_token" => "wi-token", "expires_in" => 3600})

        conn.request_path == "/computeMetadata/v1/instance/service-accounts/default/email" ->
          conn |> Plug.Conn.put_resp_content_type("text/plain") |> Plug.Conn.send_resp(200, @email)

        conn.request_path == "/token" ->
          json(conn, %{"access_token" => "sa-token", "expires_in" => 3600})

        String.ends_with?(conn.request_path, ":signBlob") ->
          %{"payload" => payload} = Jason.decode!(body)
          signature = :public_key.sign(Base.decode64!(payload), :sha256, key)
          json(conn, %{"signedBlob" => Base.encode64(signature)})

        true ->
          Plug.Conn.send_resp(conn, 404, conn.request_path)
      end
    end

    defp json(conn, body) do
      conn
      |> Plug.Conn.put_resp_content_type("application/json")
      |> Plug.Conn.send_resp(200, Jason.encode!(body))
    end
  end

  setup_all do
    private = :public_key.generate_key({:rsa, 2048, 65537})
    pem = :public_key.pem_encode([:public_key.pem_entry_encode(:RSAPrivateKey, private)])
    {:ok, pid, port} = start_identity(private)
    gcs = System.fetch_env!("GCS_TEST_URL") |> String.trim_trailing("/")
    :ok = create_bucket(gcs)

    previous = %{
      gcs: Application.get_env(:console, Console.Storage.GCS),
      storage: Application.get_env(:waffle, :storage),
      bucket: Application.get_env(:waffle, :bucket),
      path: Application.get_env(:console, :object_store_path),
      credentials: System.get_env("CONSOLE_GCS_CREDENTIALS")
    }

    Application.put_env(:console, Console.Storage.GCS, [
      storage_url: gcs,
      token_url: "http://127.0.0.1:#{port}/token",
      metadata_url: "http://127.0.0.1:#{port}",
      iam_url: "http://127.0.0.1:#{port}",
      retry: false
    ])
    Application.put_env(:waffle, :storage, Console.Storage.GCS)
    Application.put_env(:waffle, :bucket, @bucket)
    Application.put_env(:console, :object_store_path, "plrl")

    on_exit(fn ->
      restore(previous)
      Process.unlink(pid)
      Process.exit(pid, :shutdown)
    end)

    {:ok, pem: pem, public: {:RSAPublicKey, elem(private, 2), elem(private, 3)}, gcs: gcs}
  end

  setup %{pem: pem} do
    previous = System.get_env("CONSOLE_GCS_CREDENTIALS")

    on_exit(fn ->
      if previous, do: System.put_env("CONSOLE_GCS_CREDENTIALS", previous), else: System.delete_env("CONSOLE_GCS_CREDENTIALS")
      Console.Cache.delete({:gcs_storage_token, :metadata})
      Console.Cache.delete({:gcs_storage_token, {:key, Identity.email()}})
    end)

    %{credentials: Jason.encode!(%{"client_email" => Identity.email(), "private_key" => pem})}
  end

  test "it uploads, signs and deletes with a service account key", %{public: public, credentials: credentials} do
    System.put_env("CONSOLE_GCS_CREDENTIALS", credentials)
    assert_round_trip(public)
  end

  test "it uploads, signs and deletes with workload identity", %{public: public} do
    System.delete_env("CONSOLE_GCS_CREDENTIALS")
    assert_round_trip(public)
  end

  test "it stores an agent run upload through the schema", %{public: public, credentials: credentials} do
    System.put_env("CONSOLE_GCS_CREDENTIALS", credentials)
    run = insert(:agent_run)
    {path, body} = recording()

    # The id has to exist before cast_attachments stores the object. Production inserts the
    # row first; setting it here keeps a single insert on the same path the signed url uses.
    {:ok, upload} =
      %AgentRunUpload{id: Ecto.UUID.generate()}
      |> AgentRunUpload.changeset(%{
        agent_run_id: run.id,
        screen_recording: %Plug.Upload{path: path, filename: "run.mp4", content_type: "video/mp4"}
      })
      |> Repo.insert()

    url = Uploads.url({upload.screen_recording, upload}, :original, signed: true)
    verify!(url, public)
    assert get!(url).body == body

    assert Uploads.delete({upload.screen_recording, upload}) == :ok
    assert get!(object_url(upload.id)).status == 404
  end

  defp assert_round_trip(public) do
    id = Ecto.UUID.generate()
    {path, body} = recording()
    scope = %AgentRunUpload{id: id}
    upload = %Plug.Upload{path: path, filename: "run.mp4", content_type: "video/mp4"}

    assert {:ok, "run.mp4"} = Uploads.store({upload, scope})
    assert get!(object_url(id)).body == body

    url = Uploads.url({%{file_name: "run.mp4"}, scope}, :original, signed: true)
    verify!(url, public)
    assert get!(url).body == body
    assert url =~ "X-Goog-Algorithm=GOOG4-RSA-SHA256"
    assert url =~ "X-Goog-Credential="
    assert url =~ "X-Goog-Signature="

    assert Uploads.delete({"run.mp4", scope}) == :ok
    assert get!(object_url(id)).status == 404
  end

  defp recording do
    id = System.unique_integer([:positive])
    path = Path.join(System.tmp_dir!(), "gcs-live-#{id}.mp4")
    body = "recording-#{id}"
    File.write!(path, body)
    on_exit(fn -> File.rm(path) end)
    {path, body}
  end

  defp object_url(id) do
    base = System.fetch_env!("GCS_TEST_URL") |> String.trim_trailing("/")
    "#{base}/#{@bucket}/plrl/agents/uploads/#{id}/run.mp4"
  end

  defp get!(url) do
    {:ok, resp} = Req.get(url: url, retry: false)
    resp
  end

  defp verify!(url, public) do
    %URI{scheme: scheme, host: host, port: port, path: path, query: query} = URI.parse(url)
    params = URI.decode_query(query)
    assert params["X-Goog-Algorithm"] == "GOOG4-RSA-SHA256"
    assert String.starts_with?(params["X-Goog-Credential"], Identity.email() <> "/")
    assert params["X-Goog-Signature"]

    canonical_query =
      params
      |> Map.delete("X-Goog-Signature")
      |> Enum.sort()
      |> Enum.map_join("&", fn {key, value} ->
        URI.encode(key, &URI.char_unreserved?/1) <> "=" <> URI.encode(value, &URI.char_unreserved?/1)
      end)

    canonical = Enum.join([
      "GET",
      path,
      canonical_query,
      "host:#{signed_host(scheme, host, port)}\n",
      "host",
      "UNSIGNED-PAYLOAD"
    ], "\n")

    [_email, date, rest] = String.split(params["X-Goog-Credential"], "/", parts: 3)
    string_to_sign = Enum.join([
      "GOOG4-RSA-SHA256",
      params["X-Goog-Date"],
      date <> "/" <> rest,
      :crypto.hash(:sha256, canonical) |> Base.encode16(case: :lower)
    ], "\n")

    signature = Base.decode16!(params["X-Goog-Signature"], case: :mixed)
    assert :public_key.verify(string_to_sign, :sha256, signature, public)
  end

  defp signed_host("https", host, 443), do: host
  defp signed_host("http", host, 80), do: host
  defp signed_host(_, host, nil), do: host
  defp signed_host(_, host, port), do: "#{host}:#{port}"

  defp create_bucket(gcs, attempts \\ 20) do
    case Req.post(url: gcs <> "/storage/v1/b", params: [project: "test"], json: %{name: @bucket}, retry: false) do
      {:ok, %{status: status}} when status in [200, 409] -> :ok
      _ when attempts > 1 ->
        Process.sleep(250)
        create_bucket(gcs, attempts - 1)
      other ->
        raise "could not create gcs test bucket: #{inspect(other)}"
    end
  end

  defp start_identity(key, attempts \\ 5) do
    port = 20_000 + :rand.uniform(20_000)

    case Bandit.start_link(plug: {Identity, key}, port: port, ip: {127, 0, 0, 1}) do
      {:ok, pid} -> {:ok, pid, port}
      {:error, :eaddrinuse} when attempts > 1 -> start_identity(key, attempts - 1)
      other -> other
    end
  end

  defp restore(previous) do
    restore_env(:console, Console.Storage.GCS, previous.gcs)
    restore_env(:waffle, :storage, previous.storage)
    restore_env(:waffle, :bucket, previous.bucket)
    restore_env(:console, :object_store_path, previous.path)

    if previous.credentials do
      System.put_env("CONSOLE_GCS_CREDENTIALS", previous.credentials)
    else
      System.delete_env("CONSOLE_GCS_CREDENTIALS")
    end
  end

  defp restore_env(app, key, nil), do: Application.delete_env(app, key)
  defp restore_env(app, key, value), do: Application.put_env(app, key, value)
end
