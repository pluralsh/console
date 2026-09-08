---
title: Deploy Wordpress with Kustomize
description: 'Learn how to deploy WordPress with MySQL using Kustomize and Liquid templates, creating a multi-component application with dynamic configuration'
---
## Overview
In this guide, you'll learn how to deploy WordPress with MySQL on your Kubernetes cluster using Plural with Kustomize and Liquid templates.
This approach demonstrates how to create a multi-component application stack with Kustomize, using Liquid templates for dynamic configuration.
You'll see how to connect WordPress to MySQL and apply patches to customize your deployment.

## Prerequisites

Before you begin, make sure to cover [prerequisites and setup](../#prerequisites).

## Step-by-Step Guide: Deploying WordPress with MySQL using Kustomize and Liquid
Let's walk through deploying WordPress with MySQL using Kustomize and Liquid templates. Feel free to adjust provided file
examples according to your needs and commit them to your configured Git repository.

### Step 1: Set up Kustomize with WordPress and MySQL
First, let's set up Kustomize to deploy WordPress and MySQL. We'll create a directory structure with the following files:

##### [services/examples/kustomize-stack-with-liquid/kustomization.yaml](#TODO)
```yaml
resources:
  - wordpress
  - mysql
patches:
  - path: patch.yaml
replacements:
  - source:
      kind: Service
      name: wordpress
      fieldPath: metadata.name
    targets:
      - select:
          kind: Deployment
          name: wordpress
        fieldPaths:
          - spec.template.spec.initContainers.[name=init-command].env.[name=WORDPRESS_SERVICE].value
  - source:
      kind: Service
      name: mysql
      fieldPath: metadata.name
    targets:
      - select:
          kind: Deployment
          name: wordpress
        fieldPaths:
          - spec.template.spec.initContainers.[name=init-command].env.[name=MYSQL_SERVICE].value
          - spec.template.spec.containers.[name=wordpress].env.[name=WORDPRESS_DB_HOST].value
```

This kustomization file:
- Includes resources from the wordpress and mysql directories
- Applies a patch from patch.yaml
- Uses replacements to inject the WordPress and MySQL service names into the WordPress deployment

##### [services/examples/kustomize-stack-with-liquid/patch.yaml](#TODO)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress
spec:
  selector:
    matchLabels:
      app: wordpress
  template:
    spec:
      initContainers:
        - name: init-command
          image: alpine
          command: ["/bin/sh", "-c"]
          args: ["echo WORDPRESS_SVC: $WORDPRESS_SERVICE, MYSQL_SVC: $MYSQL_SERVICE"]
          env:
            - name: WORDPRESS_SERVICE
              value: placeholder
            - name: MYSQL_SERVICE
              value: placeholder
      containers:
        - name: wordpress
          env:
            - name: WORDPRESS_DB_HOST
              value: placeholder
            - name: WORDPRESS_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-pass
                  key: password
```

This patch:
- Adds an init container to the WordPress deployment that echoes the WordPress and MySQL service names
- Sets environment variables for the WordPress container, including the MySQL host and password

### Step 2: Set up WordPress resources
Let's create the WordPress resources:

##### [services/examples/kustomize-stack-with-liquid/wordpress/kustomization.yaml](#TODO)
```yaml
resources:
- deployment.yaml
- service.yaml
```

##### [services/examples/kustomize-stack-with-liquid/wordpress/deployment.yaml.liquid](#TODO)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress
  labels:
    app: wordpress
spec:
  selector:
    matchLabels:
      app: wordpress
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: wordpress
    spec:
      containers:
      - image: wordpress:4.8-apache
        name: wordpress
        ports:
        - containerPort: 80
          name: wordpress
        volumeMounts:
        - name: wordpress-persistent-storage
          mountPath: /var/www/html
      volumes:
      - name: wordpress-persistent-storage
        emptyDir: {}
```

##### [services/examples/kustomize-stack-with-liquid/wordpress/service.yaml](#TODO)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: wordpress
  labels:
    app: wordpress
spec:
  ports:
    - port: 80
  selector:
    app: wordpress
```

### Step 3: Set up MySQL resources
Now, let's create the MySQL resources:

##### [services/examples/kustomize-stack-with-liquid/mysql/kustomization.yaml](#TODO)
```yaml
resources:
- deployment.yaml
- service.yaml
- secret.yaml
```

##### [services/examples/kustomize-stack-with-liquid/mysql/deployment.yaml.liquid](#TODO)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  labels:
    app: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - image: mysql:5.6
        name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-pass
              key: password
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: mysql-persistent-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-persistent-storage
        emptyDir: {}
```

##### [services/examples/kustomize-stack-with-liquid/mysql/service.yaml](#TODO)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  labels:
    app: mysql
spec:
  ports:
    - port: 3306
  selector:
    app: mysql
```

##### [services/examples/kustomize-stack-with-liquid/mysql/secret.yaml](#TODO)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-pass
type: Opaque
data:
  # Default password is "admin".
  password: YWRtaW4=
```

### Step 4: Create a ServiceDeployment resource
Finally, we'll create a ServiceDeployment resource that uses Kustomize to deploy our application stack.

##### [apps/examples/kustomize-stack-with-liquid/servicedeployment.yaml](#TODO)
```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: plrl-03-wordpress
  namespace: examples
spec:
  cluster: mgmt
  git:
    url: https://github.com/yourorg/example.git # the url for your example git repo
    folder: services/examples/kustomize-stack-with-liquid
    ref: main
  configuration:
    wordpressTag: "4.8-apache"
    mysqlTag: "5.6"
```

### Step 5: Check Plural Console and access WordPress
After a couple of minutes, the service should be deployed and running. You can check the status in the Plural Console.

![](/assets/examples/plrl-03-console.png 'CD tab -> mgmt cluster -> plrl-03-wordpress service')

You can access your `wordpress` instance using i.e. `kubectl`.
```shell
kubectl -n examples port-forward svc/wordpress 8080:80
```

It will be accessible at `localhost:8080`.
![](/assets/examples/plrl-wordpress.png 'localhost:8080')

## Key Takeaways
Congratulations! You've just learned how to:
- Deploy WordPress with MySQL using Kustomize
- Use Liquid templates to inject configuration values into Kubernetes manifests
- Apply patches to customize your deployment
- Use replacements to connect services together

Need help? Join our community [Discord server](https://discord.com/invite/bEBAMXV64s) or check out more examples in our documentation.
