import Image from 'next/image';

export default function AppFeatures() {
  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">What and Why?</h2>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-3">AI-Powered PR Organization</h3>
        <p className="mb-4">
          It's getting easier to generate code and to review it with AI.
          </p>
        <p className="mb-4">
          So how should you focus your attention and make the most of those AI reviews? <b>pr-focus</b>
        </p>
        <p className="mb-4 italic">
          Pr-focus uses a github app for fine-grained permissions. It stores data in local storage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col">
          <h4 className="text-lg font-medium mb-2">AI-Focused Changes</h4>
          <p className="mb-3">
            The AI Analysis organizes changes by what they do. Notice only 32 lines of streaming.py are shown under this
            change description.
          </p>
          <div className="relative w-full h-80 border border-gray-200 rounded-lg overflow-hidden">
            <Image
              src="/screenshots/ai-changes.png"
              alt="AI-focused changes view showing 32 important lines"
              fill
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <h4 className="text-lg font-medium mb-2">Complete Changes View</h4>
          <p className="mb-3">
            Under the Full File Changes view you can see all 121 lines of changes in streaming.py.
          </p>
          <div className="relative w-full h-80 border border-gray-200 rounded-lg overflow-hidden">
            <Image
              src="/screenshots/all-changes.png"
              alt="Complete changes view showing all 121 lines"
              fill
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
