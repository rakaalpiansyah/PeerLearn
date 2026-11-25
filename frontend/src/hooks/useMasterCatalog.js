import { useEffect, useState } from "react";
import { masterApi } from "../api/client";

const FALLBACK_CATALOG = {
  faculties: [
    {
      id: "10000000-0000-0000-0000-000000000001",
      code: "FST",
      name: "Fakultas Sains dan Teknologi",
      departments: [
        { id: "fst-1", name: "Teknik Informatika", degree_level: "S1" },
        { id: "fst-2", name: "Teknik Elektro", degree_level: "S1" },
        { id: "fst-3", name: "Teknik Lingkungan", degree_level: "S1" },
        { id: "fst-4", name: "Matematika", degree_level: "S1" },
        { id: "fst-5", name: "Fisika", degree_level: "S1" },
        { id: "fst-6", name: "Kimia", degree_level: "S1" },
        { id: "fst-7", name: "Biologi", degree_level: "S1" },
        { id: "fst-8", name: "Agroteknologi", degree_level: "S1" },
      ],
      locations: [],
    },
    {
      id: "10000000-0000-0000-0000-000000000002",
      code: "UMUM",
      name: "Lintas Fakultas / Umum",
      departments: [],
      locations: [],
    },
  ],
  shared_locations: [],
};

let cachedCatalog = null;

export function useMasterCatalog(enabled = true) {
  const [catalog, setCatalog] = useState(cachedCatalog || FALLBACK_CATALOG);

  useEffect(() => {
    if (!enabled || cachedCatalog) return;
    let cancelled = false;

    Promise.resolve(masterApi?.getFaculties?.())
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res?.data?.faculties?.length > 0) {
          cachedCatalog = res.data;
          setCatalog(res.data);
        }
      })
      .catch(() => {
        // Keep fallback catalog silently
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return catalog;
}
