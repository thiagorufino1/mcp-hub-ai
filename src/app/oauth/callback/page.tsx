import { OAuthPopupRelay } from "@/components/oauth/oauth-popup-relay";

export default function OAuthCallbackPage() {
  return (
    <OAuthPopupRelay
      title="OAuth callback received"
      description="You can close this window. The connection will continue in the original tab."
    />
  );
}
