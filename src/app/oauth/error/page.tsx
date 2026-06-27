import { OAuthPopupRelay } from "@/components/oauth/oauth-popup-relay";

export default function OAuthErrorPage() {
  return (
    <OAuthPopupRelay
      title="OAuth error"
      description="The OAuth flow could not be completed. You can close this window and try again."
    />
  );
}
