defmodule Console do
  require Logger

  @ttl :timer.minutes(30)

  @type error :: {:error, term}

  def coalesce(nil, val), do: val
  def coalesce(val, _), do: val

  def debounce(scope, fun, opts \\ []) do
    case conf(:cache_adapter).get({:plrl_debounce, scope}) do
      nil ->
        conf(:cache_adapter).put({:plrl_debounce, scope}, opts[:placeholder] || :ok, opts ++ [ttl: @ttl])
        fun.()
      res -> res
    end
  end

  def rate_limit(), do: {"global", :timer.seconds(1), Console.conf(:qps)}

  def provider(), do: Console.conf(:provider)

  def github_raw_url(url), do: "#{Console.conf(:github_raw_url)}#{url}"

  def cloud?(), do: !!Console.conf(:cloud)

  def truncate(str, len) when byte_size(str) > len,
    do: "#{String.slice(str, 0, len - 3)}..."
  def truncate(str, _), do: str

  def byok?() do
    case {provider(), Console.conf(:byok)} do
      {_, true} -> true
      {prov, _} when prov in ~w(aws gcp azure generic)a -> false
      _ -> true
    end
  end

  def keypair(email) do
    with private <- :public_key.generate_key({:rsa, 2048, 65537}),
         %ExPublicKey.RSAPrivateKey{} = pk <- ExPublicKey.RSAPrivateKey.from_sequence(private),
         pub <- ExPublicKey.RSAPrivateKey.get_public(pk),
         entry <- :public_key.pem_entry_encode(:RSAPrivateKey, private),
         pem_private <- :public_key.pem_encode([entry]),
         {:ok, public} <- ExPublicKey.RSAPublicKey.as_sequence(pub),
         ssh_public <- :ssh_file.encode([{public, [{:comment, email}]}], :openssh_key),
      do: {:ok, pem_private, ssh_public}
  end

  @chars String.codepoints("abcdefghijklmnopqrstuvwxyz0123456789")

  def authed_user("deploy-" <> _ = deploy), do: Console.Deployments.Clusters.get_by_deploy_token(deploy)
  def authed_user("console-" <> _ = access), do: Console.Services.Users.get_by_token(access)
  def authed_user(jwt) do
    case Console.Guardian.resource_from_token(jwt) do
      {:ok, user, _} -> user
      _ -> :error
    end
  end

  def mapify(l) when is_list(l), do: Enum.map(l, &mapify/1)
  def mapify(%{__schema__: _} = schema) do
    Piazza.Ecto.Schema.mapify(schema)
    |> mapify()
  end
  def mapify(%{__struct__: _} = struct) do
    Map.from_struct(struct)
    |> mapify()
  end
  def mapify(%{} = map) do
    Enum.map(map, fn {k, v} -> {k, mapify(v)} end)
    |> Map.new()
  end
  def mapify(v), do: v

  def remove_ids(%{id: _} = map) do
    Map.delete(map, :id)
    |> remove_ids()
  end
  def remove_ids(%{} = map), do: Map.new(map, fn {k, v} -> {k, remove_ids(v)} end)
  def remove_ids(l) when is_list(l), do: Enum.map(l, &remove_ids/1)
  def remove_ids(v), do: v

  def move(map, from, to) do
    {val, map} = pop_in(map, from)
    put_in(map, to, val)
  end

  def drop_nils(%{} = map) do
    Enum.filter(map, fn {_, v} -> not is_nil(v) end)
    |> Map.new()
  end

  def clean(val) do
    mapify(val)
    |> remove_ids()
  end

  def string_map(%{} = map) do
    Poison.encode!(map)
    |> Poison.decode!()
  end

  def url(path), do: Path.join(Console.conf(:url), path)

  def graphql_endpoint(), do: url("/gql")

  def socket_endpoint(), do: "wss://#{conf(:hostname)}/socket"

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
      %{^key => orig} -> Map.put(attrs, key, maybe_merge(orig, val))
      %{^as_string => orig} -> Map.put(attrs, key, maybe_merge(orig, val))
      _ -> put_new(attrs, key, val)
    end
  end

  defp maybe_merge(%{} = orig, %{} = val), do: Map.merge(val, orig)
  defp maybe_merge(orig, _), do: orig

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

  def df(path \\ ".", acc \\ {0, 0})
  def df(path, {count, size}) do
    cond do
      File.regular?(path) ->
        stat = File.stat!(path)
        {count + 1, size + stat.size}
      File.dir?(path) ->
        File.ls!(path)
        |> Enum.map(&Path.join(path, &1))
        |> Enum.reduce({count, size}, fn p, {c, s} ->
          {c2, s2} = df(p)
          {c + c2, s + s2}
        end)
      true -> {count, size}
    end
  end

  def dump_folder(path, contents) do
    Enum.reduce_while(contents, :ok, fn {p, data}, _ ->
      fullpath = Path.join(path, p)
      with :ok <- File.mkdir_p(Path.dirname(fullpath)),
           :ok <- File.write(fullpath, data) do
        {:cont, :ok}
      else
        err -> {:halt, err}
      end
    end)
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

  def sha_file(f) do
    File.stream!(f, [], 2048)
    |> Enum.reduce(:crypto.hash_init(:sha256), &:crypto.hash_update(&2, &1))
    |> :crypto.hash_final()
    |> Base.encode16(case: :lower)
  end

  def async_retry(fun, tries \\ 0, res \\ :error)
  def async_retry(_, 3, res), do: res
  def async_retry(fun, tries, _) do
    try do
      Task.async(fun)
      |> Task.await(65_000)
      |> case do
        {:error, _} = err -> async_retry(fun, tries + 1, err)
        :error -> async_retry(fun, tries + 1, :error)
        res -> res
      end
    rescue
      err ->
        Logger.error(Exception.format(:error, err, __STACKTRACE__))
        async_retry(fun, tries + 1, {:error, :exception})
    end
  end

  def hmac(secret, payload) do
    :crypto.mac(:hmac, :sha1, secret, payload)
    |> Base.encode16(case: :lower)
  end

  def sha(body) do
    :crypto.hash(:sha, body)
    |> Base.url_encode64()
  end

  def shab16(body) do
    :crypto.hash(:sha, body)
    |> Base.encode16(case: :lower)
  end

  def all(items, res \\ [])
  def all([{:error, _} = err | _], _), do: err
  def all([{:ok, next} | rest], res), do: all(rest, [next | res])
  def all([v | rest], res), do: all(rest, [v | res])
  def all([], res), do: {:ok, res}

  def probe(map, [k]), do: Map.get(map, k)
  def probe(map, [k | rest]) do
    case map do
      %{^k => next} when is_map(next) -> probe(next, rest)
      _ -> nil
    end
  end

  def put_path(map, [k], value), do: Map.put(map, k, value)
  def put_path(map, [k | rest], value) do
    case map do
      %{^k => next} -> Map.put(map, k, put_path(next, rest, value))
      _ -> Map.put(map, k, put_path(%{}, rest, value))
    end
  end

  def lines(str), do: String.split(str, ~r/\R/)

  def throttle(enum, opts \\ %{count: 30, pause: 1})
  def throttle(enum, opts) when is_list(opts), do: throttle(enum, Map.new(opts))
  def throttle(enum, %{count: count, pause: pause}) do
    Stream.with_index(enum)
    |> Stream.map(fn {r, ind} ->
      if rem(ind, count) == 0 do
        :timer.sleep(pause)
      end

      r
    end)
  end

  def jitter(seconds), do: :rand.uniform(seconds * 2) - seconds

  def priv_file!(name), do: Path.join([:code.priv_dir(:console), name]) |> File.read!()

  def storage, do: Console.Storage.Git
end
