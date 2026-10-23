import { requirePermission } from "@/app/actions/admin";
import { getReferralsAdminData } from "./actions";
import { ReferralsClient } from "./ReferralsClient";

export const metadata = {
  title: "Referrals | Schoolari Admin",
};

export default async function AdminReferralsPage() {
  await requirePermission("manage_users");
  const data = await getReferralsAdminData();

  return <ReferralsClient initialData={data} />;
}
