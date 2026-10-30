defmodule Console.Helm.Utils do
  def clean_vsn("v" <> vsn), do: vsn
  def clean_vsn(vsn), do: vsn

  @doc "semver versions newest first, followed by non-semver tags in their original order"
  def sort_versions(charts) do
    {semvers, tags} = Enum.reduce(charts, {[], []}, fn chart, {semvers, tags} ->
      case parse(chart.version) do
        {:ok, vsn} -> {[{vsn, chart} | semvers], tags}
        _ -> {semvers, [chart | tags]}
      end
    end)

    semvers
    |> Enum.sort_by(&elem(&1, 0), {:desc, Version})
    |> Enum.map(&elem(&1, 1))
    |> Enum.concat(Enum.reverse(tags))
  end

  def is_semver?(tag) when is_binary(tag), do: match?({:ok, _}, parse(tag))
  def is_semver?(_), do: false

  defp parse(tag) when is_binary(tag), do: Version.parse(clean_vsn(tag))
  defp parse(_), do: :error

  def compare_versions(_, nil), do: :gt
  def compare_versions(vsn1, vsn2) do
    with {:left, {:ok, vsn1}} <- {:left, Version.parse(clean_vsn(vsn1))},
         {:right, {:ok, vsn2}} <- {:right, Version.parse(clean_vsn(vsn2))} do
      Version.compare(vsn1, vsn2)
    else
      {:left, _} -> :lt
      {:right, _} -> :gt
      _ -> :eq
    end
  end

  def match_version(charts, vsn) do
    sort_versions(charts)
    |> match_sorted(vsn)
  end

  @doc "like match_version/2, for charts already ordered by sort_versions/1"
  def match_sorted(charts, vsn) do
    pattern = wildcard(vsn)
    Enum.find(charts, &(is_binary(&1.version) and Regex.match?(pattern, &1.version)))
  end

  def has_wildcard?(vsn) do
    String.split(vsn, ".")
    |> Enum.any?(& &1 in ["*", "x"])
  end

  def matches?(pattern, vsn) do
    Regex.match?(wildcard(pattern), vsn)
  end

  def wildcard(pattern) do
    pattern
    |> String.split(~r/[\*x]/)
    |> Enum.map(&Regex.escape/1)
    |> Enum.join(".+")
    |> Regex.compile!()
  end
end
