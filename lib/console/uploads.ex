defmodule Console.Uploads do
  use Waffle.Definition
  use Waffle.Ecto.Definition
  alias Console.Schema.{AgentRunUpload, Workbench}

  @versions [:original]

  def acl(_, _), do: :private

  # To add a thumbnail version:
  # @versions [:original, :thumb]

  # Override the bucket on a per definition basis:
  # def bucket do
  #   :custom_bucket_name
  # end

  # def bucket({_file, scope}) do
  #   scope.bucket || bucket()
  # end

  @formats ~w(.patch .mp4 .jpeg .json .jsonl .tar.gz)

  def validate({file, _}) do
    filename = String.downcase(file.file_name)

    @formats
    |> Enum.any?(&String.ends_with?(filename, &1))
    |> case do
      true ->
        :ok

      false ->
        {:error,
         "#{file.file_name} invalid file type, required to be one of: #{Enum.join(@formats, ", ")}"}
    end
  end

  # Define a thumbnail transformation:
  # def transform(:thumb, _) do
  #   {:convert, "-strip -thumbnail 250x250^ -gravity center -extent 250x250 -format png", :png}
  # end

  # Override the persisted filenames:
  # def filename(version, _) do
  #   version
  # end

  # Override the storage directory:
  def storage_dir(_version, {_file, %Workbench{id: id}}),
    do: "#{Console.conf(:object_store_path)}/workbenches/uploads/#{id}"

  def storage_dir(_version, {_file, %AgentRunUpload{id: id}}),
    do: "#{Console.conf(:object_store_path)}/agents/uploads/#{id}"

  def __storage, do: Console.Uploads.Storage

  # Provide a default URL if there hasn't been a file uploaded
  # def default_url(version, scope) do
  #   "/images/avatars/default_#{version}.png"
  # end

  def s3_object_headers(_version, {file, _scope}) do
    [content_type: MIME.from_path(file.file_name)]
  end
end
