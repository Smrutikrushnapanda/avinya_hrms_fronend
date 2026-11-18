import NetworkErrorView from "@/components/network-error-view";

export default function NotFound() {
  return (
    <NetworkErrorView
      statusCode="404"
      title="404 - Page Not Found"
      description="We couldn't locate this page or an active network interruption prevented the resource from loading. Verify your connection or retry below."
    />
  );
}
