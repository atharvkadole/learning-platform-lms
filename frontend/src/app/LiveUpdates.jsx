import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/useAuth.js";
import { invalidateLearningQueries, queryKeys } from "../lib/queryKeys.js";

export function LiveUpdates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return undefined;

    const eventsUrl = `${api.defaults.baseURL}/events`;
    const events = new EventSource(eventsUrl, { withCredentials: true });

    events.addEventListener("platform", (message) => {
      try {
        const event = JSON.parse(message.data);
        if (event.scope === "learning-content") {
          invalidateLearningQueries(queryClient);
        }
        if (event.scope === "students") {
          queryClient.invalidateQueries({ queryKey: queryKeys.students });
          queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard });
        }
      } catch {
        invalidateLearningQueries(queryClient);
      }
    });

    return () => events.close();
  }, [queryClient, user]);

  return null;
}

