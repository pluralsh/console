package store

const (
	createTables = `
		CREATE TABLE IF NOT EXISTS component (
			id INTEGER PRIMARY KEY,
			parent_uid TEXT,
			uid TEXT,
			"group" TEXT,
			version TEXT,
			kind TEXT, 
			namespace TEXT,
			name TEXT,
			health INT,
			node TEXT,
			created_at TIMESTAMP,
			updated_at TIMESTAMP,
			service_id TEXT,
			delete_phase TEXT,
			manifest_sha TEXT,
			transient_manifest_sha TEXT,
			apply_sha TEXT,
			server_sha TEXT,
			manifest BOOLEAN DEFAULT 0, -- Indicates if the component was created from an original manifest set of a service
			applied BOOLEAN DEFAULT 0 -- Indicates if the component was already applied to the cluster
		);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_component ON component("group", version, kind, namespace, name);
		CREATE INDEX IF NOT EXISTS idx_parent ON component(parent_uid);
		CREATE INDEX IF NOT EXISTS idx_uid ON component(uid);
		CREATE INDEX IF NOT EXISTS idx_service_id ON component(service_id);

		-- Set default value on insert
		CREATE TRIGGER IF NOT EXISTS set_updated_at_on_insert
		AFTER INSERT ON component
		BEGIN
			UPDATE component
			SET updated_at = CURRENT_TIMESTAMP
			WHERE id = NEW.id;
		END;
		
		-- Update timestamp automatically on row update§
		CREATE TRIGGER IF NOT EXISTS set_updated_at_on_update
		AFTER UPDATE ON component
		BEGIN
			UPDATE component
			SET updated_at = CURRENT_TIMESTAMP
			WHERE id = NEW.id AND server_sha != NEW.server_sha;
		END;

		-- Create the hook component table
		CREATE TABLE IF NOT EXISTS hook_component (
			id INTEGER PRIMARY KEY,
			uid TEXT,
			"group" TEXT,
			version TEXT,
			kind TEXT, 
			namespace TEXT,
			name TEXT,
			status INT,
			manifest_sha TEXT,
			service_id TEXT,
			delete_policies TEXT
		);
	 
		-- Add indexes to the hook component table
		CREATE UNIQUE INDEX IF NOT EXISTS hook_component_index_unique ON hook_component("group", version, kind, namespace, name);
		CREATE INDEX IF NOT EXISTS hook_component_index_service_id ON hook_component(service_id);
	`

	getAppliedComponent = `
		SELECT uid, "group", version, kind, namespace, name, health, parent_uid, manifest_sha, transient_manifest_sha, apply_sha, server_sha, service_id, manifest
		FROM component
		WHERE name = ? AND namespace = ? AND "group" = ? AND version = ? AND kind = ? AND applied = 1
	`

	getAppliedComponentByUID = `
		SELECT uid, "group", version, kind, namespace, name, health, parent_uid
		FROM component
		WHERE uid = ? AND applied = 1
	`

	getAppliedComponentsByGVK = `
		SELECT uid, "group", version, kind, namespace, name, server_sha, delete_phase, manifest
		FROM component
		WHERE "group" = ? AND version = ? AND kind = ? AND applied = 1
	`

	setComponentWithSHA = `
		INSERT INTO component (
			uid,
			parent_uid,
			"group",
			version,
			kind,
			namespace,
			name,
			health,
		    node,
		    created_at,
		    service_id,
		    delete_phase,
		    server_sha,
		    applied
		) VALUES (
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
		    ?,
		    ?,
		    ?,
		    ?,
		    ?
		) ON CONFLICT("group", version, kind, namespace, name) DO UPDATE SET
			uid = excluded.uid,
			parent_uid = excluded.parent_uid,
			health = excluded.health,
			node = excluded.node,
			created_at = excluded.created_at,
			service_id = excluded.service_id,
			delete_phase = excluded.delete_phase,
			server_sha = excluded.server_sha,
		    applied = excluded.applied
	`

	setComponentUnsynced = `
		UPDATE component
		SET applied = 0,
		    uid = '',
		    health = 1,
		    created_at = NULL,
		    server_sha = '',
		    manifest_sha = '',
		    transient_manifest_sha = '',
		    apply_sha = ''
		WHERE "group" = ? AND version = ? AND kind = ? AND namespace = ? AND name = ?
	`

	expireSHA = `
		UPDATE component
		SET
			manifest_sha = '',
			transient_manifest_sha = '',
			apply_sha = '',
		    updated_at = CURRENT_TIMESTAMP
		WHERE "group" = ? AND version = ? AND kind = ? AND namespace = ? AND name = ?
	`

	expire = `
		UPDATE component
		SET
			manifest_sha = '',
			transient_manifest_sha = '',
			apply_sha = '',
		    updated_at = CURRENT_TIMESTAMP
		WHERE service_id = ?
	`
	commitTransientSHA = `
		UPDATE component 
		SET 
			manifest_sha = CASE 
				WHEN transient_manifest_sha IS NULL OR transient_manifest_sha = '' 
				THEN manifest_sha 
				ELSE transient_manifest_sha 
			END,
			transient_manifest_sha = NULL
		WHERE "group" = ? 
		  AND version = ? 
		  AND kind = ? 
		  AND namespace = ? 
		  AND name = ?
	`

	clusterHealthScore = `
		WITH base_score AS (
			SELECT CAST(AVG(CASE WHEN health = 0 THEN 100 ELSE 0 END) as INTEGER) as score
			FROM component 
		),
		deductions AS (
			SELECT 
				SUM(CASE
					WHEN kind = 'Certificate' AND health = 2 THEN 10
					WHEN namespace = 'kube-system' AND health = 2 THEN 20
					WHEN kind = 'PersistentVolume' AND health = 2 THEN 10
					WHEN (namespace = 'istio-system' OR name LIKE '%coredns%' OR name LIKE '%aws-cni%') AND health = 2 THEN 50
					WHEN (namespace LIKE '%ingress%' OR namespace LIKE '%traefik%') AND kind = 'Service' AND health = 2 THEN 50
					ELSE 0
				END) as total_deductions
			FROM component
		)
		SELECT MAX(0, (SELECT score FROM base_score) - (SELECT COALESCE(total_deductions, 0) FROM deductions)) as score
	`

	nodeStatistics = `
		SELECT node, COUNT(*)
		FROM component
		WHERE kind = 'Pod' AND created_at <= strftime('%s', 'now', '-5 minutes') AND health != 0 AND applied = 1
		GROUP BY node
	`

	setComponent = `
		INSERT INTO component (
			uid,
			parent_uid,
			"group",
			version,
			kind,
			namespace,
			name,
			health,
		    applied,
		    node,
		    created_at,
		    service_id
		) VALUES (
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
		    ?,
		    ?,
		    ?
		) ON CONFLICT("group", version, kind, namespace, name) DO UPDATE SET
			uid = excluded.uid,
			parent_uid = excluded.parent_uid,
			health = excluded.health,
			node = excluded.node,
			created_at = excluded.created_at,
			service_id = excluded.service_id,
			applied = excluded.applied
	`

	failedComponents = `
		WITH RECURSIVE component_chain AS (
			-- Start with parent components of specified kinds
			SELECT *, 1 as level, uid as root_uid
			FROM component 
			WHERE kind IN ('Deployment', 'StatefulSet', 'Ingress', 'DaemonSet', 'Certificate') AND applied = 1
			
			UNION ALL
			
			-- Get children of components in the chain, carrying the root component UID
			SELECT c.*, cc.level + 1, cc.root_uid
			FROM component c
			JOIN component_chain cc ON c.parent_uid = cc.uid AND c.parent_uid != ''
			WHERE cc.level < 4 AND c.applied = 1
		),
		-- Find all failed components in the chain
		failed_roots AS (
			-- Get root UIDs where any component in the chain is failed
			SELECT DISTINCT root_uid
			FROM component_chain
			WHERE health = 2
		)
		-- Return both the failed components and their original parent components
		SELECT DISTINCT cc.uid, cc."group", cc.version, cc.kind, cc.namespace, cc.name
		FROM component_chain cc
		WHERE (cc.health = 2  -- The component itself is failed
		   OR cc.uid IN (    -- OR it's a direct parent of a failed component
			  SELECT parent_uid 
			  FROM component_chain 
			  WHERE health = 2 AND parent_uid IS NOT NULL
		   )
		   OR (cc.uid IN (  -- OR it's the original root component of a chain with failures
			  SELECT root_uid FROM failed_roots
		   ) AND cc.kind IN ('Deployment', 'StatefulSet', 'Ingress', 'DaemonSet', 'Certificate')))
           AND cc.kind IN ('Deployment', 'StatefulSet', 'Ingress', 'DaemonSet', 'Certificate')
           AND (cc.service_id IS NULL OR cc.service_id = '')
	`

	serverCounts = `
	SELECT
  		COUNT(DISTINCT CASE WHEN kind = 'Node' THEN uid END) AS node_count,
  		COUNT(DISTINCT CASE WHEN kind = 'Namespace' THEN uid END) AS namespace_count
	FROM component`

	expireOlderThan = `
		UPDATE component
		SET
			manifest_sha = '',
			transient_manifest_sha = '',
			apply_sha = '',
		    updated_at = CURRENT_TIMESTAMP
		WHERE updated_at < datetime(?, 'unixepoch')
	`

	setHookComponent = `
		INSERT INTO hook_component ("group", version, kind, namespace, name, uid, status, service_id, delete_policies)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT("group", version, kind, namespace, name) DO UPDATE SET
			uid = excluded.uid,
			status = excluded.status,
			service_id = excluded.service_id,
			delete_policies = excluded.delete_policies
	`

	setHookComponentWithManifestSHA = `
		INSERT INTO hook_component ("group", version, kind, namespace, name, uid, status, manifest_sha, service_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT("group", version, kind, namespace, name) DO UPDATE SET
		    uid = excluded.uid,
		    manifest_sha = excluded.manifest_sha,
		    service_id = excluded.service_id
	`
)
