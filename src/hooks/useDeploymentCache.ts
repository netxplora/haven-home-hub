import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const CURRENT_BUILD_VERSION = "V1.4.0";
const VERSION_KEY = "haven_build_version";

export function useDeploymentCache() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cachedVersion = localStorage.getItem(VERSION_KEY);

    if (cachedVersion !== CURRENT_BUILD_VERSION) {
      console.log(`[CacheBuster] New version detected: ${CURRENT_BUILD_VERSION} (was ${cachedVersion}). Purging outdated caches...`);
      
      try {
        // Clear React Query client cache completely
        queryClient.clear();

        // Selective LocalStorage clearing (do NOT clear supabase auth tokens or core settings)
        const keysToKeep = ["sb-", "theme"]; // keep Supabase auth and theme
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !keysToKeep.some(keep => key.startsWith(keep) || key === keep)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Write the new version key to localStorage
        localStorage.setItem(VERSION_KEY, CURRENT_BUILD_VERSION);

        // Show a non-intrusive notification to the user
        toast({
          title: "System Update Applied",
          description: "Caches have been refreshed to ensure complete feature alignment.",
        });
      } catch (error) {
        console.error("[CacheBuster] Error clearing deployment cache:", error);
      }
    }
  }, [queryClient]);
}
