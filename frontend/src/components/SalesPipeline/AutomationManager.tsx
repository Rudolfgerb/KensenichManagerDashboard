// import React from 'react';

interface AutomationManagerProps {
  onClose: () => void;
}

export default function AutomationManager({ onClose }: AutomationManagerProps) {
  return (
    <div className="automation-manager">
      <div className="modal-header">
        <h3>Automation Manager</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      <div className="automation-content">
        <p>Sales Automation Rules - Coming Soon</p>
      </div>
    </div>
  );
}
