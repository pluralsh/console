defmodule Console.Deployments.Attachments do
  @moduledoc """
  File attachments for workbench and agent prompts.  Uploads are written into the workbench's
  filesystem under `/_plrl_/uploads/<attachment-id>/<filename>` (so the agent can reach them from
  its python sandbox) and recorded as `Attachment` rows linked to the prompt they belong to.
  """
  alias Console.Repo
  alias Console.PseudoFS
  alias Console.AI.Workbench.Filesystem
  alias Console.Schema.Attachment
  alias ReqLLM.Message.ContentPart
  require Logger

  @inline_types ~w(image/png image/jpeg image/gif image/webp)
  @max_inline_bytes 5 * 1024 * 1024
  @max_filename 200

  @doc """
  Uploads files and records them as attachments of the given prompt (eg `%{workbench_job_id: id}`).
  This should be run inside the transaction creating the prompt, so attachment rows roll back with it.
  """
  @spec create([Plug.Upload.t] | nil, binary, map) :: {:ok, [Attachment.t]} | {:error, term}
  def create(nil, _, _), do: {:ok, []}
  def create([], _, _), do: {:ok, []}
  def create(uploads, workbench_id, assocs) when is_list(uploads) do
    case PseudoFS.enabled?() do
      true -> upload_all(uploads, workbench_id, assocs)
      false -> {:error, "file attachments require an object store to be configured"}
    end
  end

  @doc "reassigns a queued prompt's attachments to the activity created when it's dequeued"
  @spec move_queued(binary, map) :: {:ok, integer}
  def move_queued(queued_prompt_id, %{id: activity_id, workbench_job_id: job_id}) do
    {count, _} =
      Attachment.for_queued_prompt(queued_prompt_id)
      |> Repo.update_all(set: [workbench_job_activity_id: activity_id, workbench_job_id: job_id])

    {:ok, count}
  end

  @doc """
  Builds the user message content for a prompt with attachments.  Supported images are inlined
  as content parts (base64 encoded by the provider), and every attachment is listed with its
  location in the python sandbox.
  """
  @spec prompt_content(binary, [Attachment.t] | term) :: binary | [ContentPart.t]
  def prompt_content(prompt, [_ | _] = attachments) do
    images = Enum.flat_map(attachments, &inline/1)
    [ContentPart.text(prompt <> hint(attachments, images)) | Enum.map(images, &elem(&1, 1))]
  end
  def prompt_content(prompt, _), do: prompt

  defp inline(%Attachment{filetype: type, size: size, workbench_id: wid, path: path} = att)
       when type in @inline_types and is_integer(size) and size <= @max_inline_bytes do
    case PseudoFS.read_bytes(wid, path) do
      {:ok, data} -> [{att.path, ContentPart.image(data, type)}]
      err ->
        Logger.warning("failed to read attachment #{path}: #{inspect(err)}")
        []
    end
  end
  defp inline(_), do: []

  defp hint(attachments, images) do
    inlined = MapSet.new(images, &elem(&1, 0))

    attachments
    |> Enum.map(fn att ->
      description = Enum.reject([att.filetype, size(att.size)], &is_nil/1) |> Enum.join(", ")
      note = if MapSet.member?(inlined, att.path), do: " (included inline)", else: ""
      "- #{file_tag(Filesystem.virtual(att.path), description)}#{note}"
    end)
    |> Enum.join("\n")
    |> then(&"\n\nThe user attached the following files, which can be read from the python sandbox. When you mention one, reuse its tag exactly as written here:\n#{&1}")
  end

  # the same <plrl-file> chip agents are asked to use when referencing files in their output
  defp file_tag(path, description),
    do: ~s(<plrl-file path="#{escape_attr(path)}" description="#{escape_attr(description)}"></plrl-file>)

  defp escape_attr(value) do
    value
    |> String.replace("&", "&amp;")
    |> String.replace("\"", "&quot;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
  end

  defp size(n) when is_integer(n) and n >= 1024 * 1024, do: "#{Float.round(n / (1024 * 1024), 1)} MB"
  defp size(n) when is_integer(n) and n >= 1024, do: "#{Float.round(n / 1024, 1)} KB"
  defp size(n) when is_integer(n), do: "#{n} B"
  defp size(_), do: nil

  defp upload_all(uploads, wid, assocs) do
    Enum.reduce_while(uploads, {:ok, []}, fn upload, {:ok, acc} ->
      case upload(upload, wid, assocs) do
        {:ok, att} -> {:cont, {:ok, [att | acc]}}
        err ->
          cleanup(wid, acc)
          {:halt, err}
      end
    end)
    |> case do
      {:ok, atts} -> {:ok, Enum.reverse(atts)}
      err -> err
    end
  end

  defp upload(%Plug.Upload{filename: filename, path: local} = upload, wid, assocs) do
    id = Piazza.Ecto.UUID.generate_monotonic()
    name = sanitize(filename)
    path = Path.join([Filesystem.uploads(), id, name])

    with {:ok, size} <- PseudoFS.upload(wid, path, local) |> format() do
      %Attachment{}
      |> Attachment.changeset(Map.merge(assocs, %{
        id: id,
        filename: name,
        filetype: content_type(upload, name),
        path: path,
        size: size,
        workbench_id: wid
      }))
      |> Repo.insert()
      |> case do
        {:ok, att} -> {:ok, att}
        err ->
          PseudoFS.delete(wid, Path.dirname(path))
          err
      end
    end
  end
  defp upload(_, _, _), do: {:error, "attachments must be file uploads"}

  defp cleanup(wid, atts) do
    Enum.each(atts, &PseudoFS.delete(wid, Path.dirname(&1.path)))
  end

  defp content_type(%Plug.Upload{content_type: type}, _) when is_binary(type) and type not in ["", "application/octet-stream"],
    do: type
  defp content_type(_, name), do: MIME.from_path(name)

  defp sanitize(filename) when is_binary(filename) do
    filename
    |> Path.basename()
    |> String.replace(~r/[\x00-\x1F\x7F\/\\]/u, "_")
    |> String.trim()
    |> String.slice(0, @max_filename)
    |> case do
      name when name in ["", ".", ".."] -> "file"
      name -> name
    end
  end
  defp sanitize(_), do: "file"

  defp format({:error, err}), do: {:error, "failed to upload attachment: #{PseudoFS.error_message(err)}"}
  defp format(res), do: res
end
