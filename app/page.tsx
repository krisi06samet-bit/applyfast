async function handleLogout() {
  setAccountLoading(true);
  setError("");

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "Could not sign out."
      );
    }

    try {
      window.localStorage.removeItem("applyfast_last_unlocked");
      window.sessionStorage.removeItem("applyfast_locked_preview");
      window.sessionStorage.removeItem("applyfast_draft");
    } catch {
      // Ignore storage errors.
    }

    setAccountEmail("");
    setAccountCredits(null);

    setReturningOpen(false);
    setReturningEmail("");
    setReturningMessage("");

    setResult(null);

    setPaymentNotice("");
    setPaymentMessage("");
    setPaymentEmail("");

    setLockedGenerationId("");
    setLockedPreviewName("");
    setLockedPreviewEmail("");
    setLockedMatchScore(null);

    setCvText("");
    setJobDescription("");
    setAboutMe("");
    setFullName("");
    setEmail("");
    setPhone("");

    window.location.replace(
      `/?logged_out=${Date.now()}`
    );
  } catch (err) {
    console.error("ApplyFast logout failed:", err);

    const message =
      err instanceof Error
        ? err.message
        : "Could not sign out.";

    setError(`Logout failed: ${message}`);

    window.alert(`Logout failed: ${message}`);

    setAccountLoading(false);
  }
}
