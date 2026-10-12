defmodule Console.AI.Workbench.Filesystem do
  @moduledoc """
  Exposes a workbench's pseudofs tenant to the python sandbox.  The tenant root is mounted at
  `/workbench`, implementing the os callbacks monty uses for `pathlib` and `open`, alongside `glob`
  and `grep` functions monty doesn't natively support.
  """
  alias Console.PseudoFS
  alias Console.Schema.Workbench
  alias Pseudofs.V1.StatResponse

  @root "/workbench"
  @uploads "/_plrl_/uploads"
  @glob_limit 1000
  @grep_limit 200

  @s_ifreg 0o100_000
  @s_ifdir 0o040_000

  @doc "where the workbench filesystem is mounted within the python sandbox"
  def root, do: @root

  @doc "the directory (relative to the tenant root) where prompt attachments are uploaded"
  def uploads, do: @uploads

  @spec enabled?(Workbench.t | binary | nil) :: boolean
  def enabled?(nil), do: false
  def enabled?(_), do: PseudoFS.enabled?()

  @doc "the pseudofs tenant for a workbench"
  @spec tenant(Workbench.t | binary) :: binary
  def tenant(%Workbench{id: id}), do: id
  def tenant(id) when is_binary(id), do: id

  @doc "converts a tenant path to its location within the sandbox"
  @spec virtual(binary) :: binary
  def virtual("/"), do: @root
  def virtual("/" <> _ = path), do: @root <> path

  @doc "monty os callbacks backed by the workbench's pseudofs tenant"
  @spec os(binary) :: %{atom => function}
  def os(tenant) do
    ~w(exists is_file is_dir is_symlink read_text read_bytes write_text write_bytes append_text
       append_bytes open mkdir unlink rmdir iterdir stat rename resolve absolute)a
    |> Map.new(fn fun -> {fun, fn args, kwargs -> handle(tenant, fun, args, kwargs) end} end)
  end

  @doc "sandbox functions for searching the workbench filesystem"
  @spec functions(binary) :: %{binary => function}
  def functions(tenant) do
    %{
      "glob" => fn args, kwargs -> glob(tenant, args, kwargs) end,
      "grep" => fn args, kwargs -> grep(tenant, args, kwargs) end
    }
  end

  defp handle(tenant, fun, [path | rest], kwargs) do
    with {:ok, vpath, fspath} <- resolve(path),
      do: dispatch(tenant, fun, vpath, fspath, rest, kwargs)
  end
  defp handle(_, fun, _, _), do: {:error, :type_error, "#{fun}() requires a path argument"}

  defp dispatch(t, :exists, _, p, _, _), do: bool(PseudoFS.exists(t, p))
  defp dispatch(t, :is_file, _, p, _, _), do: bool(PseudoFS.file?(t, p))
  defp dispatch(t, :is_dir, _, p, _, _), do: bool(PseudoFS.dir?(t, p))
  defp dispatch(_, :is_symlink, _, _, _, _), do: {:ok, false}
  defp dispatch(_, fun, vpath, _, _, _) when fun in [:resolve, :absolute], do: {:ok, vpath}

  defp dispatch(t, :read_text, v, p, _, _), do: PseudoFS.read_text(t, p) |> result(v)

  defp dispatch(t, :read_bytes, v, p, _, _) do
    with {:ok, data} <- PseudoFS.read_bytes(t, p) |> result(v),
      do: {:ok, {:bytes, data}}
  end

  defp dispatch(t, :write_text, v, p, [content | _], _),
    do: PseudoFS.write_text(t, p, to_string(content)) |> result(v)

  defp dispatch(t, :write_bytes, v, p, [content | _], _),
    do: PseudoFS.write_bytes(t, p, bytes(content)) |> result(v)

  defp dispatch(t, :append_text, v, p, [content | _], _) do
    content = to_string(content)
    with {:ok, _} <- PseudoFS.append_text(t, p, content) |> result(v),
      do: {:ok, String.length(content)}
  end

  defp dispatch(t, :append_bytes, v, p, [content | _], _) do
    content = bytes(content)
    with {:ok, _} <- PseudoFS.append_bytes(t, p, content) |> result(v),
      do: {:ok, byte_size(content)}
  end

  defp dispatch(t, :open, v, p, rest, kwargs) do
    mode = List.first(rest) || kwargs["mode"] || "r"
    with {:ok, _} <- PseudoFS.open(t, p, mode) |> result(v),
      do: {:ok, {:file_handle, %{path: v, mode: mode, position: 0}}}
  end

  defp dispatch(t, :mkdir, v, p, _, kwargs) do
    PseudoFS.mkdir(t, p, parents: kwargs["parents"] == true, exist_ok: kwargs["exist_ok"] == true)
    |> result(v)
  end

  defp dispatch(t, :unlink, v, p, _, _), do: PseudoFS.unlink(t, p) |> result(v)
  defp dispatch(t, :rmdir, v, p, _, _), do: PseudoFS.rmdir(t, p) |> result(v)

  defp dispatch(t, :iterdir, v, p, _, _) do
    with {:ok, entries} <- PseudoFS.iterdir(t, p) |> result(v),
      do: {:ok, Enum.map(entries, &{:path, virtual(&1.path)})}
  end

  defp dispatch(t, :stat, v, p, _, _) do
    with {:ok, stat} <- PseudoFS.stat(t, p) |> result(v),
      do: {:ok, stat_result(stat)}
  end

  defp dispatch(t, :rename, v, p, [target | _], _) do
    with {:ok, _, target} <- resolve(target),
         {:ok, renamed} <- PseudoFS.rename(t, p, target) |> result(v),
      do: {:ok, {:path, virtual(renamed)}}
  end

  defp dispatch(_, fun, _, _, _, _),
    do: {:error, :type_error, "invalid arguments for os operation #{fun}"}

  defp glob(tenant, args, kwargs) do
    with {:ok, [pattern, max]} <- arguments(args, kwargs, [{"pattern", nil}, {"max_results", @glob_limit}]),
         {:ok, vpattern, pattern} <- resolve(pattern),
         {:ok, entries} <- PseudoFS.glob(tenant, pattern, max) |> result(vpattern) do
      {:ok, Enum.map(entries, &entry/1)}
    end
  end

  @grep_args [
    {"pattern", nil},
    {"path", @root},
    {"fixed_string", false},
    {"case_insensitive", false},
    {"before_context", 0},
    {"after_context", 0},
    {"max_matches", @grep_limit}
  ]

  defp grep(tenant, args, kwargs) do
    with {:ok, [pattern, path, fixed, ci, before, aft, max]} <- arguments(args, kwargs, @grep_args),
         {:ok, vpath, path} <- resolve(path),
         {:ok, matches} <- PseudoFS.grep(tenant, path, pattern,
                              fixed_string: fixed == true,
                              case_insensitive: ci == true,
                              before_context: before,
                              after_context: aft,
                              max_matches: max
                            ) |> result(vpath) do
      {:ok, Enum.map(matches, &grep_match/1)}
    end
  end

  defp arguments(args, kwargs, spec) do
    {values, _} =
      Enum.map_reduce(spec, args, fn {name, default}, rest ->
        case rest do
          [val | rest] -> {val, rest}
          [] -> {Map.get(kwargs, name, default), []}
        end
      end)

    case Enum.zip(spec, values) |> Enum.find(fn {{_, d}, v} -> is_nil(v) and is_nil(d) end) do
      {{name, _}, _} -> {:error, :type_error, "missing required argument: '#{name}'"}
      nil -> {:ok, values}
    end
  end

  defp entry(%{path: path, name: name, kind: kind}),
    do: %{"path" => virtual(path), "name" => name, "kind" => to_string(kind)}

  defp grep_match(match) do
    %{
      "path" => virtual(match.path),
      "line_number" => match.line_number,
      "line" => match.line,
      "before" => Enum.map(match.before, &grep_line/1),
      "after" => Enum.map(match.after, &grep_line/1)
    }
  end

  defp grep_line(%{line_number: n, text: t}), do: %{"line_number" => n, "text" => t}

  defp stat_result(%StatResponse{kind: kind, mode: mode, size: size} = stat) do
    mode = Bitwise.bor(mode, type_bits(PseudoFS.kind(kind)))
    {:named_tuple, "StatResult", [
      {"st_mode", mode},
      {"st_ino", 0},
      {"st_dev", 0},
      {"st_nlink", if(Bitwise.band(mode, @s_ifdir) != 0, do: 2, else: 1)},
      {"st_uid", 0},
      {"st_gid", 0},
      {"st_size", size},
      {"st_atime", stat.atime},
      {"st_mtime", stat.mtime},
      {"st_ctime", stat.ctime}
    ]}
  end

  defp type_bits(:directory), do: @s_ifdir
  defp type_bits(_), do: @s_ifreg

  defp resolve(path) do
    vpath = normalize(extract(path))
    case vpath do
      @root -> {:ok, vpath, "/"}
      @root <> "/" <> rest -> {:ok, vpath, "/" <> rest}
      _ -> {:error, :permission_error, "#{vpath} is outside the sandbox filesystems, use paths under #{@root} or /scratch"}
    end
  end

  defp extract({:path, p}), do: extract(p)
  defp extract("/" <> _ = p), do: p
  defp extract(p) when is_binary(p), do: Path.join(@root, p)
  defp extract(p), do: to_string(p)

  defp normalize(path) do
    path
    |> String.split("/", trim: true)
    |> Enum.reduce([], fn
      ".", acc -> acc
      "..", [_ | rest] -> rest
      "..", [] -> []
      seg, acc -> [seg | acc]
    end)
    |> Enum.reverse()
    |> Enum.join("/")
    |> then(&"/#{&1}")
  end

  defp bytes({:bytes, b}), do: b
  defp bytes(b) when is_binary(b), do: b

  defp bool({:ok, v}), do: {:ok, v}
  defp bool({:error, err}), do: error(err, nil)

  defp result(:ok, _), do: {:ok, nil}
  defp result({:ok, _} = ok, _), do: ok
  defp result({:error, err}, vpath), do: error(err, vpath)
  defp result({:error, _, _} = err, _), do: err

  defp error(err, vpath) do
    case PseudoFS.error_kind(err) do
      :not_found -> {:error, :file_not_found_error, "[Errno 2] No such file or directory: '#{vpath}'"}
      :already_exists -> {:error, :file_exists_error, "[Errno 17] File exists: '#{vpath}'"}
      :is_directory -> {:error, :is_a_directory_error, "[Errno 21] Is a directory: '#{vpath}'"}
      :not_directory -> {:error, :not_a_directory_error, "[Errno 20] Not a directory: '#{vpath}'"}
      :directory_not_empty -> {:error, :os_error, "[Errno 39] Directory not empty: '#{vpath}'"}
      :invalid_argument -> {:error, :value_error, PseudoFS.error_message(err)}
      :invalid_utf8 -> {:error, :value_error, PseudoFS.error_message(err)}
      :root_operation -> {:error, :permission_error, "operation not permitted on #{@root}"}
      _ -> {:error, :os_error, "workbench filesystem error: #{PseudoFS.error_message(err)}"}
    end
  end
end
