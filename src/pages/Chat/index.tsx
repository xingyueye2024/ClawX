/**
 * Chat Page
 * Embeds OpenClaw's Control UI for chat functionality.
 * The Control UI handles all chat protocol details (sessions, streaming, etc.)
 * and is served by the Gateway at http://127.0.0.1:{port}/
 */
import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGatewayStore } from '@/stores/gateway';

export function Chat() {
  const gatewayStatus = useGatewayStore((state) => state.status);
  const [controlUiUrl, setControlUiUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isGatewayRunning = gatewayStatus.state === 'running';
  
  // Fetch Control UI URL when gateway is running
  useEffect(() => {
    if (!isGatewayRunning) {
      setControlUiUrl(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    window.electron.ipcRenderer.invoke('gateway:getControlUiUrl')
      .then((result: unknown) => {
        const r = result as { success: boolean; url?: string; error?: string };
        if (r.success && r.url) {
          setControlUiUrl(r.url);
        } else {
          setError(r.error || 'Failed to get Control UI URL');
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        setError(String(err));
        setLoading(false);
      });
  }, [isGatewayRunning]);

  // Handle iframe load events
  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const handleIframeError = useCallback(() => {
    setError('Failed to load chat interface');
    setLoading(false);
  }, []);
  
  const handleReload = useCallback(() => {
    setLoading(true);
    setError(null);
    // Force re-mount the iframe by clearing and resetting URL
    const url = controlUiUrl;
    setControlUiUrl(null);
    setTimeout(() => setControlUiUrl(url), 100);
  }, [controlUiUrl]);

  // Auto-hide loading after a timeout (fallback)
  useEffect(() => {
    if (!loading || !controlUiUrl) return;
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading, controlUiUrl]);
  
  // Gateway not running state
  if (!isGatewayRunning) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center text-center p-8">
        <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Gateway Not Running</h2>
        <p className="text-muted-foreground max-w-md">
          The OpenClaw Gateway needs to be running to use chat. 
          It will start automatically, or you can start it from Settings.
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-muted-foreground max-w-md mb-4">{error}</p>
          <Button onClick={handleReload} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}
      
      {/* Embedded Control UI via iframe */}
      {controlUiUrl && (
        <iframe
          src={controlUiUrl}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          className="flex-1 w-full border-0"
          style={{ 
            display: error && !loading ? 'none' : 'block',
            height: '100%',
          }}
          title="ClawX Chat"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      )}
    </div>
  );
}

export default Chat;
