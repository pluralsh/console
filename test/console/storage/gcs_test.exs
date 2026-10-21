defmodule Console.Storage.GCSTest do
  use ExUnit.Case, async: false
  alias Console.Storage.GCS
  alias Console.Schema.AgentRunUpload

  @email "signer@test.iam.gserviceaccount.com"
  @now ~U[2026-10-11 12:00:00Z]

  setup do
    private = :public_key.generate_key({:rsa, 2048, 65537})
    pem = :public_key.pem_encode([:public_key.pem_entry_encode(:RSAPrivateKey, private)])
    %{private: private, pem: pem, public: public_key(private)}
  end

  describe "signed urls" do
    test "it signs a V4 query for a fixed timestamp", %{pem: pem, public: public} do
      query = GCS.signed_query("bucket", "plrl/agents/uploads/abc/run.mp4", @email, pem, 3600, @now)
      params = URI.decode_query(query)
      canonical_query = canonical_query()

      assert String.starts_with?(query, canonical_query <> "&X-Goog-Signature=")
      assert params["X-Goog-Algorithm"] == "GOOG4-RSA-SHA256"
      assert params["X-Goog-Credential"] == "#{@email}/20261011/auto/storage/goog4_request"
      assert params["X-Goog-Date"] == "20261011T120000Z"
      assert params["X-Goog-Expires"] == "3600"
      assert params["X-Goog-SignedHeaders"] == "host"

      canonical = Enum.join([
        "GET",
        "/bucket/plrl/agents/uploads/abc/run.mp4",
        canonical_query,
        "host:storage.googleapis.com\n",
        "host",
        "UNSIGNED-PAYLOAD"
      ], "\n")

      string_to_sign = Enum.join([
        "GOOG4-RSA-SHA256",
        "20261011T120000Z",
        "20261011/auto/storage/goog4_request",
        :crypto.hash(:sha256, canonical) |> Base.encode16(case: :lower)
      ], "\n")

      signature = Base.decode16!(params["X-Goog-Signature"], case: :mixed)
      assert :public_key.verify(string_to_sign, :sha256, signature, public)
    end
  end

  describe "configuration" do
    setup do
      previous = System.get_env("CONSOLE_GCS_CREDENTIALS")
      System.delete_env("CONSOLE_GCS_CREDENTIALS")
      bucket = Application.get_env(:waffle, :bucket)
      path = Application.get_env(:console, :object_store_path)
      Application.put_env(:waffle, :bucket, "bucket")
      Application.put_env(:console, :object_store_path, "plrl")
      Console.Cache.delete({:gcs_storage_token, :metadata})

      on_exit(fn ->
        if previous, do: System.put_env("CONSOLE_GCS_CREDENTIALS", previous), else: System.delete_env("CONSOLE_GCS_CREDENTIALS")
        restore(:waffle, :bucket, bucket)
        restore(:console, :object_store_path, path)
      end)

      :ok
    end

    test "it reports missing credentials when workload identity metadata is unavailable" do
      Req.Test.stub(Console.Storage.GCS, fn conn ->
        Plug.Conn.send_resp(conn, 404, "missing metadata")
      end)

      {:error, msg} = GCS.put(Console.Uploads, :original, {%Waffle.File{binary: "x", file_name: "run.mp4"}, %AgentRunUpload{id: "abc"}})
      assert msg =~ "CONSOLE_GCS_CREDENTIALS"
      assert msg =~ "workload identity"
    end

    test "it reports a service account JSON key that cannot be parsed" do
      System.put_env("CONSOLE_GCS_CREDENTIALS", "not-json")

      {:error, msg} = GCS.put(Console.Uploads, :original, {%Waffle.File{binary: "x", file_name: "run.mp4"}, %AgentRunUpload{id: "abc"}})
      assert msg =~ "CONSOLE_GCS_CREDENTIALS is not valid service account json"
    end
  end

  defp canonical_query do
    credential = URI.encode("#{@email}/20261011/auto/storage/goog4_request", &URI.char_unreserved?/1)

    Enum.join([
      "X-Goog-Algorithm=GOOG4-RSA-SHA256",
      "X-Goog-Credential=" <> credential,
      "X-Goog-Date=20261011T120000Z",
      "X-Goog-Expires=3600",
      "X-Goog-SignedHeaders=host"
    ], "&")
  end

  defp public_key(private) do
    {:RSAPublicKey, elem(private, 2), elem(private, 3)}
  end

  defp restore(app, key, nil), do: Application.delete_env(app, key)
  defp restore(app, key, value), do: Application.put_env(app, key, value)
end
