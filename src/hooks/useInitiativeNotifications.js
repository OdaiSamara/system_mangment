import { useCallback, useEffect, useRef, useState } from "react";
import { getApiError } from "../api/http.js";
import { initiativeService } from "../services/initiativeService.js";

const POLL_INTERVAL = 30_000;

async function loadInitiatives(user) {
  const params = {
    page: 1,
    per_page: 100,
  };
  const firstPage = await initiativeService.list(params, user);
  const initiatives = [...firstPage.items];
  const lastPage = Number(firstPage.meta?.last_page) || 1;

  for (let page = 2; page <= lastPage; page += 1) {
    const result = await initiativeService.list({ ...params, page }, user);
    initiatives.push(...result.items);
  }

  return initiatives;
}

function createNotification(initiative, type) {
  const initiativeName = initiative.title ?? initiative.name ?? "مبادرة";
  const isSubmission = type === "submitted";
  const message = isSubmission
    ? `أرسل منفذ المبادرة «${initiativeName}» للمراجعة.`
    : `قام المدير ${type === "approved" ? "بالموافقة على" : "برفض"} مبادرة «${initiativeName}».`;

  return {
    id: `${initiative.id}:${type}:${initiative.updated_at ?? initiative.updatedAt ?? ""}`,
    initiativeId: initiative.id,
    message,
    createdAt: Date.now(),
    read: false,
  };
}

function getSnapshot(initiatives, user) {
  if (user.role === "manager") {
    return new Map(initiatives.map((initiative) => [
      String(initiative.id),
      initiative.status === "wait_manager" ? "submitted" : "under_study",
    ]));
  }
  return new Map(initiatives.map((initiative) => [String(initiative.id), initiative.status]));
}

function readSavedState(storageKey) {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return null;

  const parsed = JSON.parse(saved);
  return {
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    snapshot: Array.isArray(parsed.snapshot) ? new Map(parsed.snapshot) : null,
  };
}

export function useInitiativeNotifications(user) {
  const userId = user?.id;
  const userRole = user?.role;
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const previousSnapshot = useRef(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const storageKey = userId ? `ain-alzaman-notifications:${userId}:${userRole}` : null;

  const refresh = useCallback(async () => {
    if (!userId || !["manager", "user", "accountant"].includes(userRole) || inFlight.current) return;

    inFlight.current = true;
    const requestGeneration = generation.current;
    try {
      const currentUser = { id: userId, role: userRole };
      const initiatives = await loadInitiatives(currentUser);
      if (requestGeneration !== generation.current) return;
      const newNotifications = [];
      let snapshot;

      if (userRole === "manager") {
        const candidates = initiatives.filter((initiative) => initiative.status === "wait_manager");
        if (requestGeneration !== generation.current) return;
        snapshot = getSnapshot(candidates, currentUser);

        for (const initiative of candidates) {
          const key = String(initiative.id);
          if (
            snapshot.get(key) === "submitted"
            && previousSnapshot.current?.get(key) !== "submitted"
          ) {
            newNotifications.push(createNotification(initiative, "submitted"));
          }
        }
      } else {
        snapshot = getSnapshot(initiatives, currentUser);
        for (const initiative of initiatives) {
          const key = String(initiative.id);
          const type = initiative.status === "manager_approved"
            ? "approved"
            : initiative.status === "manager_rejected"
              ? "rejected"
              : null;
          if (type && previousSnapshot.current?.get(key) !== initiative.status) {
            newNotifications.push(createNotification(initiative, type));
          }
        }
      }

      previousSnapshot.current = snapshot;
      if (newNotifications.length && storageKey) {
        setNotifications((current) => {
          const existingIds = new Set(current.map((notification) => notification.id));
          return [
            ...newNotifications.filter((notification) => !existingIds.has(notification.id)),
            ...current,
          ];
        });
      }
      setError("");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      inFlight.current = false;
    }
  }, [userId, userRole, storageKey]);

  useEffect(() => {
    generation.current += 1;
    previousSnapshot.current = null;
    setNotifications([]);
    setError("");
    setStorageReady(false);
    if (storageKey) {
      try {
        const savedState = readSavedState(storageKey);
        setNotifications(savedState?.notifications ?? []);
        previousSnapshot.current = savedState?.snapshot ?? null;
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    setStorageReady(true);
    refresh();
    const intervalId = window.setInterval(refresh, POLL_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, [refresh, storageKey]);

  useEffect(() => {
    if (!storageReady || !storageKey || !previousSnapshot.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        notifications,
        snapshot: [...previousSnapshot.current],
      }));
    } catch (storageError) {
      setError(getApiError(storageError));
    }
  }, [notifications, storageKey, storageReady]);

  const markAllAsRead = useCallback(() => {
    setNotifications((current) => {
      return current.map((notification) => ({ ...notification, read: true }));
    });
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    error,
    refresh,
    markAllAsRead,
  };
}
