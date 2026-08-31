---
title: Buttons
---

{% comment %}
https://markdoc.dev/docs/syntax#tags
{% /comment %}

# Standalone buttons

```markdown {% showHeader=false %}
{% button type="floating" href="/" %}A string with **formatted** text and a _local_ link{% /button %}

{% button type="floating" href="http://google.com" %}
A string with **formatted** text and an _external_ link
{% /button %}
```

{% button type="floating" href="/" %}A string with **formatted** text and a _local_ link{% /button %}

{% button type="floating" href="http://google.com" %}
A string with **formatted** text and an _external_ link
{% /button %}

# Icons

See full icon list [here](https://pluralsh-design.web.app/?path=/story/icons--default)

```md {% showHeader=false %}
{% button href="#" icon="WarningOutline" %}Icon Button{% /button %}
```

{% buttonGroup %}
{% button href="#" icon="WarningOutline" %}Warning­Outline{% /button %}
{% button href="#" icon="Video" %}Video{% /button %}
{% button href="#" icon="MagicWand" %}MagicWand{% /button %}
{% button href="#" icon="Tool" %}Tool{% /button %}
{% button href="#" icon="Book" %}Book{% /button %}
{% button href="#" icon="Workspace" %}Workspace{% /button %}
{% button href="#" icon="PushPin" %}PushPin{% /button %}
{% /buttonGroup %}

# Button groups

```markdown {% showHeader=false %}
{% buttonGroup %}
{% button href="#" %}Three{% /button %}
{% button href="#" %}buttons{% /button %}
{% button href="#" %}in a row{% /button %}
Non-button content will be ignored
{% /buttonGroup %}
```

{% buttonGroup %}
{% button href="#" %}Three{% /button %}
{% button href="#" %}buttons{% /button %}
{% button href="#" %}in a row{% /button %}
Non-button content will be ignored
{% /buttonGroup %}
