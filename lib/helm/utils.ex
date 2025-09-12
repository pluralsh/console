defmodule Console.Helm.Utils do
  def clean_vsn("v" <> vsn), do: vsn
  def clean_vsn(vsn), do: vsn

  def sort_versions(charts) do
    {semvers, tags} = Enum.split_with(charts, &is_semver?(&1.version))
    Enum.sort(semvers, &Version.compare(clean_vsn(&1.version), clean_vsn(&2.version)) == :gt) ++ tags
  end

  def is_semver?(tag) when is_binary(tag) do
    clean_vsn(tag)
    |> Version.parse()
    |> case do
      {:ok, _} -> true
      _ -> false
    end
  end
  def is_semver?(_), do: false

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
    |> Enum.find(&matches?(vsn, &1.version))
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
