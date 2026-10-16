package store

// failingSinceUpsert keeps the earliest known failing time while the same object keeps failing, and resets it once the
// component recovers. A replacement with the same name but another uid starts its own failing time.
const failingSinceUpsert = `CASE
				WHEN excluded.health != 2 THEN 0
				WHEN COALESCE(component.failing_since, 0) > 0 AND component.health = 2
				AND COALESCE(component.uid, '') IN ('', excluded.uid) THEN MIN(component.failing_since, excluded.failing_since)
				ELSE excluded.failing_since
			END`

// ownershipUpsert keeps the parent and service of a component when a watch event carries neither. Objects rendered by
// Flux from a HelmRelease have no owner reference or inventory annotation, so the values set from the HelmRelease
// would be lost on every event. A new owner reference or inventory annotation still replaces them.
// Only the same object keeps them. A replacement that has the same name but another uid does not inherit the owner
// of the object it replaced, a stored row without a uid is a placeholder of the same object.
const ownershipUpsert = `parent_uid = CASE
				WHEN COALESCE(excluded.parent_uid, '') != '' THEN excluded.parent_uid
				WHEN COALESCE(excluded.service_id, '') = '' AND COALESCE(component.service_id, '') != ''
					AND COALESCE(component.uid, '') IN ('', excluded.uid) THEN component.parent_uid
				ELSE excluded.parent_uid
			END,
			service_id = CASE
				WHEN COALESCE(excluded.service_id, '') != '' THEN excluded.service_id
				WHEN COALESCE(excluded.parent_uid, '') = '' AND COALESCE(component.parent_uid, '') != ''
					AND COALESCE(component.uid, '') IN ('', excluded.uid) THEN component.service_id
				ELSE excluded.service_id
			END,`

