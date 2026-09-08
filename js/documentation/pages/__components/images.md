---
title: Images
---

# Basic caption

```md
![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png 'Basic *caption* (no formatting allowed)')
```

![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png 'Basic *caption* (no formatting allowed)')

# Formatted caption

```md {% showHeader=false %}
{% figure %}
![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png)
{% caption %}
A more **complex** caption with `formatted` text and [links](#)
{% /caption %}
{% /figure %}
```

{% figure %}
![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png)
{% caption %}
A more **complex** caption with `formatted` text and [links](#)
{% /caption %}
{% /figure %}

# No caption

```md {% showHeader=false %}
{% figure %}
![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png)
{% /figure %}
```

{% figure %}
![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png)
{% /figure %}

# Multiple images in a row mixed with other content

![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png 'Basic *caption* (no formatting allowed)')
Other text
![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png 'Basic *caption* (no formatting allowed)')
![alt text for screen readers](/assets/cloud-shell-quickstart/image-1.png 'Basic *caption* (no formatting allowed)')
