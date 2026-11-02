import { MonitoringHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default function Page(props: { searchParams: Parameters<typeof MonitoringHubPage>[0]["searchParams"] }) {
  return <MonitoringHubPage tab="services" searchParams={props.searchParams} />;
}
