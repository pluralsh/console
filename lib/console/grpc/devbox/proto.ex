defmodule Console.GRPC.Devbox.Proto do
  @moduledoc """
  Converts between `devbox.v1` proto structs and the plain maps `Console.Devboxes` works with.

  Decoding (`to_map/1`) turns structs into atom-keyed maps, flattens oneofs into their variant key
  (`%{request: {:permission, p}}` becomes `%{permission: p}`), well-known types into Elixir terms and empty strings
  into nil, so proto3 defaults read as absent.
  """
  alias Google.Protobuf.{Duration, ListValue, Struct, Timestamp, Value}

  @spec to_map(term) :: term
  def to_map(nil), do: nil
  def to_map(""), do: nil
  def to_map(%Timestamp{} = ts), do: Google.Protobuf.to_datetime(ts)
  def to_map(%Duration{seconds: s}), do: s
  def to_map(%Struct{} = s), do: Google.Protobuf.to_map(s)
  def to_map(%Value{kind: {:struct_value, s}}), do: to_map(s)
  def to_map(%Value{kind: {:list_value, %ListValue{values: vs}}}), do: Enum.map(vs, &to_map/1)
  def to_map(%Value{kind: {:null_value, _}}), do: nil
  def to_map(%Value{kind: {_, v}}), do: v
  def to_map(%Value{}), do: nil
  def to_map(%_{} = struct) do
    struct
    |> Map.from_struct()
    |> Map.delete(:__unknown_fields__)
    |> Enum.reduce(%{}, fn
      {_, {variant, val}}, acc when is_atom(variant) -> Map.put(acc, variant, to_map(val))
      {k, v}, acc -> Map.put(acc, k, to_map(v))
    end)
  end
  def to_map(%{} = map), do: Map.new(map, fn {k, v} -> {k, to_map(v)} end)
  def to_map(l) when is_list(l), do: Enum.map(l, &to_map/1)
  def to_map(v), do: v

  @doc "A `Google.Protobuf.Timestamp` for a `DateTime` (or an iso8601 string)"
  @spec timestamp(DateTime.t | binary | nil) :: Timestamp.t | nil
  def timestamp(nil), do: nil
  def timestamp(%DateTime{} = dt), do: Google.Protobuf.from_datetime(dt)
  def timestamp(%NaiveDateTime{} = dt), do: timestamp(DateTime.from_naive!(dt, "Etc/UTC"))
  def timestamp(ts) when is_binary(ts) do
    case DateTime.from_iso8601(ts) do
      {:ok, dt, _} -> timestamp(dt)
      _ -> nil
    end
  end

  @spec duration(integer | nil) :: Duration.t | nil
  def duration(nil), do: nil
  def duration(secs) when is_integer(secs), do: %Duration{seconds: secs}

  @doc "A `Google.Protobuf.Struct` for any json-encodable map"
  @spec struct(map | nil) :: Struct.t | nil
  def struct(nil), do: nil
  def struct(map) when map_size(map) == 0, do: nil
  def struct(%{} = map), do: map |> Jason.encode!() |> Jason.decode!() |> Google.Protobuf.from_map()

  @doc """
  The proto enum atom for a plain value, eg `enum(:running, Devbox.V1.InstanceStatus)` is
  `:INSTANCE_STATUS_RUNNING`.  Unknown values become the zero (`_UNSPECIFIED`) member.
  """
  @spec enum(atom | binary | nil, module) :: atom
  def enum(nil, mod), do: mod.key(0)
  def enum(val, mod) do
    unspecified = Atom.to_string(mod.key(0))
    prefix = String.replace_suffix(unspecified, "UNSPECIFIED", "")
    key = prefix <> String.upcase(to_string(val))
    case Enum.find(Map.keys(mod.mapping()), &(Atom.to_string(&1) == key)) do
      nil -> mod.key(0)
      atom -> atom
    end
  end

  @doc "Empty string for nil, for proto3 string fields"
  @spec str(term) :: binary
  def str(nil), do: ""
  def str(v) when is_binary(v), do: v
  def str(v), do: to_string(v)
end
