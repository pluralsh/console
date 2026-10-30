defmodule Console.Schema.TemplateContext do
  use Console.Schema.Base
  alias Console.Schema.{GlobalService}

  schema "template_contexts" do
    field :raw, :map

    belongs_to :global, GlobalService

    timestamps()
  end

  @valid_attrs [:raw]

  def changeset(template_context, attrs) do
    template_context
    |> cast(attrs, @valid_attrs)
    |> unique_constraint(:global_id)
    |> foreign_key_constraint(:global_id)
  end
end
