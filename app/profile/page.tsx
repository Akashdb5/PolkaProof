import dynamic from "next/dynamic";

const ProfileManager = dynamic(
  () =>
    import("@/components/ProfileManager").then((mod) => mod.ProfileManager),
  { ssr: false, loading: () => <p className="text-slate-400">Loading...</p> }
);

export const metadata = {
  title: "Profile | PolkaProof"
};

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <header className="card space-y-2 p-6">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Profiles
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Customize your PolkaProof identity
        </h1>
        <p className="text-sm text-slate-400">
          Update your display name, avatar, and bio with a single signed
          message. All changes are stored in Supabase and reflected across
          events.
        </p>
      </header>
      <ProfileManager />
    </div>
  );
}
