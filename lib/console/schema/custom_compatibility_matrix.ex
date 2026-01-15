defmodule Console.Schema.CustomCompatibilityMatrix do
  use Console.Schema.Base
  alias Console.Deployments.Compatibilities.{AddOn, Version, VersionSummary}

  schema "custom_compatibility_matrices" do
    field :name,        :string
    field :icon,        :string
    field :git_url,     :string
    field :readme_url,  :string
    field :release_url, :string

    embeds_many :versions, Version, on_replace: :delete do
      field :version,       :string
      field :chart_version, :string
      field :kube,          {:array, :string}

      embeds_one :summary, Summary, on_replace: :update do
        field :helm_changes,     {:array, :string}
        field :breaking_changes, {:array, :string}
      end
    end

    timestamps()
  end

  def convert(%__MODULE__{} = matrix) do
    %AddOn{
      name: matrix.name,
      icon: matrix.icon,
      git_url: matrix.git_url,
      release_url: matrix.release_url,
      readme_url: matrix.readme_url,
      versions: Enum.map(matrix.versions, &convert/1)
    }
  end

  def convert(%__MODULE__.Version{} = version) do
    %Version{
      version: version.version,
      chart_version: version.chart_version,
      kube: version.kube,
      summary: convert(version.summary)
    }
  end

  def convert(%__MODULE__.Version.Summary{} = summary) do
    %VersionSummary{
      helm_changes: summary.helm_changes,
      breaking_changes: summary.breaking_changes
    }
  end

  def convert(_), do: nil

  @valid ~w(name icon git_url readme_url release_url)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:versions, with: &version_changeset/2)
    |> validate_required([:name])
  end

  def version_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(version chart_version kube)a)
    |> cast_embed(:summary, with: &summary_changeset/2)
    |> validate_required([:version, :kube])
  end

  def summary_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(helm_changes breaking_changes)a)
  end
end
