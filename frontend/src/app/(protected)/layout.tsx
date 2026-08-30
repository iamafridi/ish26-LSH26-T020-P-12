import type { ReactNode } from "react";

import { ProtectedLayout } from "@/modules/auth/components/protected-layout";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
