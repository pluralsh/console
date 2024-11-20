defmodule Console.AI.Stream.OpenAI do
  alias Console.AI.Stream, as: AIStream
  require Logger

  def stream(fun, %AIStream{} = stream) do
    build_stream(fun)
    |> Enum.reduce_while([], fn
      %{data: %{"choices" => [%{"delta" => %{"content" => c}} | _]}}, acc ->
        AIStream.publish(stream, c)
        {:cont, [c | acc]}
      {:error, error}, _ -> {:halt, {:error, "OpenAI error: #{inspect(error)}"}}
      _, acc -> {:cont, acc}
    end)
    |> case do
      l when is_list(l) -> {:ok, Enum.reverse(l) |> IO.iodata_to_binary()}
      {:error, _} = err -> err
    end
  end

  defp build_stream(start_fun) do
    Stream.resource(
      start_fun,
      fn
        {:error, %HTTPoison.Error{} = error} -> {[{:error, error}], :error}
        {{:error, err}, _} -> {[{:error, err}], :error}

        {:ok, %HTTPoison.AsyncResponse{}} = resp  -> {[], {resp, ""}}

        {{:ok, %HTTPoison.AsyncResponse{id: id} = res}, acc}  ->
          receive do
            %HTTPoison.AsyncStatus{id: ^id, code: code} when code >= 200 and code < 400 ->
              {[], stream_next(res, acc)}

            %HTTPoison.AsyncStatus{id: ^id, code: code} ->
              {[{:error, "openai error code: #{code}"}], :error}

            # We should be able to tell the difference between an error and the
            # event stream with content-type (text/event-stream), but
            # unfortunately OpenAI doesn't obey the spec.
            %HTTPoison.AsyncHeaders{id: ^id, headers: _headers} ->
              {[], stream_next(res, acc)}

            %HTTPoison.AsyncChunk{chunk: chunk} ->
              {items, remaining} = extract_events(chunk, acc)
              {items, stream_next(res, remaining)}

            %HTTPoison.AsyncEnd{id: ^id} ->
              {:halt, res}
          end
        {:error, _} -> {:halt, :error}
        :error -> {:halt, :error}
      end,
      fn
        %{id: id} -> :hackney.stop_async(id)
        :error -> :ok
      end
    )
  end

  defp stream_next(resp, acc), do: {HTTPoison.stream_next(resp), acc}

  @double_eol ~r/(\r?\n|\r){2}/
  @double_eol_eos ~r/(\r?\n|\r){2}$/

  defp extract_events(evt_data, acc) do
    all_data = acc <> evt_data

    if Regex.match?(@double_eol, all_data) do
      {remaining, lines} = extract_lines(all_data)
      events = process_fields(lines)
      {events, remaining}
    else
      {[], all_data}
    end
  end

  defp extract_lines(data) do
    lines = String.split(data, @double_eol)
    incomplete_line = !Regex.match?(@double_eol_eos, data)
    if incomplete_line, do: lines |> List.pop_at(-1), else: {"", lines}
  end

  defp process_fields(lines) do
    lines
    |> Enum.map(&extract_field/1)
    |> Enum.filter(&data?/1)
    |> Enum.map(&to_json/1)
  end

  defp to_json(field) do
    case field do
      %{data: data} ->
        %{data: Jason.decode!(data)}

      %{eventType: value} ->
        [event_id, data] = String.split(value, "\ndata: ", parts: 2)
        %{event: event_id, data: Jason.decode!(data)}
    end
  end

  defp data?(field) do
    case field do
      %{data: "[DONE]"} -> false
      %{data: _} -> true
      %{eventType: "done\ndata: [DONE]"} -> false
      %{eventType: _} -> true
      _ -> false
    end
  end

  defp extract_field(line) do
    [name | rest] = String.split(line, ":", parts: 2)
    value = Enum.join(rest, "") |> String.replace_prefix(" ", "")

    case name do
      "data" -> %{data: value}
      "event" -> %{eventType: value}
      "id" -> %{lastEventId: value}
      "retry" -> %{retry: value}
      _ -> nil
    end
  end
end
