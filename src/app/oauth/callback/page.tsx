import { OAuthPopupRelay } from "@/components/oauth/oauth-popup-relay";

export default function OAuthCallbackPage() {
  return (
    <OAuthPopupRelay
      description="You can close this window. The connection will continue in the original tab."
      title="OAuth callback received"
    />
  );
}
