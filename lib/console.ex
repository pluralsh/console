defmodule Console do
  def conf(key, default \\ nil), do: Application.get_env(:console, key, default)

  def namespace(namespace) do
    case Console.Plural.Config.fetch_file() do
      %{"namespacePrefix" => pref} when is_binary(pref) -> "#{pref}#{namespace}"
      _ -> namespace
    end
  end

  def workspace(), do: Path.join(conf(:workspace_root), conf(:repo_root))

  def hmac(secret, payload) do
    :crypto.hmac(:sha, secret, payload)
    |> Base.encode16(case: :lower)
  end

  def sha(body) do
    :crypto.hash(:sha, body)
    |> Base.url_encode64()
  end

  def storage, do: Console.Storage.Git
end
