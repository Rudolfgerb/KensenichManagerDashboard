// import React from 'react';

interface TemplateManagerProps {
  onClose: () => void;
}

export default function TemplateManager({ onClose }: TemplateManagerProps) {
  return (
    <div className="template-manager">
      <div className="modal-header">
        <h3>Template Manager</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      <div className="template-content">
        <p>Email and Message Templates - Coming Soon</p>
      </div>
    </div>
  );
}
