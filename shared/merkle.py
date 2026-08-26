"""
Merkle commitment scheme for privacy-preserving non-membership proofs.

Design:
- Each org builds a Merkle tree where every leaf = SHA256(normalized_identifier).
- Only the ROOT is ever published (via /commit) — the raw identifier list never leaves the org.
- A client asks for a proof of a *hashed* identifier (hashed client-side, before
  it is ever sent over the wire) via /prove.
- The org returns the sibling-hash path needed to reconstruct the root.
- The client (browser) recomputes the root locally from the leaf + siblings and
  compares it to the previously published root:
    - if reconstruction matches root AND leaf is present in the tree -> EXPOSED
    - if leaf is absent (no valid path reaches root) -> NOT EXPOSED
- This means the ORG's server never learns whether the identifier matched;
  it only ever returns cryptographic material, and the *verifier* (browser)
  makes the exposed/not-exposed decision.
"""
import hashlib


def _h(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def leaf_hash(identifier: str) -> str:
    """Hash a normalized identifier into a Merkle leaf."""
    normalized = identifier.strip().lower()
    return _h(f"leaf:{normalized}".encode())


def _combine(left: str, right: str) -> str:
    # sort so tree construction is deterministic regardless of insertion order
    a, b = sorted([left, right])
    return _h(f"node:{a}:{b}".encode())


class MerkleTree:
    def __init__(self, leaves: list[str]):
        # de-dup + sort for determinism; pad to power of two with a domain-separated filler
        uniq = sorted(set(leaves))
        if not uniq:
            uniq = [_h(b"EMPTY_TREE")]
        n = 1
        while n < len(uniq):
            n *= 2
        filler = _h(b"PAD")
        self.leaves = uniq + [filler] * (n - len(uniq))
        self.levels = [self.leaves]
        cur = self.leaves
        while len(cur) > 1:
            nxt = [_combine(cur[i], cur[i + 1]) for i in range(0, len(cur), 2)]
            self.levels.append(nxt)
            cur = nxt
        self.root = cur[0]

    def proof_for(self, leaf: str):
        """Return (found, path) where path is a list of {hash, position} siblings."""
        if leaf not in self.leaves:
            return False, []
        idx = self.leaves.index(leaf)
        path = []
        for level in self.levels[:-1]:
            sibling_idx = idx ^ 1
            if sibling_idx < len(level):
                position = "right" if sibling_idx % 2 == 1 else "left"
                path.append({"hash": level[sibling_idx], "position": position})
            idx //= 2
        return True, path


def verify_proof(leaf: str, path: list[dict], root: str) -> bool:
    """Client-side (or test) verification: recompute root from leaf + siblings."""
    current = leaf
    for step in path:
        sib = step["hash"]
        if step["position"] == "left":
            current = _combine(sib, current)
        else:
            current = _combine(current, sib)
    return current == root
