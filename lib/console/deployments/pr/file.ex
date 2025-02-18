defmodule Console.Deployments.Pr.File do
  @extension_blacklist ~w(.tgz .png .jpeg .jpg .gz .tar .zip .tar.gz)

  @type t :: %__MODULE__{sha: binary, contents: binary, filename: binary, patch: binary}

  defstruct [:url, :repo, :title, :sha, :contents, :filename, :patch]

  def new(args) do
    %__MODULE__{
      url: args["url"],
      repo: args["repo"],
      title: args["title"],
      sha: args["sha"],
      contents: args["contents"],
      filename: args["filename"],
      patch: args["patch"]
    }
  end

  def valid?(%__MODULE__{filename: name}), do: Path.extname(name) not in @extension_blacklist

  defimpl Console.AI.Vector.Storable, for: __MODULE__ do
    alias Console.AI.Utils

    def content(%@for{} = file) do
      """
      url: #{file.url}
      title: #{file.title}
      repo: #{file.repo}
      filename: #{file.filename}
      #{Utils.stopword()}
      #{file.contents}
      #{Utils.stopword()}
      #{file.patch}
      """
    end

    def datatype(_), do: "pr_file"
  end
end
