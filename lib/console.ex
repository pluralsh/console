defmodule Console do
  def conf(key, default \\ nil), do: Application.get_env(:console, key, default)

  def sandbox?(), do: conf(:is_sandbox, false)

  def demo_project?(), do: conf(:is_demo_project, false)

  def deep_get(map, keys, def \\ nil)
  def deep_get(map, [key], def), do: Map.get(map, key, def)
  def deep_get(map, [key | keys], def) do
    case Map.fetch(map, key) do
      {:ok, %{} = val} -> deep_get(val, keys, def)
      _ -> def
    end
  end

  def rand_str(size \\ 32) do
    :crypto.strong_rand_bytes(size)
    |> Base.url_encode64()
    |> String.replace("/", "")
  end

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

  def namespaces(), do: Console.Cached.Namespace.fetch()

  def namespace(namespace) do
    case Console.Plural.Config.fetch_file() do
      %{"namespacePrefix" => pref} when is_binary(pref) -> "#{pref}#{namespace}"
      _ -> namespace
    end
  end

  def from_namespace(namespace) do
    case Console.Plural.Config.fetch_file() do
      %{"namespacePrefix" => pref} when byte_size(pref) > 0 -> String.trim_leading(namespace, pref)
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
      %{^k => next} -> Map.put(map, k, put_path(next, rest, value))
      _ -> Map.put(map, k, put_path(%{}, rest, value))
    end
  end

  def storage, do: Console.Storage.Git
end
