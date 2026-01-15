defmodule Console.Schema.UpgradePlanCallout do
  use Console.Schema.Base

  schema "upgrade_plan_callouts" do
    field :name, :string

    embeds_many :callouts, Callout, on_replace: :delete do
      field :addon,    :string
      field :template, :string
    end

    field :context, :map, default: %{}

    timestamps()
  end

  @valid ~w(name context)a

  def changeset(callout, attrs) do
    callout
    |> cast(attrs, @valid)
    |> cast_embed(:callouts, with: &callout_changeset/2)
    |> validate_required([:name])
  end

  def callout_changeset(callout, attrs) do
    callout
    |> cast(attrs, [:addon, :template])
    |> validate_required([:addon, :template])
  end
end
