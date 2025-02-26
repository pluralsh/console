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
end
