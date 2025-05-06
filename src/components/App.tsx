import React, { useState } from 'react';
import { TreeEditor } from './TreeEditor';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { CatalogManager } from './CatalogManager';

const App: React.FC = () => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    showConfirmButton: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    showConfirmButton: true
  });

  return (
    <div>
      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmation.onConfirm}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
        showConfirmButton={deleteConfirmation.showConfirmButton}
      />
    </div>
  );
};

export default App; 