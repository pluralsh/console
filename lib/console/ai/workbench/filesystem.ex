defmodule Console.AI.Workbench.Filesystem do
  @moduledoc """
  Exposes a workbench's pseudofs tenant to the python sandbox.  The tenant root is mounted at
  `/workbench`, implementing the os callbacks monty uses for `pathlib` and `open`, alongside `glob`,
  `grep`, csv/yaml parsers and archive extraction, which monty doesn't natively support.
  """
  alias Console.PseudoFS
  alias Console.AI.Workbench.Filesystem.{Archives, Formats}
  alias Console.Schema.Workbench
  alias Pseudofs.V1.StatResponse

  @root "/workbench"
  @uploads "/_plrl_/uploads"
  @glob_limit 1000
  @grep_limit 200
  @csv_limit 10_000

  @s_ifreg 0o100_000
  @s_ifdir 0o040_000

  @doc "where the workbench filesystem is mounted within the python sandbox"
  def root, do: @root

  @doc "the directory (relative to the tenant root) where prompt attachments are uploaded"
  def uploads, do: @uploads

  @spec enabled?(Workbench.t | binary | nil) :: boolean
  def enabled?(nil), do: false
  def enabled?(_), do: PseudoFS.enabled?()

  @external_resource Console.priv_filename("prompts/workbench/filesystem_knowledge.md")
  @knowledge_prompt Console.priv_file!("prompts/workbench/filesystem_knowledge.md")

  @doc "system prompt guidance on using the filesystem as the workbench's knowledge base, empty when it isn't configured"
  @spec knowledge_prompt() :: binary
  def knowledge_prompt() do
    case PseudoFS.enabled?() do
      true -> @knowledge_prompt
      false -> ""
    end
  end

  @doc "the pseudofs tenant for a workbench"
  @spec tenant(Workbench.t | binary) :: binary
  def tenant(%Workbench{id: id}), do: id
  def tenant(id) when is_binary(id), do: id

  @doc "converts a tenant path to its location within the sandbox"
  @spec virtual(binary) :: binary
  def virtual("/"), do: @root
  def virtual("/" <> _ = path), do: @root <> path

  @doc "converts a sandbox path (absolute under `/workbench`, or relative to it) to a tenant path"
  @spec tenant_path(binary) :: {:ok, binary} | {:error, binary}
  def tenant_path(path) when is_binary(path) do
    case resolve(path) do
      {:ok, _, fspath} -> {:ok, fspath}
      {:error, _, msg} -> {:error, msg}
    end
  end

  @doc "monty os callbacks backed by the workbench's pseudofs tenant"
  @spec os(binary) :: %{atom => function}
  def os(tenant) do
    ~w(exists is_file is_dir is_symlink read_text read_bytes write_text write_bytes append_text
       append_bytes open mkdir unlink rmdir iterdir stat rename resolve absolute)a
    |> Map.new(fn fun -> {fun, fn args, kwargs -> handle(tenant, fun, args, kwargs) end} end)
  end

  @doc "sandbox functions for searching the workbench filesystem and parsing structured files"
  @spec functions(binary) :: %{binary => function}
  def functions(tenant) do
    %{
      "glob" => fn args, kwargs -> glob(tenant, args, kwargs) end,
      "grep" => fn args, kwargs -> grep(tenant, args, kwargs) end,
      "read_csv" => fn args, kwargs -> read_csv(tenant, args, kwargs) end,
      "write_csv" => fn args, kwargs -> write_csv(tenant, args, kwargs) end,
      "read_yaml" => fn args, kwargs -> read_yaml(tenant, args, kwargs) end,
      "extract_archive" => fn args, kwargs -> extract_archive(tenant, args, kwargs) end
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

  @read_csv_args [
    {"path", :optional},
    {"text", :optional},
    {"delimiter", :optional},
    {"header", true},
    {"max_rows", @csv_limit}
  ]

  defp read_csv(tenant, args, kwargs) do
    with {:ok, [path, text, delim, header, max]} <- arguments(args, kwargs, @read_csv_args),
         {:ok, text} <- source(tenant, "read_csv", path, text) do
      Formats.parse_csv(text,
        delimiter: present(delim) || Formats.delimiter(present(path) && extract(path)),
        header: header != false,
        max_rows: present(max)
      )
    end
  end

  defp write_csv(tenant, args, kwargs) do
    with {:ok, [path, rows, columns, delim]} <- arguments(args, kwargs, [{"path", nil}, {"rows", nil}, {"columns", :optional}, {"delimiter", :optional}]),
         {:ok, vpath, fspath} <- resolve(path),
         {:ok, csv} <- Formats.encode_csv(rows, present(columns), present(delim) || Formats.delimiter(vpath)),
         {:ok, _} <- PseudoFS.write_text(tenant, fspath, csv) |> result(vpath),
      do: {:ok, vpath}
  end

  defp read_yaml(tenant, args, kwargs) do
    with {:ok, [path, text]} <- arguments(args, kwargs, [{"path", :optional}, {"text", :optional}]),
         {:ok, text} <- source(tenant, "read_yaml", path, text),
      do: Formats.parse_yaml(text)
  end

  defp extract_archive(tenant, args, kwargs) do
    with {:ok, [path, dest]} <- arguments(args, kwargs, [{"path", nil}, {"destination", :optional}]),
         {:ok, vpath, fspath} <- resolve(path),
         {:ok, vdest, fsdest} <- resolve(present(dest) || archive_destination(vpath)),
         {:ok, %StatResponse{size: size}} <- PseudoFS.stat(tenant, fspath) |> result(vpath),
         :ok <- archive_size(size),
         {:ok, data} <- PseudoFS.read_bytes(tenant, fspath) |> result(vpath),
         {:ok, files} <- Archives.extract(vpath, data),
         {:ok, written} <- write_entries(tenant, fsdest, vdest, files) do
      {:ok, %{
        "destination" => vdest,
        "files" => written,
        "file_count" => length(written),
        "total_bytes" => Enum.sum_by(files, &byte_size(elem(&1, 1)))
      }}
    end
  end

  defp archive_destination(vpath) do
    base = Path.basename(vpath)
    name = Regex.replace(~r/\.(zip|tar)$/i, base, "")
    Path.join(Path.dirname(vpath), if(name in ["", base], do: "#{base}-extracted", else: name))
  end

  defp archive_size(size) do
    case size > Archives.max_bytes() do
      true -> {:error, :value_error, "archives larger than #{div(Archives.max_bytes(), 1024 * 1024)}MB can't be extracted"}
      false -> :ok
    end
  end

  defp write_entries(tenant, fsdest, vdest, files) do
    files
    |> Task.async_stream(fn {path, data} ->
      PseudoFS.write_bytes(tenant, Path.join(fsdest, path), data)
      |> result(Path.join(vdest, path))
    end, max_concurrency: 8, timeout: :timer.seconds(30), ordered: true)
    |> Enum.zip(files)
    |> Enum.reduce_while({:ok, []}, fn
      {{:ok, {:ok, _}}, {path, _}}, {:ok, acc} -> {:cont, {:ok, [Path.join(vdest, path) | acc]}}
      {{:ok, {:error, _, _} = err}, _}, _ -> {:halt, err}
      {{:exit, reason}, {path, _}}, _ -> {:halt, {:error, :os_error, "failed to write #{Path.join(vdest, path)}: #{inspect(reason)}"}}
    end)
    |> case do
      {:ok, written} -> {:ok, Enum.reverse(written)}
      err -> err
    end
  end

  defp source(tenant, fun, path, text) do
    case {present(path), present(text)} do
      {nil, text} when is_binary(text) -> {:ok, text}
      {nil, _} -> {:error, :type_error, "#{fun}() requires a path or text argument"}
      {path, _} ->
        with {:ok, vpath, fspath} <- resolve(path),
          do: PseudoFS.read_text(tenant, fspath) |> result(vpath)
    end
  end

  defp present(:optional), do: nil
  defp present(v), do: v

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
