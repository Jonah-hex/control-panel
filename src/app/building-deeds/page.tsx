import BuildingDeedsPanel from '../../components/BuildingDeedsPanel';

export default function BuildingDeedsPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">إدارة صكوك المبنى</h1>
      <BuildingDeedsPanel />
    </main>
  );
}
