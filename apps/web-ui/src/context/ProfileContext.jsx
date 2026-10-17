import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWebSocket } from "./WebSocketContext";
import { runtime } from "../application/services";

const Context = createContext(null);
const STORAGE_KEY = "homeSystem_profileId";
function remember(id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Selection still works without device storage. */
  }
}
function remembered() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function syncGeneration(value) {
  if (!value) return false;
  try {
    const previous = localStorage.getItem("homeSystem_dataGeneration");
    const changed = !!previous && previous !== value;
    if (changed) {
      runtime.resetUserData();
      remember(null);
    }
    localStorage.setItem("homeSystem_dataGeneration", value);
    return changed;
  } catch {
    return false;
  }
}

/** Server-owned household profiles. This selector deliberately does not authenticate people. */
export function ProfileProvider({ children }) {
  const { connected, request, serverUrl } = useWebSocket();
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const epoch = useRef(0);
  const invalidate = useCallback(() => ++epoch.current, []);
  const busy = useRef(false);
  const fetchProfiles = useCallback(async () => {
    if (!connected) return;
    const generation = epoch.current;
    const result = await request("Profile/GetAll");
    if (generation !== epoch.current) return;
    const values = result.data?.profiles || [];
    const reset = syncGeneration(result.data?.dataGeneration);
    setProfiles(values);
    setCurrentProfile((previous) =>
      !reset && previous
        ? values.find((profile) => profile.id === previous.id) || null
        : null,
    );
    return values;
  }, [connected, request]);

  useEffect(() => {
    const generation = invalidate();
    const task = setTimeout(async () => {
      setCurrentProfile(null);
      if (!connected) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await request("Profile/GetAll");
        if (generation !== epoch.current) return;
        const values = result.data?.profiles || [];
        syncGeneration(result.data?.dataGeneration);
        setProfiles(values);
        const id = remembered();
        if (values.some((profile) => profile.id === id)) {
          const selected = await request("Profile/Login", { profileId: id });
          if (generation === epoch.current)
            setCurrentProfile(selected.data.profile);
        } else if (id) remember(null);
      } catch {
        if (generation === epoch.current)
          setError(
            "Could not load profiles from the server. Reconnect to try again.",
          );
      } finally {
        if (generation === epoch.current) setIsLoading(false);
      }
    }, 0);
    return () => {
      clearTimeout(task);
      invalidate();
    };
  }, [connected, serverUrl, request, invalidate]);

  const select = useCallback(
    async (type, data) => {
      if (busy.current)
        return {
          success: false,
          error: "A profile change is already in progress.",
        };
      busy.current = true;
      const generation = epoch.current;
      setError(null);
      try {
        const result = await request(type, data);
        if (generation !== epoch.current)
          return {
            success: false,
            error: "The connection changed. Try again.",
          };
        const profile = result.data?.profile;
        if (!profile)
          throw new Error("The server did not return a saved profile.");
        setCurrentProfile(profile);
        remember(profile.id);
        setProfiles((previous) => [
          ...previous.filter((item) => item.id !== profile.id),
          profile,
        ]);
        return { success: true, profile };
      } catch (failure) {
        if (generation === epoch.current) setError(failure.message);
        return { success: false, error: failure.message };
      } finally {
        busy.current = false;
      }
    },
    [request],
  );
  const login = useCallback(
    (id) => select("Profile/Login", { profileId: id }),
    [select],
  );
  const createProfile = useCallback(
    (name) => select("Profile/Create", { name }),
    [select],
  );
  const logout = useCallback(() => {
    epoch.current++;
    setCurrentProfile(null);
    remember(null);
    setError(null);
  }, []);
  const deleteAllUserData = useCallback(async () => {
    const result = await request("System/DeleteAllUserData", {
      confirmation: "DELETE ALL USER DATA",
    });
    syncGeneration(result.data?.dataGeneration);
    const cleared = runtime.resetUserData();
    try {
      sessionStorage.removeItem("hs3-home-active-page");
    } catch {
      /* In-memory selection is reset below. */
    }
    setProfiles([]);
    logout();
    if (!cleared)
      setError(
        "Server data was deleted, but this browser could not clear its saved data. Clear site data in browser settings.",
      );
    return { localDataCleared: cleared };
  }, [request, logout]);
  const updateProfile = useCallback(
    async (profileId, updates) => {
      try {
        await request("Profile/Update", { profileId, name: updates.name });
        await fetchProfiles();
        return { success: true };
      } catch (failure) {
        return { success: false, error: failure.message };
      }
    },
    [request, fetchProfiles],
  );
  const deleteProfile = useCallback(
    async (profileId) => {
      try {
        await request("Profile/Delete", { profileId });
        if (currentProfile?.id === profileId) logout();
        await fetchProfiles();
        return { success: true };
      } catch (failure) {
        return { success: false, error: failure.message };
      }
    },
    [request, currentProfile?.id, logout, fetchProfiles],
  );
  return (
    <Context.Provider
      value={{
        profiles,
        currentProfile,
        isLoading,
        error,
        isLoggedIn: !!currentProfile,
        storedProfileId: remembered(),
        login,
        logout,
        createProfile,
        updateProfile,
        deleteProfile,
        deleteAllUserData,
        fetchProfiles,
        clearError: () => setError(null),
      }}
    >
      {children}
    </Context.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  const value = useContext(Context);
  if (!value) throw new Error("useProfile requires ProfileProvider");
  return value;
}
export default Context;
