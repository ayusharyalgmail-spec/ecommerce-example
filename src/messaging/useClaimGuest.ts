import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getGuest, setGuest } from "./guest";
import { msgApi } from "./api";

let claiming = false;

/** After sign-in, folds a guest's conversation and settings into the account and retires the guest session. Runs on the Messages page. */
export function useClaimGuest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    const g = getGuest();
    if (!user || !g || claiming) return;
    claiming = true;
    msgApi.claimGuest(g.token)
      .then(() => { setGuest(null); void qc.invalidateQueries({ queryKey: ["msg"] }); })
      .catch(() => { /* keep the secret and try again on the next visit */ })
      .finally(() => { claiming = false; });
  }, [user, qc]);
}
