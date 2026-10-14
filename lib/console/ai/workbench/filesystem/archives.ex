defmodule Console.AI.Workbench.Filesystem.Archives do
  @moduledoc """
  Unpacks zip and tar archives in memory.  Extraction runs in a separate process
  with a capped heap (including shared binaries), alongside entry count and size limits, so a
  malicious archive can't exhaust the console's memory.
  """

  @max_entries 1_000
  @max_bytes 100 * 1024 * 1024
  @max_heap_bytes 512 * 1024 * 1024
  @timeout :timer.seconds(45)
  @ignored ~w(__MACOSX .DS_Store)

  @type entry :: {binary, binary}

  def max_bytes(), do: @max_bytes

  @doc """
  Extracts an archive's regular files as `{relative_path, contents}` pairs, using the archive's
  name in error messages.
  """
  @spec extract(binary, binary) :: {:ok, [entry]} | {:error, atom, binary}
  def extract(name, data) when is_binary(data) do
    {pid, ref} = spawn_monitor(fn ->
      Process.flag(:max_heap_size, %{
        size: div(@max_heap_bytes, :erlang.system_info(:wordsize)),
        kill: true,
        error_logger: false,
        include_shared_binaries: true
      })
      exit({:shutdown, unpack(name, data)})
    end)

    receive do
      {:DOWN, ^ref, :process, ^pid, {:shutdown, result}} -> result
      {:DOWN, ^ref, :process, ^pid, :killed} -> limit_error()
      {:DOWN, ^ref, :process, ^pid, reason} -> {:error, :value_error, "failed to extract archive: #{inspect(reason)}"}
    after
      @timeout ->
        Process.exit(pid, :kill)
        {:error, :timeout_error, "extracting the archive took too long"}
    end
  end

  defp unpack(_, <<"PK", 3, 4, _::binary>> = data), do: unzip(data)
  defp unpack(_, <<"PK", 5, 6, _::binary>>), do: {:ok, []}
  defp unpack(name, data) do
    case tar?(data) do
      true -> untar(data)
      false -> {:error, :value_error, "#{Path.basename(name)} is not a zip or tar archive (compressed tarballs aren't supported)"}
    end
  end

  defp unzip(data) do
    with {:ok, listing} <- zip_call(fn -> :zip.list_dir(data) end),
         files = for({:zip_file, _, info, _, _, _} <- listing, elem(info, 2) == :regular, do: elem(info, 1)),
         :ok <- check(length(files), Enum.sum(files)),
         {:ok, files} <- zip_call(fn -> :zip.unzip(data, [:memory]) end),
      do: entries(files)
  end

  defp zip_call(fun) do
    case fun.() do
      {:ok, _} = ok -> ok
      {:error, err} -> {:error, :value_error, "invalid zip archive: #{zip_error(err)}"}
    end
  end

  defp zip_error({:EXIT, _}), do: "corrupt or truncated"
  defp zip_error(err), do: inspect(err)

  defp untar(data) do
    case :erl_tar.extract({:binary, data}, [:memory]) do
      {:ok, files} -> entries(files)
      {:error, err} -> {:error, :value_error, "invalid tar archive: #{inspect(err)}"}
    end
  end

  defp tar?(data), do: byte_size(data) > 262 and binary_part(data, 257, 5) == "ustar"

  defp entries(files) do
    files
    |> Enum.map(fn {name, data} -> {to_string(name), data} end)
    |> Enum.reject(fn {name, _} -> String.ends_with?(name, "/") end)
    |> Enum.flat_map(fn {name, data} ->
      case safe_path(name) do
        nil -> []
        path -> [{path, data}]
      end
    end)
    |> then(fn files ->
      with :ok <- check(length(files), Enum.sum_by(files, &byte_size(elem(&1, 1)))),
        do: {:ok, files}
    end)
  end

  # strips absolute prefixes and parent references, so entries can't escape the destination
  defp safe_path(name) do
    segments =
      name
      |> String.split(["/", "\\"], trim: true)
      |> Enum.reject(&(&1 in [".", ".."]))

    cond do
      segments == [] -> nil
      Enum.any?(segments, &(&1 in @ignored)) -> nil
      true -> Enum.join(segments, "/")
    end
  end

  defp check(count, _) when count > @max_entries,
    do: {:error, :value_error, "archives can contain at most #{@max_entries} files, found #{count}"}
  defp check(_, size) when size > @max_bytes, do: limit_error()
  defp check(_, _), do: :ok

  defp limit_error(),
    do: {:error, :value_error, "archives can extract to at most #{div(@max_bytes, 1024 * 1024)}MB"}
end
