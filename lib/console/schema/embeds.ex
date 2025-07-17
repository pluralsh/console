defmodule Console.Schema.OCIAuth do
  use Piazza.Ecto.Schema
  alias Piazza.Ecto.EncryptedString

  embedded_schema do
    embeds_one :basic, Basic, on_replace: :update do
      field :username,     :string
      field :password, EncryptedString
    end

    embeds_one :bearer, Bearer, on_replace: :update do
      field :token, EncryptedString
    end

    embeds_one :aws, AWS, on_replace: :update do
      field :access_key,        :string
      field :secret_access_key, EncryptedString
      field :assume_role_arn,   :string
    end

    embeds_one :gcp, GCP, on_replace: :update do
      field :application_credentials, EncryptedString
    end

    embeds_one :azure, Azure, on_replace: :update do
      field :client_id,       :string
      field :client_secret,   EncryptedString
      field :tenant_id,       :string
      field :subscription_id, :string
    end
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_embed(:aws, with: &aws_changeset/2)
    |> cast_embed(:azure, with: &azure_changeset/2)
    |> cast_embed(:gcp, with: &gcp_changeset/2)
    |> cast_embed(:basic, with: &basic_changeset/2)
    |> cast_embed(:bearer, with: &bearer_changeset/2)
  end

  defp aws_changeset(model, attrs), do: cast(model, attrs, ~w(assume_role_arn access_key secret_access_key)a)

  defp azure_changeset(model, attrs), do: cast(model, attrs, ~w(client_id client_secret tenant_id subscription_id)a)

  defp gcp_changeset(model, attrs), do: cast(model, attrs, ~w(application_credentials)a)

  defp basic_changeset(model, attrs), do: cast(model, attrs, ~w(username password)a)

  defp bearer_changeset(model, attrs), do: cast(model, attrs, ~w(token)a)
end

defmodule Console.Schema.DiffNormalizer do
  use Piazza.Ecto.Schema

  embedded_schema do
    field :group,         :string
    field :kind,          :string
    field :name,          :string
    field :namespace,     :string
    field :backfill,      :boolean, default: false
    field :json_pointers, {:array, :string}
  end

  @valid ~w(json_pointers group kind name namespace backfill)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
  end
end

defmodule Console.Schema.Metadata do
  use Piazza.Ecto.Schema

  embedded_schema do
    field :labels,      :map
    field :annotations, :map
  end

  @valid ~w(labels annotations)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
  end
end

defmodule Console.Schema.Configuration do
  use Piazza.Ecto.Schema

  defenum Type,
    string: 0,
    int: 1,
    bool: 2,
    domain: 3,
    bucket: 4,
    file: 5,
    function: 6,
    password: 7,
    enum: 8,
    cluster: 9,
    project: 10,
    group: 11,
    user: 12,
    flow: 13

  defenum UniqScope, project: 0, cluster: 1

  defmodule Condition do
    use Piazza.Ecto.Schema

    defenum Operation, not: 0, gt: 1, lt: 2, eq: 3, gte: 4, lte: 5, prefix: 6, suffix: 7

    embedded_schema do
      field :field,     :string
      field :value,     :string
      field :operation, Operation
    end

    @valid ~w(field value operation)a

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, @valid)
      |> validate_required([:field, :operation])
    end
  end

  embedded_schema do
    field :type,          Type
    field :name,          :string
    field :default,       :string
    field :documentation, :string
    field :display_name,  :string
    field :longform,      :string
    field :placeholder,   :string
    field :optional,      :boolean
    field :values,        {:array, :string}

    embeds_one :condition, Condition

    embeds_one :validation, Validation, on_replace: :update do
      field :regex, :string
      field :json,  :boolean

      embeds_one :uniq_by, Uniq, on_replace: :update do
        field :scope, UniqScope
      end
    end
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(type name default values documentation longform placeholder optional display_name)a)
    |> cast_embed(:condition)
    |> cast_embed(:validation, with: &validation_changeset/2)
    |> validate_types()
    |> validate_required([:type, :name])
  end

  defp validation_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(regex json)a)
    |> cast_embed(:uniq_by, with: &uniq_changeset/2)
  end

  defp uniq_changeset(model, attrs) do
    cast(model, attrs, ~w(scope)a)
    |> validate_required(~w(scope)a)
  end

  defp validate_types(cs) do
    case get_field(cs, :type) do
      :enum ->
        validate_length(cs, :values,
          message: "must have at least one value for ENUM type configuration items",
          min: 1
        )
      _ -> cs
    end
  end
end
