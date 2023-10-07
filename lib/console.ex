defmodule Console do
  @type error :: {:error, term}

  @chars String.codepoints("abcdefghijklmnopqrstuvwxyz0123456789")

  def url(path), do: Path.join(Console.conf(:url), path)

  def is_set(var) do
    case System.get_env(var) do
      "" -> false
      nil -> false
      _ -> true
    end
  end

  def dedupe(attrs, key, val) do
    as_string = Atom.to_string(key)
    case attrs do
      %{^key => _} -> attrs
      %{^as_string => _} -> attrs
      _ -> put_new(attrs, key, val)
    end
  end

  def ls_r(path \\ ".") do
    cond do
      File.regular?(path) -> [path]
      File.dir?(path) ->
        File.ls!(path)
        |> Enum.map(&Path.join(path, &1))
        |> Enum.map(&ls_r/1)
        |> Enum.concat()
      true -> []
    end
  end

  def put_new(attrs, key, val) when is_function(val), do: Map.put_new_lazy(attrs, key, val)
  def put_new(attrs, key, val), do: Map.put_new(attrs, key, val)

  def merge(list) when is_list(list) do
    Enum.reduce(list, %{}, &Map.merge(&2, &1))
  end

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

  def rand_alphanum(len) do
    Enum.map((1..len), fn _ -> Enum.random(@chars) end)
    |> Enum.join("")
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
    :crypto.mac(:hmac, :sha1, secret, payload)
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
