---
title: Liquid Filters in PR Automation
description: Supported Liquid filters for use in PR Automation templates
---

# Liquid Filters in PR Automation

PR Automation in Plural uses [Liquid](https://shopify.github.io/liquid/) templating engine for generating templates. In addition to the standard Liquid filters, Plural provides a set of custom filters that can be used in your templates.

## Supported Filters

Plural supports a wide range of Liquid filters that can be used in your PR Automation templates. These filters include:

- String manipulation (e.g., `abbrev`, `trim`, `upper`, `lower`)
- Mathematical operations (e.g., `add`, `sub`, `mul`, `div`)
- Date formatting (e.g., `date`, `dateInZone`, `dateModify`)
- Data structure manipulation (e.g., `keys`, `values`, `pick`, `omit`)
- Encoding/decoding (e.g., `b64enc`, `b64dec`, `urlquery`)
- And many more

For a complete list of supported filters and detailed documentation for each, please refer to our [Liquid Filters documentation](https://github.com/pluralsh/polly/blob/main/docs/liquid-filters.md).

## Using Filters in Templates

Filters can be used in your Liquid templates to transform data. Here's a simple example:

```liquid
{{ context.name | upper }}
```

This would convert the `context.name` value to uppercase.

You can also chain multiple filters:

```liquid
{{ context.description | trim | truncate: 100 }}
```

This would trim whitespace from `context.description` and then truncate it to 100 characters.

## Examples

Here are a few examples of how you might use these filters in your PR Automation templates:

### String Manipulation

```liquid
{{ context.name | lower | replace: " ", "-" }}
```

This would convert `context.name` to lowercase and replace spaces with hyphens, which is useful for generating URL-friendly slugs.

### Date Formatting

```liquid
{{ "now" | date: "%Y-%m-%d" }}
```

This would output the current date in the format "YYYY-MM-DD".

### Mathematical Operations

```liquid
{{ context.replicas | add: 1 }}
```

This would add 1 to the value of `context.replicas`.

For more examples and detailed documentation, please refer to our [Liquid Filters documentation](https://github.com/pluralsh/polly/blob/main/docs/liquid-filters.md).