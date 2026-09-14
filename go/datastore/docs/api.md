# API Reference

## Packages
- [dbs.plural.sh/v1alpha1](#dbspluralshv1alpha1)


## dbs.plural.sh/v1alpha1

Package v1alpha1 contains API Schema definitions for the dbs v1alpha1 API group

### Resource Types
- [ElasticsearchCredentials](#elasticsearchcredentials)
- [ElasticsearchILMPolicy](#elasticsearchilmpolicy)
- [ElasticsearchIndex](#elasticsearchindex)
- [ElasticsearchIndexTemplate](#elasticsearchindextemplate)
- [ElasticsearchUser](#elasticsearchuser)
- [MySqlCredentials](#mysqlcredentials)
- [MySqlDatabase](#mysqldatabase)
- [MySqlUser](#mysqluser)
- [NamespaceManagement](#namespacemanagement)
- [PostgresCredentials](#postgrescredentials)
- [PostgresDatabase](#postgresdatabase)
- [PostgresUser](#postgresuser)









#### ElasticsearchCredentials



ElasticsearchCredentials is the Schema for the elasticsearchcredentials API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchCredentials` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchCredentialsSpec](#elasticsearchcredentialsspec)_ |  |  |  |


#### ElasticsearchCredentialsSpec



ElasticsearchCredentialsSpec defines the desired state of ElasticsearchCredentials



_Appears in:_
- [ElasticsearchCredentials](#elasticsearchcredentials)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `insecure` _boolean_ |  |  |  |
| `url` _string_ |  |  |  |
| `username` _string_ |  |  |  |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  |  |


#### ElasticsearchILMPolicy



ElasticsearchILMPolicy is the Schema for the ILM Policy API.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchILMPolicy` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchILMPolicySpec](#elasticsearchilmpolicyspec)_ |  |  |  |


#### ElasticsearchILMPolicySpec



ElasticsearchILMPolicySpec defines the desired state of ILMPolicy.



_Appears in:_
- [ElasticsearchILMPolicy](#elasticsearchilmpolicy)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `name` _string_ |  |  | Optional: \{\} <br /> |
| `definition` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Definition of the Elasticsearch ILM policy.<br />See: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle |  | Required: \{\} <br /> |


#### ElasticsearchIndex



ElasticsearchIndex is the Schema for the Elasticsearch index API.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchIndex` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchIndexSpec](#elasticsearchindexspec)_ |  |  |  |


#### ElasticsearchIndexSpec



ElasticsearchIndexSpec defines the desired state of ElasticsearchIndex.



_Appears in:_
- [ElasticsearchIndex](#elasticsearchindex)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `name` _string_ |  |  | Optional: \{\} <br /> |
| `definition` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Definition of the Elasticsearch index, including settings, mappings, and aliases.<br />See: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create |  | Required: \{\} <br /> |


#### ElasticsearchIndexTemplate



ElasticsearchIndexTemplate is the Schema for the elasticsearchindextemplates API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchIndexTemplate` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchIndexTemplateSpec](#elasticsearchindextemplatespec)_ |  |  |  |


#### ElasticsearchIndexTemplateDefinition







_Appears in:_
- [ElasticsearchIndexTemplateSpec](#elasticsearchindextemplatespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `indexPatterns` _string array_ |  |  |  |
| `template` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ |  |  |  |
| `priority` _integer_ | The priority of this index template in case multiple templates match the index pattern.  Highest priority wins. |  | Optional: \{\} <br /> |


#### ElasticsearchIndexTemplateSpec



ElasticsearchIndexTemplateSpec defines the desired state of ElasticsearchIndexTemplate



_Appears in:_
- [ElasticsearchIndexTemplate](#elasticsearchindextemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  |  |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `definition` _[ElasticsearchIndexTemplateDefinition](#elasticsearchindextemplatedefinition)_ |  |  |  |


#### ElasticsearchRole







_Appears in:_
- [ElasticsearchUserDefinition](#elasticsearchuserdefinition)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  |  |
| `clusterPermissions` _string array_ |  |  |  |
| `indexPermissions` _[IndexPermission](#indexpermission) array_ |  |  |  |


#### ElasticsearchUser



ElasticsearchUser is the Schema for the elasticsearchusers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchUser` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchUserSpec](#elasticsearchuserspec)_ |  |  |  |


#### ElasticsearchUserDefinition







_Appears in:_
- [ElasticsearchUserSpec](#elasticsearchuserspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `user` _string_ | User to add |  |  |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretKeyRef reference |  |  |
| `role` _[ElasticsearchRole](#elasticsearchrole)_ | Role represents the structure and assignment of roles in Elasticsearch. |  |  |


#### ElasticsearchUserSpec



ElasticsearchUserSpec defines the desired state of ElasticsearchUser



_Appears in:_
- [ElasticsearchUser](#elasticsearchuser)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `definition` _[ElasticsearchUserDefinition](#elasticsearchuserdefinition)_ |  |  |  |


#### IndexPermission







_Appears in:_
- [ElasticsearchRole](#elasticsearchrole)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `names` _string array_ |  |  |  |
| `privileges` _string array_ |  |  |  |


#### MySqlCredentials



MySqlCredentials is the Schema for the mysqlcredentials API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `MySqlCredentials` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[MySqlCredentialsSpec](#mysqlcredentialsspec)_ |  |  |  |


#### MySqlCredentialsSpec



MySqlCredentialsSpec defines the desired state of MySqlCredentials



_Appears in:_
- [MySqlCredentials](#mysqlcredentials)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ |  |  |  |
| `port` _integer_ |  |  |  |
| `username` _string_ |  |  |  |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  |  |
| `insecure` _boolean_ |  |  |  |


#### MySqlDatabase



MySqlDatabase is the Schema for the mysqldatabases API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `MySqlDatabase` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[MySqlDatabaseSpec](#mysqldatabasespec)_ |  |  |  |


#### MySqlDatabaseSpec



MySqlDatabaseSpec defines the desired state of MySqlDatabase



_Appears in:_
- [MySqlDatabase](#mysqldatabase)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `name` _string_ |  |  | Optional: \{\} <br /> |


#### MySqlUser



MySqlUser is the Schema for the mysqlusers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `MySqlUser` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[MySqlUserSpec](#mysqluserspec)_ |  |  |  |


#### MySqlUserSpec



MySqlUserSpec defines the desired state of MySqlUser



_Appears in:_
- [MySqlUser](#mysqluser)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | Optional: \{\} <br /> |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `databases` _string array_ |  |  |  |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretKeyRef reference |  |  |


#### NamespaceManagement



NamespaceManagement defines prune rules for namespaces in a cluster, if the declared sentinel resource no longer exists, the namespaces will be pruned according to the spec.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NamespaceManagement` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NamespaceManagementSpec](#namespacemanagementspec)_ |  |  |  |


#### NamespaceManagementSpec



NamespaceManagementSpec defines the desired state of NamespaceManagement.



_Appears in:_
- [NamespaceManagement](#namespacemanagement)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `interval` _string_ | The interval at which you'll reconcile namespaces according to this spec |  |  |
| `sentinel` _[Sentinel](#sentinel)_ | A resource to use to verify if the namespace should be pruned, if it exists, the namespace will be ignored |  |  |
| `namespacePattern` _string_ | A regex to use to match namespaces to prune |  |  |




#### PostgresCredentials



PostgresCredentials is the Schema for the postgrescredentials API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PostgresCredentials` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PostgresCredentialsSpec](#postgrescredentialsspec)_ |  |  |  |


#### PostgresCredentialsSpec



PostgresCredentialsSpec defines the desired state of PostgresCredentials



_Appears in:_
- [PostgresCredentials](#postgrescredentials)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ |  |  |  |
| `port` _integer_ |  |  |  |
| `database` _string_ |  |  |  |
| `username` _string_ |  |  |  |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  |  |
| `insecure` _boolean_ |  |  |  |


#### PostgresDatabase



PostgresDatabase is the Schema for the postgresdatabases API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PostgresDatabase` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PostgresDatabaseSpec](#postgresdatabasespec)_ |  |  |  |


#### PostgresDatabaseSpec



PostgresDatabaseSpec defines the desired state of PostgresDatabase



_Appears in:_
- [PostgresDatabase](#postgresdatabase)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `name` _string_ |  |  | Optional: \{\} <br /> |


#### PostgresUser



PostgresUser is the Schema for the postgresusers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PostgresUser` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PostgresUserSpec](#postgresuserspec)_ |  |  |  |


#### PostgresUserSpec



PostgresUserSpec defines the desired state of PostgresUser



_Appears in:_
- [PostgresUser](#postgresuser)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | Optional: \{\} <br /> |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `databases` _string array_ |  |  |  |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretKeyRef reference |  |  |




#### Sentinel







_Appears in:_
- [NamespaceManagementSpec](#namespacemanagementspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `kind` _string_ |  |  |  |
| `namespace` _string_ |  |  |  |
| `name` _string_ |  |  |  |
| `apiVersion` _string_ |  |  |  |




