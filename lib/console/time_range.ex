defmodule Console.TimeRange do
  @moduledoc false

  @spec align_range(DateTime.t(), DateTime.t(), binary | pos_integer) ::
          {DateTime.t(), DateTime.t()}
  def align_range(%DateTime{} = start, %DateTime{} = end_t, step) do
    with step_ms when is_integer(step_ms) and step_ms > 0 <- step_milliseconds(step) do
      {floor_timestamp(start, step_ms), ceil_timestamp(end_t, step_ms)}
    else
      _ -> {start, end_t}
    end
  end
  def align_range(start, end_t, _), do: {start, end_t}

  defp step_milliseconds(step) when is_integer(step) and step > 0, do: step * 1_000
  defp step_milliseconds(step) when is_binary(step) do
    with {:ok, duration} <- Console.convert_duration(step) do
      duration
      |> Timex.Duration.to_milliseconds()
      |> round()
    end
  end
  defp step_milliseconds(_), do: nil

  defp floor_timestamp(timestamp, step_ms) do
    timestamp_ms = DateTime.to_unix(timestamp, :millisecond)
    DateTime.from_unix!(timestamp_ms - Integer.mod(timestamp_ms, step_ms), :millisecond)
  end

  defp ceil_timestamp(timestamp, step_ms) do
    timestamp_ms = DateTime.to_unix(timestamp, :millisecond)
    remainder = Integer.mod(timestamp_ms, step_ms)
    aligned_ms = if remainder == 0, do: timestamp_ms, else: timestamp_ms + step_ms - remainder
    DateTime.from_unix!(aligned_ms, :millisecond)
  end
end
