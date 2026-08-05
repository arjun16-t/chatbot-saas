import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Manages fetching, local draft editing, and saving a project's
 * widget theme config (color styles, bubble position, greeting, logo).
 *
 * Two-state model:
 *   - savedConfig: last confirmed server state (source of truth)
 *   - draftConfig: local edits, starts as a copy of savedConfig,
 *     only persisted to the server on explicit save()
 *
 * @param {string} projectId
 */
export function useProjectConfig(projectId) {
  const { accessToken } = useAuth();

  const [savedConfig, setSavedConfig] = useState(null);
  const [draftConfig, setDraftConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(() => {
    setIsLoading(true);
    setError(null);
    return fetch(`${API_BASE}/api/projects/${projectId}/config/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load chatbot config.');
        return res.json();
      })
      .then((data) => {
        setSavedConfig(data);
        setDraftConfig(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId, accessToken]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  /**
   * Update a single top-level field in the draft (e.g. bubble_position, greeting_message).
   */
  const updateDraftField = useCallback((field, value) => {
    setDraftConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Update a single key inside draftConfig.theme_color (e.g. primary_color).
   */
  const updateDraftThemeColor = useCallback((key, value) => {
    setDraftConfig((prev) => ({
      ...prev,
      theme_color: { ...prev.theme_color, [key]: value },
    }));
  }, []);

  /**
   * Discards local edits, reverting draftConfig back to savedConfig.
   */
  const resetDraft = useCallback(() => {
    setDraftConfig(savedConfig);
  }, [savedConfig]);

  /**
   * Persists draftConfig's non-logo fields to the server via PATCH.
   * On success, savedConfig is updated to match.
   */
  const saveConfig = useCallback(() => {
    setIsSaving(true);
    setError(null);

    const { logo_url, ...payload } = draftConfig;

    return fetch(`${API_BASE}/api/projects/${projectId}/config/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save changes.');
        return res.json();
      })
      .then((data) => {
        setSavedConfig(data);
        setDraftConfig(data);
        return data;
      })
      .catch((err) => {
        setError(err.message);
        throw err;
      })
      .finally(() => {
        setIsSaving(false);
      });
  }, [projectId, accessToken, draftConfig]);

  /**
   * Uploads a new logo file. Separate request from saveConfig since
   * file uploads need multipart/form-data, not JSON — browsers set
   * the correct Content-Type + boundary automatically for FormData,
   * so no Content-Type header is set manually here.
   *
   * @param {File} file
   */
  const uploadLogo = useCallback(
    (file) => {
      setIsUploadingLogo(true);
      setError(null);

      const formData = new FormData();
      formData.append('logo_raw', file);

      return fetch(`${API_BASE}/api/projects/${projectId}/config/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to upload logo.');
          return res.json();
        })
        .then((data) => {
          // logo_url changes server-side; merge it into both states
          // without disturbing any other unsaved draft edits.
          setSavedConfig((prev) => ({ ...prev, logo_url: data.logo_url }));
          setDraftConfig((prev) => ({ ...prev, logo_url: data.logo_url }));
          return data;
        })
        .catch((err) => {
          setError(err.message);
          throw err;
        })
        .finally(() => {
          setIsUploadingLogo(false);
        });
    },
    [projectId, accessToken]
  );

  const hasUnsavedChanges =
    savedConfig && draftConfig && JSON.stringify(savedConfig) !== JSON.stringify(draftConfig);

  return {
    savedConfig,
    draftConfig,
    isLoading,
    isSaving,
    isUploadingLogo,
    error,
    hasUnsavedChanges,
    updateDraftField,
    updateDraftThemeColor,
    resetDraft,
    saveConfig,
    uploadLogo,
    refetch: fetchConfig,
  };
}