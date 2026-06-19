defmodule Console.Deployments.Observer.Poller.Renovate do
  alias Console.Schema.Observer

  defmodule Parsed do
    defstruct major: 0,
              minor: 0,
              patch: 0,
              build: 0,
              revision: 0,
              prerelease: nil,
              compatibility: nil

    @type t :: %__MODULE__{
            major: non_neg_integer,
            minor: non_neg_integer,
            patch: non_neg_integer,
            build: non_neg_integer,
            revision: non_neg_integer,
            prerelease: binary | nil,
            compatibility: binary | nil
          }
  end

  @numeric ~w(major minor patch build revision)a
  @core ~w(major minor patch)a
  @default_regex ~r/^v?(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<patch>\d+))?(?:[-._]?(?<prerelease>[A-Za-z][0-9A-Za-z.-]*))?$/

  def sort(vsns, %Observer.Target{} = target, last \\ nil) do
    last = parse(last, target)

    vsns
    |> Enum.map(&{&1, parse(&1, target)})
    |> Enum.filter(fn
      {_, {:ok, parsed}} -> eligible?(parsed, target, last)
      _ -> false
    end)
    |> Enum.sort(fn {_, {:ok, left}}, {_, {:ok, right}} -> compare_parsed(left, right) == :gt end)
    |> Enum.map(&elem(&1, 0))
  end

  def compare(next, last, %Observer.Target{} = target) do
    with {:next, {:ok, next}} <- {:next, parse(next, target)},
         {:last, {:ok, last}} <- {:last, parse(last, target)},
         true <- compatible?(next, last) do
      compare_parsed(next, last)
    else
      {:next, _} -> :lt
      {:last, _} -> :gt
      false -> :lt
    end
  end

  def parse(vsn, %Observer.Target{} = target) when is_binary(vsn) do
    with {:ok, regex} <- regex(target),
         captures when map_size(captures) > 0 <- Regex.named_captures(regex, vsn),
         true <- has_core?(captures),
         {:ok, %Parsed{} = numbers} <- numbers(captures) do
      {:ok,
       %Parsed{
         numbers
         |
         prerelease: captured(captures, "prerelease"),
         compatibility: captured(captures, "compatibility")
       }}
    else
      _ -> :error
    end
  end
  def parse(_, _), do: :error

  defp regex(%Observer.Target{format: format}) when is_binary(format), do: Regex.compile(format)
  defp regex(_), do: {:ok, @default_regex}

  defp has_core?(captures),
    do: Enum.any?(@core, &(captured(captures, Atom.to_string(&1)) != nil))

  defp numbers(captures) do
    Enum.reduce_while(@numeric, {:ok, %Parsed{}}, fn key, {:ok, acc} ->
      case captured(captures, Atom.to_string(key)) do
        nil -> {:cont, {:ok, acc}}
        value -> parse_number(acc, key, value)
      end
    end)
  end

  defp parse_number(acc, key, value) do
    case Integer.parse(value) do
      {int, ""} -> {:cont, {:ok, Map.put(acc, key, int)}}
      _ -> {:halt, :error}
    end
  end

  defp captured(captures, key) do
    case Map.get(captures, key) do
      value when is_binary(value) and value != "" -> value
      _ -> nil
    end
  end

  defp eligible?(parsed, %Observer.Target{renovate: %{ignore_unstable: true}}, last),
    do: stable?(parsed) and compatible_with_last?(parsed, last)
  defp eligible?(parsed, _, last), do: compatible_with_last?(parsed, last)

  defp compatible_with_last?(parsed, {:ok, last}), do: compatible?(parsed, last)
  defp compatible_with_last?(_, _), do: true

  defp compatible?(_next, %Parsed{compatibility: nil}), do: true
  defp compatible?(%Parsed{compatibility: compatibility}, %Parsed{compatibility: compatibility}), do: true
  defp compatible?(_, _), do: false

  defp stable?(%Parsed{prerelease: nil}), do: true
  defp stable?(_), do: false

  defp compare_parsed(left, right) do
    case compare_numbers(left, right) do
      :eq -> compare_prerelease(left.prerelease, right.prerelease)
      order -> order
    end
  end

  defp compare_numbers(left, right) do
    Enum.reduce_while(@numeric, :eq, fn key, :eq ->
      cond do
        Map.fetch!(left, key) > Map.fetch!(right, key) -> {:halt, :gt}
        Map.fetch!(left, key) < Map.fetch!(right, key) -> {:halt, :lt}
        true -> {:cont, :eq}
      end
    end)
  end

  defp compare_prerelease(nil, nil), do: :eq
  defp compare_prerelease(nil, _), do: :gt
  defp compare_prerelease(_, nil), do: :lt
  defp compare_prerelease(left, right) when left > right, do: :gt
  defp compare_prerelease(left, right) when left < right, do: :lt
  defp compare_prerelease(_, _), do: :eq
end
