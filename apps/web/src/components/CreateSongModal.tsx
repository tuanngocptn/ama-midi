import React from 'react';

export function CreateSongModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-card p-6"
      >
        <h2 className="text-lg font-semibold text-text-primary">
          Create New Song
        </h2>

        <label className="mt-4 block text-sm text-text-secondary">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome MIDI"
            autoFocus
            required
            maxLength={200}
            className="mt-1 block w-full rounded-md border border-border-subtle bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of this composition"
            rows={3}
            maxLength={1000}
            className="mt-1 block w-full resize-none rounded-md border border-border-subtle bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue"
          />
        </label>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={!title.trim()} className="btn-primary">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
