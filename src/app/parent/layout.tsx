import { requireParent } from "@/lib/auth";
import { ParentNav } from "./parent-nav";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireParent();

  return (
    <div>
      <ParentNav />
      {children}
    </div>
  );
}
