import { MonitoringHubPage } from "./hub-page";

export const dynamic = "force-dynamic";

export default function SupervisionPage(props: { searchParams: Parameters<typeof MonitoringHubPage>[0]["searchParams"] }) {
  return <MonitoringHubPage tab="apercu" searchParams={props.searchParams} />;
}
