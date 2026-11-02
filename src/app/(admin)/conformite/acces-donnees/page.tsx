import { ComplianceHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default function Page(props: { searchParams: Parameters<typeof ComplianceHubPage>[0]["searchParams"] }) {
  return <ComplianceHubPage tab="acces-donnees" searchParams={props.searchParams} />;
}
