interface ErrorPopUpProps {
  message: string | null;
  onClose: () => void;
}

export default function ErrorPopUp({ message, onClose }: ErrorPopUpProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm text-center">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-gray-700 mb-4">{message}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
