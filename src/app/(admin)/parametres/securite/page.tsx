import { SettingsHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default function Page(props: { searchParams: Parameters<typeof SettingsHubPage>[0]["searchParams"] }) {
  return <SettingsHubPage tab="securite" searchParams={props.searchParams} />;
}
