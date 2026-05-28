defmodule Console.Uploads.Storage do
  @behaviour Waffle.StorageBehavior

  require Logger

  @impl true
  def put(definition, version, {file, scope} = file_and_scope) do
    storage = configured_storage()

    case storage.put(definition, version, file_and_scope) do
      {:error, reason} = error ->
        Logger.error("failed to store upload",
          storage: inspect(storage),
          version: version,
          file_name: file.file_name,
          storage_dir: definition.storage_dir(version, file_and_scope),
          scope: inspect_scope(scope),
          reason: inspect(reason)
        )

        error

      result ->
        result
    end
  rescue
    e ->
      Logger.error("failed to store upload",
        version: version,
        file_name: file.file_name,
        storage_dir: safe_storage_dir(definition, version, file_and_scope),
        scope: inspect_scope(scope),
        error: Exception.message(e)
      )

      reraise e, __STACKTRACE__
  end

  @impl true
  def url(definition, version, file_and_scope),
    do: configured_storage().url(definition, version, file_and_scope)

  def url(definition, version, file_and_scope, options),
    do: configured_storage().url(definition, version, file_and_scope, options)

  @impl true
  def delete(definition, version, file_and_scope),
    do: configured_storage().delete(definition, version, file_and_scope)

  defp configured_storage(), do: Application.get_env(:waffle, :storage, Waffle.Storage.S3)

  defp inspect_scope(%{__struct__: module, id: id}), do: %{type: module, id: id}
  defp inspect_scope(scope), do: inspect(scope)

  defp safe_storage_dir(definition, version, file_and_scope) do
    definition.storage_dir(version, file_and_scope)
  rescue
    _ -> nil
  end
end
