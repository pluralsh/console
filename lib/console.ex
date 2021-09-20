defmodule Console do
  def conf(key, default \\ nil), do: Application.get_env(:console, key, default)

  def stream_result(enum) do
    Enum.reduce_while(enum, [], fn
      {:ok, val}, acc -> {:cont, [val | acc]}
      {:error, } = err, _ -> {:halt, {:error, err}}
    end)
    |> case do
      {:error, _} = err -> err
      result -> {:ok, result}
    end
  end

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

  def put_path(map, [k], value), do: Map.put(map, k, value)
  def put_path(map, [k | rest], value) do
    case map do
      %{^k => map} -> Map.put(map, k, put_path(map, rest, value))
      _ -> Map.put(map, k, put_path(%{}, rest, value))
    end
  end

  def storage, do: Console.Storage.Git
end
