import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "../components/ui/Button";

export default function Forbidden() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <ShieldAlert className="size-10 text-brick" aria-hidden />
      <h1 className="mt-4 font-display text-2xl font-semibold">You don't have access to this page</h1>
      <p className="mt-2 text-sm text-ink-2">Your role doesn't include the permission this area requires. If you think this is a mistake, contact an administrator.</p>
      <ButtonLink to="/app" variant="secondary" className="mt-6">Go to my dashboard</ButtonLink>
    </div>
  );
}
