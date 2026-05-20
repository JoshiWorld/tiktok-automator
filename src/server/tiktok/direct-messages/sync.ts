/**
 * Spätere Anbindung an TikTok Data Portability / genehmigte Messaging-Produkte.
 * MVP liefert eine klare Rückmeldung; aufrufen darf bereits den gültigen Access Token prüfen.
 */
export async function requestDmSyncPlaceholder(): Promise<{
  status: "not_implemented";
  detail: string;
}> {
  return {
    status: "not_implemented",
    detail:
      "Es ist noch kein offizieller DM-Import aktiv (z. B. TikTok Data Portability). Nach Freigaben im TikTok Portal kann hier eine Export-/Sync-Anfrage implementiert werden.",
  };
}
