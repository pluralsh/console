defmodule Console.Deployments.Compatibilities.Utils do
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]

  def proxy_config() do
    case Console.conf(:assets_proxy_url) do
      url when is_binary(url) and byte_size(url) > 0 -> [proxy: url]
      _ -> []
    end
  end

  @doc "parses a (possibly v-prefixed or major.minor) version, nil when it isn't semver"
  @spec semver(term) :: Version.t | nil
  def semver(vsn) when is_binary(vsn) do
    case Version.parse(clean_version(vsn)) do
      {:ok, parsed} -> parsed
      _ -> nil
    end
  end
  def semver(_), do: nil

  @doc "the parsed version of a matrix entry, using the one cached at load when present"
  def semver_of(%{semver: %Version{} = parsed}), do: parsed
  def semver_of(%{version: vsn}), do: semver(vsn)
  def semver_of(_), do: nil

  @doc """
  The lowest entry newer than `from` whose kube list includes the minor after
  `current`'s. Entries that aren't semver are never candidates.
  """
  def upgrade_candidate(versions, kube, current, from) do
    with %Version{major: maj, minor: min} <- semver(current) do
      floor = semver(from)
      Enum.reduce(versions, nil, fn vsn, best ->
        with %Version{} = parsed <- semver_of(vsn),
             true <- is_nil(floor) or Version.compare(parsed, floor) == :gt,
             true <- supports_kube?(kube.(vsn), maj, min + 1),
             true <- is_nil(best) or Version.compare(parsed, elem(best, 0)) == :lt do
          {parsed, vsn}
        else
          _ -> best
        end
      end)
      |> case do
        {_, vsn} -> vsn
        nil -> nil
      end
    else
      _ -> nil
    end
  end

  @doc "whether a kube list names `major.minor`, however the entries are spelled (1.30, v1.30, 1.30.0)"
  def supports_kube?(kube, maj, min) when is_list(kube) do
    exact = "#{maj}.#{min}"
    Enum.any?(kube, fn
      ^exact -> true
      vsn -> match?(%Version{major: ^maj, minor: ^min}, semver(vsn))
    end)
  end
  def supports_kube?(_, _, _), do: false

  def stringify(v) when is_binary(v) or is_nil(v), do: v
  def stringify(v) when is_number(v), do: to_string(v)
  def stringify(v), do: v

  @doc "maps the map entries of a decoded list, dropping anything malformed"
  def map_list(l, fun) when is_list(l), do: for(%{} = attrs <- l, do: fun.(attrs))
  def map_list(_, _), do: nil

  def later?(vsn1, vsn2) do
    with {:ok, vsn1} <- Version.parse(clean_version(vsn1)),
         {:ok, vsn2} <- Version.parse(clean_version(vsn2)) do
      case Version.compare(vsn1, vsn2) do
        :gt -> true
        :eq -> true
        _ -> false
      end
    else
      _ -> false
    end
  end

  @spec next_version(binary) :: {:ok, binary} | Console.error
  def next_version(current_version) when is_binary(current_version) do
    with {:ok, %{major: maj, minor: min}} <- Version.parse(clean_version(current_version)) do
      {:ok, "#{maj}.#{min + 1}"}
    else
      _ -> {:error, "invalid semver #{current_version}"}
    end
  end
  def next_version(_), do: {:error, "no version provided"}

  def blocking?(kube_vsns, kube_vsn, inc \\ 1)
  def blocking?(kube_vsns, kube_vsn, inc) when is_list(kube_vsns) do
    with {:ok, %{major: maj, minor: min}} <- Version.parse(clean_version(kube_vsn)) do
      minor = min + inc
      Enum.map(kube_vsns, &clean_version/1)
      |> Enum.all?(fn kube ->
        case Version.parse(kube) do
          {:ok, %{major: ^maj, minor: ^minor}} -> false
          _ -> true
        end
      end)
    else
      _ -> true
    end
  end
  def blocking?(_, _, _), do: false
end
