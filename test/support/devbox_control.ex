defmodule Console.Devboxes.Control.Test do
  @moduledoc """
  The `Console.Devboxes.Control` used in tests.  Every call succeeds with a minimal result; override with `Mimic.expect`.
  """
  @behaviour Console.Devboxes.Control

  @impl true
  def create_instance(_, _), do: :ok
  @impl true
  def cancel_instance(_), do: :ok
  @impl true
  def suspend_instance(_), do: :ok
  @impl true
  def resume_instance(_), do: :ok
  @impl true
  def snapshot_instance(_, _), do: :ok
  @impl true
  def delete_snapshot(_), do: :ok
  @impl true
  def set_agent_billing(_, _), do: :ok
  @impl true
  def push_credential(_, _), do: :ok
  @impl true
  def create_thread(_, _, _), do: {:ok, %{session_id: "sess-#{Console.rand_alphanum(8)}"}}
  @impl true
  def list_sessions(_), do: {:ok, []}
  @impl true
  def import_thread(_, _), do: :ok
  @impl true
  def resume_thread(_, _), do: :ok
  @impl true
  def close_thread(_, _), do: :ok
  @impl true
  def delete_thread(_, _), do: :ok
  @impl true
  def fork_thread(_, _, _), do: {:ok, %{session_id: "sess-#{Console.rand_alphanum(8)}"}}
  @impl true
  def send_prompt(_, _, _, _), do: :ok
  @impl true
  def cancel_prompt(_, _), do: :ok
  @impl true
  def update_queued_prompt(_, _, _, _, _), do: {:ok, %{updated: true, queued_prompts: []}}
  @impl true
  def set_config_option(_, _, _, _), do: :ok
  @impl true
  def respond(_, _, _), do: :ok
  @impl true
  def list_commands(_, _), do: {:ok, []}
  @impl true
  def get_timeline(_, _, _), do: {:ok, %{entities: [], delta_offset: 0, has_more: false}}
  @impl true
  def get_sessions(_), do: {:ok, []}
  @impl true
  def set_instance_leases(_, _), do: :ok
  @impl true
  def add_repository(_, _), do: :ok
  @impl true
  def list_repositories(_), do: {:ok, []}
  @impl true
  def list_files(_, _, %{query: q}) when is_binary(q), do: {:ok, [%{path: "/home/devbox/api/#{q}.ex", name: "#{q}.ex", type: :file}]}
  def list_files(_, path, %{brief: true}), do: {:ok, [%{path: "/home/devbox/#{path}/lib", name: "lib", type: :directory}]}
  def list_files(_, _, _), do: {:ok, []}
  @impl true
  def read_file(_, path, _), do: {:ok, %{entry: %{path: path, name: Path.basename(path), type: :file}, content: "", sha256: nil, truncated: false, binary: false}}
  @impl true
  def write_file(_, path, content, _),
    do: {:ok, %{entry: %{path: path, name: Path.basename(path), type: :file}, sha256: Base.encode16(:crypto.hash(:sha256, content), case: :lower)}}
  @impl true
  def get_changes(_, _), do: {:ok, []}
  @impl true
  def prepare_pull_request(_, _), do: {:error, "not stubbed"}
  @impl true
  def open_stream(_, kind, opts) do
    {:ok, %{
      stream_id: "stream-#{Console.rand_alphanum(8)}",
      kind: kind,
      daemon_path: "/streams/#{kind}",
      expires_at: Timex.now() |> Timex.shift(minutes: 5),
      subprotocols: [],
      terminal: opts[:terminal_id] && %{terminal_id: opts[:terminal_id]}
    }}
  end
end
