# ============================================================
# 1. core/crypto.py  (new file)
# ============================================================

"""
Symmetric encryption for client-supplied secrets that must be
decrypted for actual use (unlike API keys, which are hash-only).

Uses Fernet (AES-128-CBC + HMAC, from the `cryptography` package,
already a transitive dep via simplejwt). The master key must live
only in .env as GROQ_KEY_ENCRYPTION_SECRET — generate one once via
Fernet.generate_key() and never rotate it without a migration plan
for existing encrypted values.
"""


def _get_fernet():
    """
    Singleton Fernet instance, lazily built from settings.

    Follow the same lazy-singleton pattern as _get_model() in
    rag/utils/embedder.py and the QdrantClient getter in rag/query.py —
    module-level global, built on first call, reused after.

    Returns:
        cryptography.fernet.Fernet
    """
    ...


def encrypt_groq_key(raw_key: str) -> bytes:
    """
    Encrypt a client-supplied Groq API key for storage.

    Args:
        raw_key: the plaintext key as received from the client.
            Caller is responsible for stripping whitespace and
            basic non-blank validation before this is called.

    Returns:
        Encrypted bytes, safe to store in Client.groq_api_key_encrypted.
    """
    ...


def decrypt_groq_key(encrypted: bytes) -> str:
    """
    Decrypt a stored Groq key for use in a live request.

    Call this as late as possible — right before building the
    per-request Groq client in query() — and never store or log
    the return value.

    Args:
        encrypted: the bytes from Client.groq_api_key_encrypted.

    Returns:
        The plaintext API key.

    Raises:
        cryptography.fernet.InvalidToken: if GROQ_KEY_ENCRYPTION_SECRET
            has changed since this value was encrypted, or the stored
            bytes are corrupted. Treat this as equivalent to "no key
            set" at the call site — do not surface the raw exception
            to the client.
    """
    ...


# ============================================================
# 2. core/models.py  (add to Client)
# ============================================================

# groq_api_key_encrypted = models.BinaryField(null=True, blank=True, editable=False)
# groq_key_set_at = models.DateTimeField(null=True, blank=True)
#
# Consider a small property for cheap presence checks without decrypting:
#
# @property
# def has_groq_key(self) -> bool:
#     return bool(self.groq_api_key_encrypted)


# ============================================================
# 3. core/exceptions.py  (new APIException, alongside
#    ChatbotUnavailable / IngestionFail / DeletionFail)
# ============================================================

class GroqKeyRequired:
    """
    Raised by ChatView when a free-tier client has no Groq key
    configured. 402 is deliberate — semantically "you must supply
    something (a key) before this request can proceed," distinct
    from 401 (who are you) and 403 (you're not allowed).

    status_code = 402
    default_detail = "This project requires a Groq API key. Add one in your account settings."
    default_code = "groq_key_required"
    """
    ...


# ============================================================
# 4. core/views.py  (new view — GET/PATCH/DELETE)
# ============================================================

class GroqKeyView:
    """
    Manage the authenticated client's BYOK Groq key.

    GET    -> {"is_set": bool, "set_at": datetime|null}
              Never returns the key itself, encrypted or otherwise.
    PATCH  -> body: {"groq_api_key": "gsk_..."}
              Encrypts and stores. Strip whitespace, reject blank.
              Consider a loose format sanity check (e.g. non-empty,
              reasonable length) but NOT a live validation call to
              Groq — that's explicitly deferred.
    DELETE -> clears groq_api_key_encrypted and groq_key_set_at.
              A free-tier client who does this immediately loses
              chat access on next request — that's the intended
              behavior, not a bug to guard against.

    permission_classes = [IsAuthenticated]
    (JWT only — this is a dashboard-only endpoint, no project-key path)
    """
    ...


# ============================================================
# 5. rag/query.py  (modify existing query())
# ============================================================

def query(question, client_id, project_id, groq_api_key: str = None, ...):
    """
    ... existing docstring ...

    Args:
        groq_api_key: optional plaintext key. When provided, build
            a per-request Groq client instead of using the module-level
            singleton. Caller (ChatView) is responsible for decrypting
            just before this call — query() never touches Client model
            or crypto directly, keeping rag/ Django-agnostic.

    Note: when groq_api_key is provided, do NOT fall back to the
    singleton getter — a bug that silently used AthenaChat's own key
    after a BYOK client explicitly configured theirs would be a real
    billing/security issue, not just a logic error.
    """
    ...


# ============================================================
# 6. chatbot/views.py  (ChatView.post — sketch of the new branch)
# ============================================================

"""
Rough shape, not final:

    project = ...  # existing resolution, unchanged
    client = project.client

    groq_key = None
    if client.subscription_plan == 'free':
        if not client.has_groq_key:
            raise GroqKeyRequired()
        groq_key = decrypt_groq_key(client.groq_api_key_encrypted)

    result = query(question, client_id, project_id, groq_api_key=groq_key)

Decrypt happens inline here, right before the call — not earlier,
not cached on the request object.
"""