// factsUpsert refreshes the insight attributes derived from the object.
const factsUpsert = `criticality = excluded.criticality,
			criticality_reason = excluded.criticality_reason,
			priority_class = excluded.priority_class,
			failing_since = ` + failingSinceUpsert + `,
			desired_replicas = excluded.desired_replicas,
			ready_replicas = excluded.ready_replicas,
			priority_annotation = excluded.priority_annotation,
			health_message = excluded.health_message,
			last_success = excluded.last_success`

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
			applied BOOLEAN DEFAULT 0, -- Indicates if the component was already applied to the cluster
			labels TEXT, -- JSON object of Kubernetes object labels
			criticality INT, -- built-in criticality score of the component, see the insights package
			criticality_reason TEXT,
			priority_class TEXT, -- priority class name of the pod template
			failing_since INT DEFAULT 0, -- unix time the component started to fail, 0 if it is not failing
			desired_replicas INT, -- NULL when unknown
			ready_replicas INT, -- NULL when unknown
			priority_annotation TEXT, -- normalized value of the insight priority annotation
			health_message TEXT,
			last_success INT DEFAULT 0 -- unix time of the last successful run of a CronJob, 0 when unknown
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
		SELECT uid, "group", version, kind, namespace, name, health, parent_uid, manifest_sha, transient_manifest_sha, apply_sha, server_sha, service_id, manifest, labels
		FROM component
		WHERE name = ? AND namespace = ? AND "group" = ? AND version = ? AND kind = ? AND applied = 1
	`

	getAppliedComponentByUID = `
		SELECT uid, "group", version, kind, namespace, name, health, parent_uid
		FROM component
		WHERE uid = ? AND applied = 1
	`

	getPriorityAnnotation = `
		SELECT COALESCE(priority_annotation, '')
		FROM component
		WHERE uid = ? AND applied = 1
		ORDER BY id
		LIMIT 1
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
		    applied,
		    labels,
		    criticality,
		    criticality_reason,
		    priority_class,
		    failing_since,
		    desired_replicas,
		    ready_replicas,
		    priority_annotation,
		    health_message,
		    last_success
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
			` + ownershipUpsert + `
			health = excluded.health,
			node = excluded.node,
			created_at = excluded.created_at,
			delete_phase = excluded.delete_phase,
			server_sha = excluded.server_sha,
		    applied = excluded.applied,
		    labels = excluded.labels,
			` + factsUpsert + `
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
		    apply_sha = '',
		    labels = '',
		    failing_since = 0
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
		    service_id,
		    criticality,
		    criticality_reason,
		    failing_since
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
		    ?,
		    ?
		) ON CONFLICT("group", version, kind, namespace, name) DO UPDATE SET
			uid = excluded.uid,
			parent_uid = excluded.parent_uid,
			health = excluded.health,
			node = excluded.node,
			created_at = excluded.created_at,
			service_id = excluded.service_id,
			applied = excluded.applied,
			criticality = excluded.criticality,
			criticality_reason = excluded.criticality_reason,
			failing_since = ` + failingSinceUpsert + `
	`

	// failingRootsPrefix selects the roots of all failures, see failingRoots.
	failingRootsPrefix = `
		WITH RECURSIVE climb(fid, uid, parent_uid, kind, depth) AS (
			SELECT id, uid, parent_uid, kind, 1
			FROM component
			WHERE health = 2 AND applied = 1

			UNION ALL

			SELECT climb.fid, p.uid, p.parent_uid, p.kind, climb.depth + 1
			FROM climb
			JOIN component p ON p.uid = climb.parent_uid AND p.applied = 1 AND p.kind != 'Node'
			WHERE climb.parent_uid != ''
			  AND climb.depth < 4
			  AND climb.kind NOT IN ('Deployment', 'StatefulSet', 'DaemonSet', 'Ingress', 'Certificate', 'CronJob')
		),
		top AS (
			SELECT fid, uid AS root_uid
			FROM climb
			WHERE kind IN ('Deployment', 'StatefulSet', 'DaemonSet', 'Ingress', 'Certificate', 'CronJob')
			   OR NOT EXISTS (
				  SELECT 1 FROM component p
				  WHERE p.uid = climb.parent_uid AND climb.parent_uid != '' AND p.applied = 1 AND p.kind != 'Node'
			   )
		),
		roots AS (
			SELECT top.root_uid, MIN(NULLIF(f.failing_since, 0)) AS failing_since
			FROM top
			JOIN component f ON f.id = top.fid
			GROUP BY top.root_uid
		)`

	// failingRoots returns the objects that represent the failures of the cluster, one row per root.
	// Every failed component is walked up its owners, at most 4 levels, to the first root kind. A chain that ends
	// without one is represented by its top-most object, and a chain that is too deep to reach either is ignored.
	// A root inherits the service of its nearest owner that has one.
	failingRoots = failingRootsPrefix + `,
		owner(root_uid, uid, parent_uid, service_id, depth) AS (
			SELECT r.root_uid, c.uid, c.parent_uid, COALESCE(c.service_id, ''), 1
			FROM roots r
			JOIN component c ON c.id = (SELECT MIN(x.id) FROM component x WHERE x.uid = r.root_uid AND x.applied = 1)

			UNION ALL

			SELECT owner.root_uid, p.uid, p.parent_uid, COALESCE(p.service_id, ''), owner.depth + 1
			FROM owner
			JOIN component p ON p.uid = owner.parent_uid AND p.applied = 1
			WHERE owner.service_id = '' AND owner.parent_uid != '' AND owner.depth < 4
		)
		SELECT
			c.uid,
			c."group",
			c.version,
			c.kind,
			c.namespace,
			c.name,
			COALESCE((SELECT o.service_id FROM owner o WHERE o.root_uid = c.uid AND o.service_id != '' LIMIT 1), ''),
			COALESCE(c.priority_class, ''),
			COALESCE(c.health_message, ''),
			c.desired_replicas,
			c.ready_replicas,
			COALESCE(c.created_at, 0),
			COALESCE(r.failing_since, 0),
			COALESCE(c.criticality, 0),
			COALESCE(c.criticality_reason, ''),
			COALESCE(c.priority_annotation, ''),
			COALESCE(c.labels, ''),
			c.health
		FROM roots r
		JOIN component c ON c.id = (SELECT MIN(x.id) FROM component x WHERE x.uid = r.root_uid AND x.applied = 1)
		WHERE (c.kind != 'Node' OR (COALESCE(r.failing_since, 0) > 0 AND r.failing_since <= CAST(strftime('%s', 'now') AS INTEGER) - 300))
		  AND (c.kind != 'CronJob' OR EXISTS (
			  SELECT 1 FROM (
				  SELECT j.health AS health, j.created_at AS created_at FROM component j
				  WHERE j.parent_uid = c.uid AND j.kind = 'Job' AND j.applied = 1
				  ORDER BY j.created_at DESC LIMIT 1
			  ) newest
			  WHERE newest.health = 2 AND (COALESCE(c.last_success, 0) = 0 OR c.last_success < newest.created_at)
		  ))
	`

	// failingRootsDescendants counts the failed and pending objects below every root of failingRoots, by kind.
	// An object watched through several API versions has a row per version, and each of them can have its own parent,
	// so every row is walked and the objects are counted once by uid.
	failingRootsDescendants = failingRootsPrefix + `,
		down(root_uid, uid, kind, health, depth) AS (
			SELECT r.root_uid, c.uid, c.kind, c.health, 0
			FROM roots r
			JOIN component c ON c.id = (SELECT MIN(x.id) FROM component x WHERE x.uid = r.root_uid AND x.applied = 1)

			UNION ALL

			SELECT down.root_uid, ch.uid, ch.kind, ch.health, down.depth + 1
			FROM down
			JOIN component ch ON ch.parent_uid = down.uid AND ch.applied = 1
			WHERE down.uid != '' AND down.depth < 3 AND down.kind != 'Node'
		)
		SELECT root_uid, kind,
			COUNT(DISTINCT CASE WHEN health = 2 THEN uid END),
			COUNT(DISTINCT CASE WHEN health = 1 THEN uid END)
		FROM down
		WHERE depth > 0 AND health IN (1, 2)
		GROUP BY root_uid, kind
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
