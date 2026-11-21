defmodule Console.Devboxes.Acp do
  @moduledoc """
  Normalizes ACP values (verbatim camelCase JSON from the agent, or snake_case maps decoded from `devbox.v1`
  protos) into the atom-keyed shapes the GraphQL transcript types resolve.  Unknown variants are kept, with their
  raw JSON, rather than dropped, so newer ACP versions degrade gracefully.
  """

  @entity_types ~w(user_message agent_message agent_thought session_message tool_call plan terminal compaction)a
  @message_types ~w(user_message agent_message agent_thought)a

  @doc """
  Builds an ACP prompt (a list of content blocks) from a string or block attributes.
  """
  @spec prompt(binary | [map]) :: [map]
  def prompt(text) when is_binary(text), do: [%{"type" => "text", "text" => text}]
  def prompt(blocks) when is_list(blocks), do: Enum.map(blocks, &prompt_block/1)

  defp prompt_block(%{type: :text, text: text}), do: %{"type" => "text", "text" => text}
  defp prompt_block(%{type: :image} = b),
    do: drop_nils(%{"type" => "image", "data" => b[:data], "mimeType" => b[:mime_type], "uri" => b[:uri]})
  defp prompt_block(%{type: :audio} = b),
    do: drop_nils(%{"type" => "audio", "data" => b[:data], "mimeType" => b[:mime_type]})
  defp prompt_block(%{type: :resource_link} = b),
    do: drop_nils(%{"type" => "resource_link", "uri" => b[:uri], "name" => b[:name] || b[:uri], "mimeType" => b[:mime_type]})
  defp prompt_block(%{type: :resource} = b) do
    %{
      "type" => "resource",
      "resource" => drop_nils(%{"uri" => b[:uri], "mimeType" => b[:mime_type], "text" => b[:text], "blob" => b[:data]})
    }
  end

  @doc """
  Normalizes a `Control.get_timeline` page.
  """
  @spec timeline(map) :: map
  def timeline(page) do
    %{
      entities: Enum.map(get(page, :entities) || [], &entity/1),
      delta_offset: get(page, :delta_offset) || 0,
      has_more: !!get(page, :has_more)
    }
  end

  @doc """
  Normalizes an archived or settling ACP entity (`AcpEntity`).
  """
  @spec entity(map | nil) :: map | nil
  def entity(nil), do: nil
  def entity(e) do
    key = get(e, :key) || %{}
    type = entity_type(get(key, :type) || get(e, :type))
    payload = decode(get(e, :acp_json) || get(e, :payload) || %{})

    %{
      id: get(key, :id) || get(e, :id),
      session_id: get(key, :session_id) || get(e, :session_id),
      type: type,
      position: get(e, :position),
      revision: get(e, :revision),
      settled: !!get(e, :settled),
      created_at: timestamp(get(e, :created_at)),
      updated_at: timestamp(get(e, :updated_at)),
      raw: as_map(payload)
    }
    |> Map.merge(typed(type, payload))
  end

  defp typed(type, p) when type in @message_types, do: %{message: message(p)}
  defp typed(:session_message, p) do
    %{session_message: %{
      message_id: get(p, :message_id),
      from_session_id: get(p, :from_session_id),
      to_session_id: get(p, :to_session_id),
      content: blocks(get(p, :content)),
      meta: get(p, :meta)
    }}
  end
  defp typed(:tool_call, p), do: %{tool_call: tool_call(p)}
  defp typed(:plan, p) do
    %{plan: %{
      plan_id: get(p, :plan_id),
      entries: Enum.map(get(p, :entries) || [], &%{content: get(&1, :content), priority: get(&1, :priority), status: get(&1, :status)}),
      meta: get(p, :meta)
    }}
  end
  defp typed(:terminal, p) do
    exit_status = get(p, :exit_status) || %{}
    %{terminal: %{
      terminal_id: get(p, :terminal_id),
      command: get(p, :command),
      args: get(p, :args) || [],
      cwd: get(p, :cwd),
      output: get(p, :output),
      truncated: !!get(p, :truncated),
      exit_code: get(exit_status, :exit_code),
      signal: get(exit_status, :signal),
      meta: get(p, :meta)
    }}
  end
  defp typed(:compaction, p) do
    %{compaction: %{
      compaction_id: get(p, :compaction_id),
      status: get(p, :status),
      summary: blocks(get(p, :summary)),
      meta: get(p, :meta)
    }}
  end
  defp typed(_, _), do: %{}

  @doc """
  Normalizes a message entity (user, agent or thought).
  """
  @spec message(map) :: map
  def message(p) do
    sent_by = get(p, :sent_by)
    %{
      message_id: get(p, :message_id),
      content: blocks(get(p, :content)),
      prompt_id: get(p, :prompt_id),
      sent_by_id: sent_by && get(sent_by, :user_id),
      meta: get(p, :meta)
    }
  end

  @doc """
  Normalizes a tool call.
  """
  @spec tool_call(map) :: map
  def tool_call(p) do
    %{
      tool_call_id: get(p, :tool_call_id),
      title: get(p, :title),
      kind: get(p, :kind),
      status: get(p, :status),
      content: Enum.map(get(p, :content) || [], &tool_call_content/1),
      locations: Enum.map(get(p, :locations) || [], &%{path: get(&1, :path), line: get(&1, :line)}),
      raw_input: as_map(get(p, :raw_input)),
      raw_output: as_map(get(p, :raw_output)),
      meta: get(p, :meta)
    }
  end

  @doc """
  Normalizes a list of content blocks (a single block is wrapped).
  """
  @spec blocks(term) :: [map]
  def blocks(nil), do: []
  def blocks(l) when is_list(l), do: Enum.map(l, &block/1)
  def blocks(%{} = b), do: [block(b)]

  @doc """
  Normalizes one ACP `ContentBlock`, by its `type` or by the populated proto oneof.
  """
  @spec block(map) :: map
  def block(b) do
    case {block_type(b), b} do
      {"text", _} -> %{type: :text, text: get(inner(b, :text), :text), annotations: get(inner(b, :text), :annotations)}
      {"image", _} ->
        i = inner(b, :image)
        %{type: :image, data: get(i, :data), mime_type: get(i, :mime_type), uri: get(i, :uri)}
      {"audio", _} ->
        a = inner(b, :audio)
        %{type: :audio, data: get(a, :data), mime_type: get(a, :mime_type)}
      {"resource_link", _} ->
        l = inner(b, :resource_link)
        %{
          type: :resource_link,
          uri: get(l, :uri),
          name: get(l, :name),
          title: get(l, :title),
          description: get(l, :description),
          mime_type: get(l, :mime_type),
          size: get(l, :size)
        }
      {"resource", _} ->
        r = get(inner(b, :resource), :resource) || %{}
        r = get(r, :text_resource) || get(r, :blob_resource) || r
        %{type: :resource, uri: get(r, :uri), mime_type: get(r, :mime_type), text: get(r, :text), blob: get(r, :blob)}
      {type, _} -> %{type: :unknown, variant: type, raw: b}
    end
  end

  defp block_type(b) do
    case get(b, :type) do
      t when is_binary(t) -> t
      t when is_atom(t) and not is_nil(t) -> Atom.to_string(t)
      _ -> Enum.find(~w(text image audio resource_link resource), &(get(b, String.to_atom(&1)) != nil))
    end
  end

  defp inner(b, key) do
    case get(b, key) do
      %{} = inner -> inner
      _ -> b
    end
  end

  @doc """
  Normalizes one `ToolCallContent`.
  """
  @spec tool_call_content(map) :: map
  def tool_call_content(c) do
    case content_type(c) do
      "content" -> %{type: :content, content: block(get(c, :content) || get(c, :block) || %{})}
      "diff" ->
        d = inner(c, :diff)
        %{type: :diff, path: get(d, :path), old_text: get(d, :old_text), new_text: get(d, :new_text)}
      "terminal" -> %{type: :terminal, terminal_id: get(inner(c, :terminal), :terminal_id)}
      type -> %{type: :unknown, variant: type, raw: c}
    end
  end

  defp content_type(c) do
    case get(c, :type) do
      t when is_binary(t) -> t
      _ ->
        # a decoded proto names the content variant `block`
        if get(c, :block) != nil,
          do: "content",
          else: Enum.find(~w(content diff terminal), &(get(c, String.to_atom(&1)) != nil))
    end
  end

  @doc """
  The entity type atom for a proto enum or ACP string.
  """
  @spec entity_type(term) :: atom
  def entity_type(t) when t in @entity_types, do: t
  def entity_type(t) when is_atom(t) and not is_nil(t) do
    t |> Atom.to_string() |> String.downcase() |> String.replace_prefix("entity_type_", "") |> entity_type()
  end
  def entity_type(t) when is_binary(t) do
    Enum.find(@entity_types, :unknown, &(Atom.to_string(&1) == Macro.underscore(t)))
  end
  def entity_type(_), do: :unknown

  @doc """
  Decodes raw ACP JSON if it hasn't been already.
  """
  @spec decode(term) :: map | list | nil
  def decode(json) when is_binary(json) and byte_size(json) > 0 do
    case Jason.decode(json) do
      {:ok, val} -> val
      _ -> %{"raw" => json}
    end
  end
  def decode(""), do: nil
  def decode(val), do: val

  @doc """
  Reads a key from an atom-keyed snake_case map, or a string-keyed snake_case or camelCase one.
  """
  @spec get(term, atom) :: term
  def get(%{} = map, key) when is_atom(key) do
    with nil <- Map.get(map, key),
         nil <- Map.get(map, Atom.to_string(key)),
      do: Map.get(map, camelize(key))
  end
  def get(_, _), do: nil

  defp camelize(key) do
    [first | rest] = key |> Atom.to_string() |> String.split("_")
    Enum.join([first | Enum.map(rest, &String.capitalize/1)])
  end

  @doc """
  Parses a DateTime, iso8601 string or `google.protobuf.Timestamp`-shaped map.
  """
  @spec timestamp(term) :: DateTime.t | nil
  def timestamp(%DateTime{} = dt), do: dt
  def timestamp(ts) when is_binary(ts) do
    case DateTime.from_iso8601(ts) do
      {:ok, dt, _} -> dt
      _ -> nil
    end
  end
  def timestamp(%{seconds: s} = ts), do: DateTime.from_unix!(s * 1_000_000_000 + (Map.get(ts, :nanos) || 0), :nanosecond)
  def timestamp(_), do: nil

  @doc """
  Wraps a JSON value that isn't an object, so it can be served as a `Map` scalar.
  """
  @spec as_map(term) :: map | nil
  def as_map(nil), do: nil
  def as_map(%{} = m), do: m
  def as_map(v), do: %{"value" => v}

  defp drop_nils(map), do: Map.reject(map, fn {_, v} -> is_nil(v) end)
end
