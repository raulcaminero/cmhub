import { redirect } from 'next/navigation';

export default function DashboardCatchAllPage() {
  redirect('/dashboard/accounting');
}
