// merkleAudit.js — client-side hashing + Merkle proof verification.
// Drop next to api.js and import from PersonalAudit.jsx.
// Uses Web Crypto (built into every browser) -- no extra dependency needed.

async function sha256Hex(message) {
  const bytes = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Mirrors leaf_hash() in shared/merkle.py exactly -- must stay in sync.
export async function computeLeafHash(identifier) {
  const normalized = identifier.trim().toLowerCase();
  return sha256Hex(`leaf:${normalized}`);
}

// Mirrors _combine() in shared/merkle.py exactly -- must stay in sync.
async function combine(left, right) {
  const [a, b] = [left, right].sort();
  return sha256Hex(`node:${a}:${b}`);
}

// Mirrors verify_proof() in shared/merkle.py -- this is the actual
// client-side verification step. The browser decides exposed/not-exposed,
// never the server.
export async function verifyMerkleProof(leafHash, path, root) {
  let current = leafHash;
  for (const step of path) {
    current =
      step.position === "left"
        ? await combine(step.hash, current)
        : await combine(current, step.hash);
  }
  return current === root;
}

// Full flow for one org node: hash identifier -> request proof -> verify locally.
export async function checkExposureAgainstOrg(orgBaseUrl, identifier) {
  const leaf = await computeLeafHash(identifier);

  const commitRes = await fetch(`${orgBaseUrl}/commit`);
  if (!commitRes.ok) return { reachable: false };
  const { root } = await commitRes.json();

  const proveRes = await fetch(`${orgBaseUrl}/prove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leaf_hash: leaf }),
  });
  if (!proveRes.ok) return { reachable: false };
  const { present, path } = await proveRes.json();

  // Verify locally -- do not trust the server's "present" flag on its own.
  const exposed = present && (await verifyMerkleProof(leaf, path, root));

  return { reachable: true, exposed, root, leaf };
}
