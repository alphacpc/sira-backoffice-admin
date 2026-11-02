import { ComplianceHubPage } from "./hub-page";

export const dynamic = "force-dynamic";

export default function CompliancePage(props: { searchParams: Parameters<typeof ComplianceHubPage>[0]["searchParams"] }) {
  return <ComplianceHubPage tab="apercu" searchParams={props.searchParams} />;
}
